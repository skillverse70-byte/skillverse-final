from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import FinancialAccountStatus
from apps.common.trust import (
    can_organization_create_paid_course,
    get_paid_course_enrollment_gate,
    is_financial_account_ready,
)
from apps.payments.models import FinancialAccount, PaymentTransaction


class FinancialAccountSerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    organization_verification_status = serializers.CharField(
        source="organization.verification_status",
        read_only=True,
    )
    is_ready = serializers.SerializerMethodField()
    can_publish_paid_courses = serializers.SerializerMethodField()
    can_accept_paid_enrollments = serializers.SerializerMethodField()
    enrollment_gate_label = serializers.SerializerMethodField()
    enrollment_gate_reason = serializers.SerializerMethodField()
    has_submission_details = serializers.SerializerMethodField()

    class Meta:
        model = FinancialAccount
        fields = (
            "id",
            "organization_id",
            "organization_verification_status",
            "provider",
            "status",
            "business_name",
            "account_holder_name",
            "bank_name",
            "bank_code",
            "account_number",
            "account_number_last4",
            "mobile_money_number",
            "setup_notes",
            "provider_account_reference",
            "restricted_reason",
            "review_notes",
            "reviewed_by",
            "reviewed_at",
            "submitted_at",
            "verified_at",
            "created_at",
            "updated_at",
            "is_ready",
            "can_publish_paid_courses",
            "can_accept_paid_enrollments",
            "enrollment_gate_label",
            "enrollment_gate_reason",
            "has_submission_details",
        )
        read_only_fields = (
            "id",
            "organization_id",
            "organization_verification_status",
            "provider",
            "status",
            "account_number_last4",
            "provider_account_reference",
            "restricted_reason",
            "review_notes",
            "reviewed_by",
            "reviewed_at",
            "submitted_at",
            "verified_at",
            "created_at",
            "updated_at",
            "is_ready",
            "can_publish_paid_courses",
            "can_accept_paid_enrollments",
            "enrollment_gate_label",
            "enrollment_gate_reason",
            "has_submission_details",
        )

    def validate_account_number(self, value):
        digits = "".join(character for character in value if character.isdigit())
        if value and len(digits) < 4:
            raise serializers.ValidationError(
                "Account number must include at least 4 digits."
            )
        return digits

    def validate(self, attrs):
        attrs = super().validate(attrs)
        account_number = attrs.pop("account_number", None)
        if account_number:
            attrs["account_number_last4"] = account_number[-4:]

        for field in (
            "business_name",
            "account_holder_name",
            "bank_name",
            "bank_code",
            "mobile_money_number",
        ):
            if field in attrs:
                attrs[field] = attrs[field].strip()

        if "setup_notes" in attrs:
            attrs["setup_notes"] = attrs["setup_notes"].strip()

        return attrs

    def update(self, instance, validated_data):
        sensitive_fields = {
            "business_name",
            "account_holder_name",
            "bank_name",
            "bank_code",
            "account_number_last4",
            "mobile_money_number",
        }
        payout_details_changed = bool(sensitive_fields.intersection(validated_data))

        for field, value in validated_data.items():
            setattr(instance, field, value)

        has_details = self._has_submission_details_from_values(
            business_name=instance.business_name,
            account_holder_name=instance.account_holder_name,
            bank_name=instance.bank_name,
            bank_code=instance.bank_code,
            account_number_last4=instance.account_number_last4,
            mobile_money_number=instance.mobile_money_number,
        )

        if payout_details_changed or instance.status in (
            FinancialAccountStatus.NOT_STARTED,
            FinancialAccountStatus.PENDING,
        ):
            instance.status = (
                FinancialAccountStatus.PENDING
                if has_details
                else FinancialAccountStatus.NOT_STARTED
            )

        if payout_details_changed:
            instance.verified_at = None
            instance.reviewed_by = None
            instance.reviewed_at = None
            instance.review_notes = ""
            instance.restricted_reason = ""

        if has_details and instance.submitted_at is None:
            instance.submitted_at = timezone.now()
        if not has_details:
            instance.submitted_at = None

        instance.save()
        return instance

    @extend_schema_field(serializers.BooleanField())
    def get_is_ready(self, obj):
        return is_financial_account_ready(obj)

    @extend_schema_field(serializers.BooleanField())
    def get_can_publish_paid_courses(self, obj):
        return can_organization_create_paid_course(obj.organization)

    @extend_schema_field(serializers.BooleanField())
    def get_can_accept_paid_enrollments(self, obj):
        gate = get_paid_course_enrollment_gate(obj.organization, obj)
        return gate["can_enroll"]

    @extend_schema_field(serializers.CharField())
    def get_enrollment_gate_label(self, obj):
        gate = get_paid_course_enrollment_gate(obj.organization, obj)
        return gate["label"]

    @extend_schema_field(serializers.CharField())
    def get_enrollment_gate_reason(self, obj):
        gate = get_paid_course_enrollment_gate(obj.organization, obj)
        return gate["reason"]

    @extend_schema_field(serializers.BooleanField())
    def get_has_submission_details(self, obj):
        return self._has_submission_details_from_values(
            business_name=obj.business_name,
            account_holder_name=obj.account_holder_name,
            bank_name=obj.bank_name,
            bank_code=obj.bank_code,
            account_number_last4=obj.account_number_last4,
            mobile_money_number=obj.mobile_money_number,
        )

    @staticmethod
    def _has_submission_details_from_values(
        *,
        business_name,
        account_holder_name,
        bank_name,
        bank_code,
        account_number_last4,
        mobile_money_number,
    ):
        return any(
            [
                business_name,
                account_holder_name,
                bank_name,
                bank_code,
                account_number_last4,
                mobile_money_number,
            ]
        )


class AdminFinancialAccountSerializer(FinancialAccountSerializer):
    organization_name = serializers.CharField(
        source="organization.name",
        read_only=True,
    )
    organization_email = serializers.EmailField(
        source="organization.owner.email",
        read_only=True,
    )
    reviewed_by_email = serializers.EmailField(
        source="reviewed_by.email",
        read_only=True,
        allow_null=True,
    )

    class Meta(FinancialAccountSerializer.Meta):
        fields = FinancialAccountSerializer.Meta.fields + (
            "organization_name",
            "organization_email",
            "reviewed_by_email",
        )
        read_only_fields = fields


class FinancialAccountReviewDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=(
            FinancialAccountStatus.READY,
            FinancialAccountStatus.RESTRICTED,
        )
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)
    restricted_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        financial_account = self.context["financial_account"]
        decision = attrs["decision"]
        attrs["review_notes"] = (attrs.get("review_notes") or "").strip()
        attrs["restricted_reason"] = (attrs.get("restricted_reason") or "").strip()

        if decision == FinancialAccountStatus.READY:
            has_details = FinancialAccountSerializer._has_submission_details_from_values(
                business_name=financial_account.business_name,
                account_holder_name=financial_account.account_holder_name,
                bank_name=financial_account.bank_name,
                bank_code=financial_account.bank_code,
                account_number_last4=financial_account.account_number_last4,
                mobile_money_number=financial_account.mobile_money_number,
            )
            if not has_details:
                raise serializers.ValidationError(
                    {"detail": "Financial details must be submitted before approval."}
                )

        if (
            decision == FinancialAccountStatus.RESTRICTED
            and not attrs["restricted_reason"]
        ):
            raise serializers.ValidationError(
                {"restricted_reason": "Provide a reason when restricting an account."}
            )
        return attrs


class PaymentCheckoutCreateSerializer(serializers.Serializer):
    course_program_id = serializers.IntegerField(min_value=1)
    phone_number = serializers.RegexField(
        regex=r"^0[79]\d{8}$",
        required=False,
        allow_blank=True,
        error_messages={
            "invalid": "Use a 10-digit Ethiopian mobile number starting with 09 or 07."
        },
    )


class PaymentTransactionSerializer(serializers.ModelSerializer):
    enrollment_ready = serializers.BooleanField(read_only=True)
    receipt_url = serializers.CharField(read_only=True)
    course_program = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    service_credit_record = serializers.SerializerMethodField()
    is_community_service_payment = serializers.BooleanField(read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "provider",
            "tx_ref",
            "amount",
            "currency",
            "purpose",
            "status",
            "automation_status",
            "automation_error",
            "fulfilled_at",
            "checkout_url",
            "provider_reference",
            "provider_method",
            "provider_mode",
            "failure_reason",
            "last_verified_at",
            "verified_at",
            "created_at",
            "updated_at",
            "enrollment_ready",
            "receipt_url",
            "is_community_service_payment",
            "course_program",
            "organization",
            "user",
            "service_credit_record",
        )
        read_only_fields = fields

    @extend_schema_field(
        {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "title": {"type": "string"},
                "is_free": {"type": "boolean"},
                "offering_type": {"type": "string"},
                "service_credit_hours": {"type": "string"},
                "auto_issue_service_credit": {"type": "boolean"},
            },
        }
    )
    def get_course_program(self, obj):
        return {
            "id": obj.course_program_id,
            "title": obj.course_program.title,
            "is_free": obj.course_program.is_free,
            "offering_type": obj.course_program.offering_type,
            "service_credit_hours": str(obj.course_program.service_credit_hours),
            "auto_issue_service_credit": obj.course_program.auto_issue_service_credit,
        }

    @extend_schema_field(
        {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "name": {"type": "string"},
                "verification_status": {"type": "string"},
            },
        }
    )
    def get_organization(self, obj):
        return {
            "id": obj.organization_id,
            "name": obj.organization.name,
            "verification_status": obj.organization.verification_status,
        }

    @extend_schema_field(
        {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "full_name": {"type": "string"},
                "email": {"type": "string", "format": "email"},
            },
        }
    )
    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
        }

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "id": {"type": "integer"},
                "title": {"type": "string"},
                "status": {"type": "string"},
            },
        }
    )
    def get_service_credit_record(self, obj):
        if obj.service_credit_record is None:
            return None
        return {
            "id": obj.service_credit_record_id,
            "title": obj.service_credit_record.title,
            "status": obj.service_credit_record.status,
        }


class ChapaCallbackRequestSerializer(serializers.Serializer):
    tx_ref = serializers.CharField(required=False)
    trx_ref = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    ref_id = serializers.CharField(required=False)


class ChapaCallbackResponseSerializer(serializers.Serializer):
    received = serializers.BooleanField()
    tx_ref = serializers.CharField(required=False)
    payment_status = serializers.CharField(required=False)


class ChapaWebhookResponseSerializer(serializers.Serializer):
    received = serializers.BooleanField()
