import hashlib
import hmac
import json
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.audit.services import record_audit_log
from apps.common.enums import PaymentTransactionStatus


class ChapaPaymentError(Exception):
    def __init__(self, message, *, status_code=None):
        super().__init__(message)
        self.status_code = status_code


class ChapaConfigurationError(ChapaPaymentError):
    pass


class ChapaVerificationError(ChapaPaymentError):
    pass


class ChapaPaymentService:
    SUPPORTED_HOSTED_CURRENCIES = {"ETB", "USD"}
    CUSTOMIZATION_TITLE_MAX_LENGTH = 16
    PROVIDER_STATUS_MAP = {
        "success": PaymentTransactionStatus.SUCCEEDED,
        "pending": PaymentTransactionStatus.PENDING,
        "failed": PaymentTransactionStatus.FAILED,
        "cancelled": PaymentTransactionStatus.CANCELLED,
        "refunded": PaymentTransactionStatus.REFUNDED,
        "reversed": PaymentTransactionStatus.REVERSED,
    }

    @staticmethod
    def configuration():
        return {
            "environment": settings.CHAPA_ENV,
            "base_url": settings.CHAPA_BASE_URL,
            "has_secret_key": bool(settings.CHAPA_SECRET_KEY),
            "has_public_key": bool(settings.CHAPA_PUBLIC_KEY),
            "has_webhook_secret": bool(settings.CHAPA_WEBHOOK_SECRET),
            "has_encryption_key": bool(settings.CHAPA_ENCRYPTION_KEY),
        }

    def initiate_payment(
        self,
        *,
        amount,
        currency,
        tx_ref,
        user,
        callback_url,
        return_url,
        metadata,
        phone_number="",
    ):
        currency = str(currency).upper()
        if currency not in self.SUPPORTED_HOSTED_CURRENCIES:
            raise ChapaPaymentError(
                f"Currency {currency} is not supported for hosted checkout."
            )

        payload = {
            "amount": self._format_amount(amount),
            "currency": currency,
            "email": user.email,
            "tx_ref": tx_ref,
            "callback_url": callback_url,
            "return_url": return_url,
            "customization": {
                "title": self._build_customization_title(metadata),
                "description": metadata.get("description", ""),
            },
            "meta": {
                "course_program_id": metadata.get("course_program_id"),
                "payment_reason": metadata.get("payment_reason", "Course enrollment"),
            },
        }
        first_name, last_name = self._split_name(user.full_name)
        if first_name:
            payload["first_name"] = first_name
        if last_name:
            payload["last_name"] = last_name
        if phone_number:
            payload["phone_number"] = phone_number

        response = self._request_json(
            "POST",
            "/v1/transaction/initialize",
            payload=payload,
        )
        data = response.get("data") or {}
        checkout_url = data.get("checkout_url")
        if response.get("status") != "success" or not checkout_url:
            raise ChapaPaymentError(
                self._safe_provider_message(response, "Unable to initialize payment.")
            )
        return {
            "status": PaymentTransactionStatus.PENDING,
            "tx_ref": tx_ref,
            "checkout_url": checkout_url,
        }

    def verify_payment(self, tx_ref):
        return self._request_json(
            "GET",
            f"/v1/transaction/verify/{quote(tx_ref, safe='')}",
        )

    def cancel_transaction(self, tx_ref):
        return self._request_json(
            "PUT",
            f"/v1/transaction/cancel/{quote(tx_ref, safe='')}",
        )

    def reconcile_transaction(self, payment_transaction, *, actor=None, source="system"):
        previous_status = payment_transaction.status
        response = self.verify_payment(payment_transaction.tx_ref)
        data = response.get("data") or {}
        payment_transaction.last_verified_at = timezone.now()

        mismatches = self._verification_mismatches(payment_transaction, data)
        if response.get("status") != "success" or mismatches:
            payment_transaction.failure_reason = (
                "verification_mismatch"
                if mismatches
                else self._safe_provider_message(response, "Payment verification failed.")
            )
            payment_transaction.save(
                update_fields=["last_verified_at", "failure_reason", "updated_at"]
            )
            record_audit_log(
                actor=actor,
                action="payment.transaction.verification_failed",
                target_type="payment_transaction",
                target_id=payment_transaction.id,
                summary=f"Payment verification failed for {payment_transaction.tx_ref}.",
                metadata={
                    "tx_ref": payment_transaction.tx_ref,
                    "source": source,
                    "failure_reason": payment_transaction.failure_reason,
                    "provider_status": str(data.get("status") or "").lower(),
                    "had_mismatch": bool(mismatches),
                },
            )
            if mismatches:
                raise ChapaVerificationError(
                    "Chapa verification did not match the expected transaction."
                )
            return payment_transaction

        provider_status = str(data.get("status", "pending")).lower()
        payment_transaction.status = self.PROVIDER_STATUS_MAP.get(
            provider_status,
            PaymentTransactionStatus.PENDING,
        )
        payment_transaction.provider_reference = str(data.get("reference") or "")
        payment_transaction.provider_method = str(data.get("method") or "")
        payment_transaction.provider_mode = str(data.get("mode") or "")
        payment_transaction.provider_charge = self._optional_decimal(data.get("charge"))
        payment_transaction.failure_reason = ""
        payment_transaction.verification_data = self._safe_verification_data(data)
        if payment_transaction.status == PaymentTransactionStatus.SUCCEEDED:
            payment_transaction.verified_at = payment_transaction.verified_at or timezone.now()
        payment_transaction.save()
        if (
            previous_status != payment_transaction.status
            or payment_transaction.status == PaymentTransactionStatus.SUCCEEDED
        ):
            record_audit_log(
                actor=actor,
                action="payment.transaction.reconciled",
                target_type="payment_transaction",
                target_id=payment_transaction.id,
                summary=f"Payment transaction {payment_transaction.tx_ref} reconciled.",
                metadata={
                    "tx_ref": payment_transaction.tx_ref,
                    "source": source,
                    "previous_status": previous_status,
                    "status": payment_transaction.status,
                    "provider_reference": payment_transaction.provider_reference,
                    "provider_method": payment_transaction.provider_method,
                },
            )
        if (
            payment_transaction.status == PaymentTransactionStatus.SUCCEEDED
            and previous_status != PaymentTransactionStatus.SUCCEEDED
        ):
            self._activate_paid_enrollment(payment_transaction)
        return payment_transaction

    @staticmethod
    def verify_webhook_signature(payload, signature):
        if not settings.CHAPA_WEBHOOK_SECRET or not signature:
            return False
        payload_bytes = payload if isinstance(payload, bytes) else str(payload).encode("utf-8")
        expected = hmac.new(
            settings.CHAPA_WEBHOOK_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def process_webhook_event(self, event_type, payload):
        from apps.payments.models import PaymentTransaction, PaymentWebhookEvent

        tx_ref = str(payload.get("tx_ref") or payload.get("trx_ref") or "")
        provider_reference = str(
            payload.get("reference") or payload.get("chapa_reference") or ""
        )
        event_key = hashlib.sha256(
            f"{event_type}|{tx_ref}|{provider_reference}".encode("utf-8")
        ).hexdigest()

        try:
            webhook_event, created = PaymentWebhookEvent.objects.get_or_create(
                event_key=event_key,
                defaults={
                    "event_type": event_type,
                    "tx_ref": tx_ref,
                    "provider_reference": provider_reference,
                },
            )
        except IntegrityError:
            webhook_event = PaymentWebhookEvent.objects.get(event_key=event_key)
            created = False

        if not created and webhook_event.processed:
            return None
        if not tx_ref:
            return None

        payment_transaction = PaymentTransaction.objects.filter(tx_ref=tx_ref).first()
        if payment_transaction is None:
            return None

        with transaction.atomic():
            payment_transaction = PaymentTransaction.objects.select_for_update().get(
                pk=payment_transaction.pk
            )
            self.reconcile_transaction(payment_transaction, source="webhook")
            webhook_event.processed = True
            webhook_event.processed_at = timezone.now()
            webhook_event.save(update_fields=["processed", "processed_at"])
        record_audit_log(
            actor=None,
            action="payment.webhook.processed",
            target_type="payment_webhook_event",
            target_id=webhook_event.id,
            summary=f"Processed payment webhook {event_type} for {tx_ref}.",
            metadata={
                "event_type": event_type,
                "tx_ref": tx_ref,
                "provider_reference": provider_reference,
            },
        )
        return payment_transaction

    def _request_json(self, method, path, *, payload=None):
        if not settings.CHAPA_SECRET_KEY:
            raise ChapaConfigurationError("Chapa is not configured.")

        body = None
        if payload is not None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        request = Request(
            f"{settings.CHAPA_BASE_URL.rstrip('/')}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=settings.CHAPA_HTTP_TIMEOUT_SECONDS) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise ChapaPaymentError(
                self._extract_error_message(response_body),
                status_code=exc.code,
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise ChapaPaymentError(
                "The payment provider is temporarily unavailable."
            ) from exc

        try:
            return json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise ChapaPaymentError(
                "The payment provider returned an invalid response."
            ) from exc

    @staticmethod
    def _format_amount(amount):
        try:
            return f"{Decimal(str(amount)):.2f}"
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ChapaPaymentError("Payment amount is invalid.") from exc

    @staticmethod
    def _optional_decimal(value):
        if value in (None, ""):
            return None
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None

    @staticmethod
    def _split_name(full_name):
        parts = str(full_name or "").strip().split(maxsplit=1)
        if not parts:
            return "", ""
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[1]

    @classmethod
    def _build_customization_title(cls, metadata):
        candidate = str((metadata or {}).get("title") or "").strip()
        if candidate:
            return candidate[: cls.CUSTOMIZATION_TITLE_MAX_LENGTH]
        return "SkillVerse"

    @staticmethod
    def _activate_paid_enrollment(payment_transaction):
        if payment_transaction.course_program.is_free:
            return None
        from apps.courses.services import activate_paid_enrollment

        return activate_paid_enrollment(payment_transaction)

    @staticmethod
    def _safe_provider_message(response, default):
        message = response.get("message") if isinstance(response, dict) else None
        return str(message)[:255] if message else default

    @staticmethod
    def _extract_error_message(response_body):
        try:
            response = json.loads(response_body)
        except json.JSONDecodeError:
            return "The payment provider rejected the request."
        return ChapaPaymentService._safe_provider_message(
            response,
            "The payment provider rejected the request.",
        )

    @staticmethod
    def _safe_verification_data(data):
        allowed_fields = (
            "status",
            "amount",
            "currency",
            "charge",
            "mode",
            "method",
            "type",
            "reference",
            "tx_ref",
            "created_at",
            "updated_at",
        )
        return {field: data.get(field) for field in allowed_fields if field in data}

    @staticmethod
    def _verification_mismatches(payment_transaction, data):
        mismatches = []
        if str(data.get("tx_ref") or "") != payment_transaction.tx_ref:
            mismatches.append("tx_ref")

        try:
            provider_amount = Decimal(str(data.get("amount")))
        except (InvalidOperation, TypeError, ValueError):
            provider_amount = None
        if provider_amount != payment_transaction.amount:
            mismatches.append("amount")

        if str(data.get("currency") or "").upper() != payment_transaction.currency:
            mismatches.append("currency")

        provider_mode = str(data.get("mode") or "").lower()
        expected_mode = str(settings.CHAPA_ENV).lower()
        if provider_mode and provider_mode != expected_mode:
            mismatches.append("mode")
        return mismatches
