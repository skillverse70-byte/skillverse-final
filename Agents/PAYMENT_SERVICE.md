# PAYMENT_SERVICE.md
# Provider: Chapa
# Generated from: Agents/Payments/00_ to 13_
# Last reviewed: 2026-06-14
# Source files: 00_test_mode_vs_live_mode.md, 01_Accept Payment.md, 02_Cancel Transaction.md, 03_Error Codes.md, 04_Split Payment.md, 04_Verify Payment.md, 05_Currency Supported.md, 06_Chapa Receipt.md, 07_HTML Checkout.md, 08_Web hooks.md, 09_Inline JS.md, 10_Testing Mobile.md, 11_Initiate Payments.md, 12_Authorize Payments.md, 13_Encryption.md

## ⚠️ Critical Rules For Any Agent Reading This File
- This file is the ONLY source of truth for Chapa payment integration across the entire platform
- Never call Chapa API directly from views, models, serializers, or tasks
- All Chapa calls go through services/payment.py only
- Never log credentials, secret keys, card data, or full webhook payloads
- Always verify webhook signature before processing any webhook event — rejection must be silent (return 200 back to Chapa, no processing)
- Always verify payment after initiation — never trust initiation response alone as success
- Sandbox and production differ only by base URL and keys which come from settings only — never hardcode either
- Split payment logic is separate from standard payment — never mix the two flows

## 1. Provider Overview
- Provider: Chapa.
- Documented capabilities:
  - Hosted payment initialization and hosted checkout link generation.
  - Redirect after payment through `return_url`.
  - Callback notification through `callback_url`.
  - Webhook notification for transaction, payout, and refund events.
  - Transaction verification by `tx_ref`.
  - Active transaction cancellation by `tx_ref`.
  - Split payments through Chapa subaccounts.
  - Subaccount creation for third-party sellers, vendors, or service providers.
  - Supported currency lookup.
  - Chapa receipt links by Chapa reference ID.
  - HTML checkout form integration.
  - Inline JavaScript checkout integration.
  - Direct charge initiation for physical stores or ERP-style integrations.
  - Direct charge authorization after initiation.
  - Direct charge encryption with 3DES for sensitive data such as OTP or card details.
  - Test mode and live mode.
  - Mobile money testing numbers.
  - Customer profile creation from dashboard if enabled.
- Test mode base URL: NOT DOCUMENTED IN PROVIDED FILES but use `https://api.chapa.co` for now.
- Live mode base URL: `https://api.chapa.co`.
- Difference between test and live mode:
  - Live Mode uses actual money, actual exchanges, and actual results.
  - Test Mode uses no actual money.
  - In Test Mode, only Chapa test cards and phone numbers can be used.
  - The majority of API features remain the same in Test Mode.
  - Chapa still sends email notifications and webhooks in Test Mode.
  - The Chapa dashboard toggle switches between Live and Test modes and switches the API keys shown.
  - Test public keys have `CHAPUBK_TEST` in the prefix.
- Which environment is active: `settings.CHAPA_ENV` (`test` / `live`).
- Authentication method found across files: `Authorization: Bearer <secret-key>` for server-side API calls, and public key for frontend HTML/Inline JS checkout.

## 2. Authentication
- Exact header name and format:
  - `Authorization: Bearer CHASECK-xxxxxxxxxxxxxxxx`
  - `Content-Type: application/json` for hosted transaction initialization.
  - `Content-type: multipart/form-data; boundary=<boundary>` for direct charge examples.
- Which key to use for which endpoint:
  - Secret key: server-side Chapa API calls, including initialize, verify, cancel, supported currencies, subaccount creation, direct charge initiation, and direct charge authorization.
  - Public key: public/frontend code such as HTML checkout and Inline JS.
  - Webhook secret: webhook signature verification.
  - Encryption key: Direct Charge API encryption for sensitive payload values.
- Where keys come from:
  - `settings.CHAPA_SECRET_KEY`
  - `settings.CHAPA_PUBLIC_KEY`
  - `settings.CHAPA_WEBHOOK_SECRET`
  - `settings.CHAPA_ENCRYPTION_KEY`
- Test mode credentials from the docs:
  - Test public keys have `CHAPUBK_TEST` in the prefix.
  - Test mobile numbers are listed in Section 13.
  - Dashboard mode toggle changes the visible keys.
- Secret key rule: Secret keys are powerful and should never be public because they authorize actions on the account.
- Public key rule: Public keys are for public code such as frontend JavaScript.
- If keys are compromised, generate new keys from Settings > API in the Chapa dashboard.

## 3. Accept Payment Flow
Source: 01_Accept Payment.md

- Full flow:
  1. Collect customer/payment data.
  2. Initialize the transaction through Chapa.
  3. Persist the transaction reference and pending state on the platform.
  4. Redirect the customer to `data.checkout_url`.
  5. Receive redirect, callback, webhook, or email notification from Chapa.
  6. Verify the transaction server-side using Chapa verification.
  7. Persist the verified final status and deliver value only after verification succeeds.
- Endpoint: `POST https://api.chapa.co/v1/transaction/initialize`.
- Authorization: `Authorization: Bearer <secret-key>`.
- Required request fields:
  - `amount`: amount to charge.
  - `phone_number`: required for risky businesses.
- Optional request fields:
  - `email`: customer email address.
  - `first_name`: customer first name.
  - `last_name`: customer last name.
  - `phone_number`: customer phone number.
  - `callback_url`: callback script URL that should verify payment status.
  - `return_url`: URL to redirect user after payment success.
  - `customization[title]`: title displayed in Chapa modal.
  - `tx_ref`: unique reference for each transaction.
  - `currency`: currency for charges. Allowed: `ETB`, `USD`.
  - `meta[hide_receipt]`: boolean option to hide receipt for customer.
  - `meta[disable_phone_edit]`: boolean option to make phone number field required.
  - `meta[custom_receipt_enabled]`: boolean option to enable custom receipt branding.
  - `meta[invoices]`: array of receipt invoice line items, each with `key` and `value`.
  - `meta[payment_reason]`: payment purpose/reason shown on receipt.
- Phone number format: if `phone_number` is passed, it must be 10 digits in `09xxxxxxxx` or `07xxxxxxxx` format.
- Successful response fields:
  - `message`: `"Hosted Link"`.
  - `status`: `"success"`.
  - `data.checkout_url`: hosted checkout URL.
- Failed response fields:
  - `message`: example `"Authorization required"`.
  - `status`: `"failed"`.
  - `data`: `null`.
- Persist after initiation:
  - `tx_ref`
  - amount
  - currency
  - customer/user
  - pending platform transaction status
  - `checkout_url`
  - callback/return URL values used
  - metadata necessary to verify the booking/listing/order
- Redirect/callback handling:
  - Redirect the user to `data.checkout_url`.
  - Chapa redirects to `return_url` if set.
  - Chapa calls `callback_url` with `status`, `ref_id`, and `tx_ref`.
  - Callback response structure uses `trx_ref`, `ref_id`, and `status`.
  - Callback handlers must verify the transaction through Chapa verification.
- Retry:
  - Customers can retry failed payments up to 10 times.
  - Retry attempts are available only within the dashboard-configured interval.
  - Default interval is 60 minutes.
  - Dashboard configurable interval is 5 to 60 minutes.

## 4. Initiate Payment
Source: 11_Initiate Payments.md

- This section is for Direct Charge initiation, not hosted checkout.
- Direct Charge is designed for physical stores and Enterprise Resource Planning software.
- Direct Charge gives the platform more control and custom UI, but requires separate integration per payment method.
- Direct charge stages:
  1. Initiate the payment.
  2. Authorize the charge.
  3. Verify the payment.
- METHOD and exact URL:
  - `POST https://api.chapa.co/v1/charges?type={payment_method_name}`
- Query fields:
  - `type`: required string. Payment method to charge. Allowed values documented: `telebirr`, `mpesa`, `cbebirr`, `ebirr`, `enat_bank`.
- Required body/header fields:
  - `key`: required Bearer Key. Private Chapa key. Use test key in test mode and live key in live mode.
  - `amount`: required digits. Amount to charge.
  - `mobile`: required digits. Customer phone number.
  - `tx_ref`: required string. Unique reference for each transaction.
  - `currency`: required string. Currency in which charges are made. Direct charge docs say allowed currency is `ETB`.
- Optional body fields:
  - `email`: optional email. Customer email address.
  - `first_name`: optional string. Customer first name.
  - `last_name`: optional string. Customer last name.
- Response fields on success:
  - `message`: `"Charge initiated"`.
  - `status`: `"success"`.
  - `data.auth_type`: authorization type such as `ussd` or `portal_view`.
  - `data.requestID`: request identifier.
  - `data.meta.message`: payment initiation message.
  - `data.meta.status`: status string.
  - `data.meta.ref_id`: Chapa reference ID.
  - `data.meta.payment_status`: example `"PENDING"`.
  - `data.meta.portal`: portal URL for portal-view flows.
  - `data.mode`: example `"live"`.
- Response fields on failure:
  - `message`: examples `"Authorization required"` or `"Payment failed"`.
  - `status`: `"failed"`.
  - `data`: `null`.
- Direct charge types:
  - `USSD`: USSD push notification sent to account owner. Examples: Telebirr, Mpesa, AwashBirr, Yaya Wallet, CBEBirr, Coopay-Ebirr.
  - `Portal View`: response contains HTML content/portal URL, which should be opened in a separate new tab and will not work in a frame. Example: Enat Bank.
- tx_ref conventions:
  - Docs require `tx_ref` to be unique for each transaction.
  - Duplicate transaction references can return `"Transaction reference has been used before"`.
- Persist after successful initiation:
  - `tx_ref`
  - amount
  - currency
  - mobile
  - payment method type
  - Chapa `requestID`
  - Chapa `ref_id`
  - `auth_type`
  - `payment_status`
  - pending platform state
- Difference between initiate and authorize:
  - Initiate sends transaction and customer payment details to the charge endpoint.
  - Authorize is a later call made after initiation, based on the payment method and returned auth requirements.
- Error responses: see Section 16.

## 5. Authorize Payments
Source: 12_Authorize Payments.md

- Authorization applies after a Direct Charge payment has been initiated.
- METHOD and exact URL:
  - `POST https://api.chapa.co/v1/validate?type=amole`
- Authorization header:
  - `Authorization: Bearer <secret-key>`.
- How authorization differs from initiation:
  - Initiation starts the direct charge and returns authorization requirements.
  - Authorization completes the charge with the payment provider, such as a mobile wallet issuer or bank.
  - Authorization varies by payment method and may require OTP or USSD flows.
- Direct charge authorization options documented:
  - `telebirr`
  - `M-Pesa`
  - `amole`
  - `cbebirr`
  - `ebirr`
  - `awashbirr`
  - `yaya`
  - `boa_ussd`
- Documented `auth_type` parameters:
  - `otp`
  - `ussd`
- Request fields from example:
  - `reference`: Chapa reference from the initiated charge.
  - `client`: encrypted payload.
- Encrypted payload wrapper:
```json
{
    "client": "0jhd12Dfee+2h/FzHA/X1zPlDmRmH5v+F4sdsfFFSEgg44FAFDSFS000+YwUHegTSogQdnXp7OGdUxPngiv6592YoL0YXa4eHcH1fRGjAimdqucGJPurFVu4sE5gJIEmBCXdESVqNPG72PwdRPfAINT9x1bXemI1M3bBdydtWvAx58ZE4fcOtWkD/IDi+o8K7qpmzgUR8YUbgZ71yi0pg5UmrT4YpcY2eq5i46Gg3L+rtjhjkgjkjg83hfkjajhf3"
}
```
- Response fields on success:
  - `message`: `"Payment is completed"`.
  - `trx_ref`: transaction reference.
  - `processor_id`: processor identifier, example `null`.
- Response fields on failure:
  - `message`: `"Invalid client data or Transaction is nowhere to be found."`.
  - `status`: `"failed"`.
  - `data`: `null`.
- When to use authorize vs initiate:
  - Use initiate to start Direct Charge.
  - Use authorize only after a Direct Charge response requires/permits authorization.
  - Hosted checkout does not use this authorize flow.
- After successful authorization:
  - Chapa can send a webhook if enabled.
  - The server must verify final transaction state.
- Error responses: see Section 16.

## 6. Verify Payment
Source: 04_Verify Payment.md

- METHOD and exact URL:
  - `GET https://api.chapa.co/v1/transaction/verify/<tx_ref>`
- Authorization header:
  - `Authorization: Bearer <secret-key>`.
- Request fields:
  - `tx_ref`: path parameter. Unique transaction reference from initialization.
- Response fields on success:
  - `message`: `"Payment details"`.
  - `status`: `"success"` in the wrapper.
  - `data.first_name`
  - `data.last_name`
  - `data.email`
  - `data.currency`
  - `data.amount`
  - `data.charge`
  - `data.mode`
  - `data.method`
  - `data.type`
  - `data.status`
  - `data.reference`
  - `data.tx_ref`
  - `data.customization.title`
  - `data.customization.description`
  - `data.customization.logo`
  - `data.meta`
  - `data.created_at`
  - `data.updated_at`
- Response fields on failure:
  - `message`: `"Invalid transaction or Transaction not found"`.
  - `status`: `"failed"`.
  - `data`: `null`.
- Possible status values found in provided files:
  - `success`: payment completed successfully.
  - `pending`: payment not completed yet.
  - `failed`: payment failed.
  - `cancelled`: transaction/payment cancelled.
  - `refunded`: transaction refunded.
  - `reversed`: transaction reversed.
  - `PENDING`: direct charge initiation meta payment status.
- What to persist for each status:
  - `success`: Chapa reference, status, amount, currency, charge, method, mode, type, timestamps, raw safe subset, and platform success/confirmed state.
  - `pending`/`PENDING`: keep platform transaction pending and do not deliver paid value.
  - `failed`: mark platform transaction failed and do not deliver paid value.
  - `cancelled`: mark platform transaction cancelled and expire checkout/reveal/booking pending work.
  - `refunded`: mark refund state and keep original transaction reference.
  - `reversed`: mark reversed state and keep original transaction reference.
- When to call verify:
  - After Chapa redirect.
  - After Chapa callback.
  - After Chapa webhook, before confirming platform value.
- Error responses: see Section 16.

## 7. Cancel Transaction
Source: 02_Cancel Transaction.md

- METHOD and exact URL:
  - `PUT https://api.chapa.co/v1/transaction/cancel/<tx_ref>`
- Authorization header:
  - `Authorization: Bearer <secret-key>`.
- When cancellation is allowed:
  - Only active transactions can be cancelled.
- Request fields:
  - `tx_ref`: path parameter.
- Response fields on success:
  - `message`: `"Checkout link expired successfully"`.
  - `status`: `"success"`.
  - `data.tx_ref`
  - `data.amount`
  - `data.currency`
  - `data.created_at`
  - `data.updated_at`
- Response fields on failure:
  - `message`: `"Payment link already expired"`.
  - `status`: `"failed"`.
  - `data`: `null`.
- Constraints:
  - Once cancelled, a transaction cannot be reactivated.
  - Checkout link expires immediately.
  - Cancellation is irreversible.
  - Only active transactions can be cancelled.
- What to update on the platform after cancellation:
  - Mark transaction cancelled/expired.
  - Remove or expire checkout link usage.
  - Release any pending platform hold if the platform created one.
  - Do not deliver paid value.
- Error responses: see Section 16.

## 8. Split Payment
Source: 04_Split Payment.md

- Split payment flow:
  1. Create a subaccount for the third-party seller/vendor/service provider.
  2. Store the returned Chapa subaccount ID.
  3. Initialize payment with `subaccounts.id`.
  4. Optionally override `split_type` and `split_value` during initialization.
  5. Verify final payment state before delivering value.
- Create subaccount endpoint:
  - `POST https://api.chapa.co/v1/subaccount`
- Split payment initialization endpoint:
  - `POST https://api.chapa.co/v1/transaction/initialize`
  - or `POST https://api.chapa.co/v1/charges?type={payment_method}`
- Create subaccount request fields:
  - `bank_code`: bank code/bank ID from Chapa get banks endpoint.
  - `account_number`: external account number.
  - `business_name`: seller/vendor/service provider business name.
  - `account_name`: external account name.
  - `split_type`: `percentage` or `flat`.
  - `split_value`: platform commission value.
- Split initialize request fields:
  - Standard payment initialization fields.
  - `subaccounts.id`: Chapa subaccount ID.
  - Optional `subaccounts.split_type`.
  - Optional `subaccounts.split_value`.
- Split recipients:
  - Chapa subaccount represents the third-party seller/vendor/service provider bank account.
  - `subaccounts.id` selects the recipient.
- Split percentage vs fixed amount:
  - `percentage`: platform gets a percentage of each transaction. Example: `split_value=0.03` for 3%.
  - `flat`: platform gets a flat fee. Example: `split_value=25` for 25 Birr.
- Response fields on create subaccount success:
  - `message`: `"Subaccount created succesfully"` / documented error table says `"Subaccount created successfully"`.
  - `status`: `"success"`.
  - `data.subaccounts[id]`: Chapa subaccount ID.
- Constraints and limitations:
  - Subaccounts settle in ETB by default.
  - If subaccount is passed regardless of payment currency, Chapa converts to ETB and settles.
  - Disputes and chargebacks are merchant/platform responsibility.
  - Chapa fees are taken from you/customer.
  - Subaccount API may require live mode.
  - Chapa may reject subaccount IDs not associated with the account.
  - Merchant share must be enough to cover transaction fee.
  - Merchant fee cannot be greater than split flat amount.
- How split differs from standard payment:
  - Standard payment settles to the merchant account.
  - Split payment includes a subaccount recipient and commission rules.
  - Split payment must not share business logic with normal hosted checkout except common request/verify primitives.
- Platform applicability:
  - Owner payout split: yes, if a vendor/owner has a Chapa subaccount.
  - Service fee split: yes, if the platform commission is represented by `split_type` and `split_value`.
  - Tax split: NOT DOCUMENTED IN PROVIDED FILES.
- Error responses: see Section 16.

⚠️ CONFLICT: 04_Split Payment.md says for `flat` with amount 100 ETB, fee 6 ETB, and split value 25, the third-party remainder is implied by the flow, but the example wording says "You get: 100 - 6 - 25 = 69" while also saying "25 Birr goes to your Chapa account." Developer review is required before implementing financial settlement interpretation.

## 9. Webhooks
⚠️ THIS SECTION MUST BE COMPLETE AND VERBATIM
Source: 08_Web hooks.md

- Exact endpoint to expose on the platform:
  - `POST /api/v1/payment/webhook/`
- Signature verification:
  - Exact header names found:
    - `chapa-signature`
    - `x-chapa-signature`
  - The docs mention both names. Treat this as a documentation conflict and verify against Chapa before changing production behavior.

⚠️ CONFLICT: 08_Web hooks.md says Chapa includes a `chapa-signature` header and also says `x-chapa-signature` is included. Use developer review before choosing only one header.

Exact algorithm verbatim from docs:

```javascript
var crypto = require('crypto');
var secret = process.env.SECRET_KEY;
// Using Express
app.post("/my/webhook/url", function(req, res) {
    //validate event
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash == req.headers['x-chapa-signature']) {
    // Retrieve the request's body
    const event = req.body;
    // Do something with event  
    }
    res.send(200);
});
```

- Exact verification steps from docs:
  - Set a secret hash in Chapa dashboard profile settings.
  - Store the secret hash as an environment variable.
  - Compute HMAC SHA256 over `JSON.stringify(req.body)` with the secret.
  - Compare the computed hash with `req.headers['x-chapa-signature']`.
  - Process only if the signature matches.
  - Return `200`.
- What to do on invalid signature:
  - Return 200 immediately.
  - Log only safe metadata.
  - Do not process the event.
- Transaction webhook payload shape:
```json
{
  "event": "charge.success",
  "first_name": "",
  "last_name": "",
  "email": null,
  "mobile": "25190000000",
  "currency": "ETB",
  "amount": "400.00",
  "charge": "12.00",
  "status": "success",
  "mode": "live",
  "reference": "AP634JFwEbxd",
  "created_at": "2023-08-27T19:21:18.000000Z",
  "updated_at": "2023-08-27T19:21:27.000000Z",
  "type": "API",
  "tx_ref": "4FGFF4FFGD3",
  "payment_method": "telebirr",
  "customization": {
    "title": null,
    "description": null,
    "logo": null
  },
  "meta": null
}
```
- Payout webhook payload shape:
```json
{
  "event": "payout.success",
  "type": "Payout",
  "account_name": "Customer Name",
  "account_number": "25190000000",
  "bank_id": 855,
  "bank_name": "telebirr",
  "amount": "2000.00",
  "charge": "60.00",
  "currency": "ETB",
  "status": "success",
  "reference": "MYMER3434989",
  "chapa_reference": "2o10dfs332U",
  "bank_reference": "GT3412w3",
  "created_at": "2023-08-27T19:23:22.000000Z",
  "updated_at": "2023-08-27T19:23:23.000000Z"
}
```
- Transaction events:
  - `charge.success`: status `success`; verify transaction, confirm matching `tx_ref`, amount, currency, mode, and reference; persist success; deliver value only after verify passes.
  - `charge.refunded`: status `refunded`; persist refund status; do not repeat original success side effects.
  - `charge.reversed`: status `reversed`; persist reversal status; do not repeat original success side effects.
  - `charge.failed/cancelled`: status `failed/cancelled`; persist failed or cancelled state; release pending holds where applicable.
- Transfer/payout events:
  - `payout.success`: status `success`; persist payout success data.
  - `payout.failed/cancelled`: status `failed/cancelled`; persist payout failure/cancellation data.
- Payload `type` values found:
  - `Payment Link`
  - `API`
  - `Event`
  - `Donation`
  - `Payout`
- Custom webhook types found:
  - `Payout`
  - `Transaction`
  - `Refund`
- Idempotency:
  - Detect duplicate webhook delivery by persisted Chapa `reference`, `tx_ref`, and `event` combination.
  - If already processed, return 200 and do not repeat business logic.
- Exact HTTP response expected:
  - Return `200 OK`.
  - Chapa retries every 10 minutes up to 10 attempts over 72 hours if `200 OK` is not received.
- Critical verification rule:
  - Always call verify endpoint for critical transaction data before confirming orders.
  - Confirm status, amount, currency, `tx_ref`, and mode.

## 10. Encryption
Source: 13_Encryption.md

- What requires encryption:
  - Direct Charge API payloads containing sensitive information.
  - Card details.
  - OTP values.
  - Payloads that include request token/request ID when OTP is needed.
- Encryption algorithm:
  - 3DES.
- Which key is used:
  - `settings.CHAPA_ENCRYPTION_KEY`
- When to encrypt vs when not to:
  - Encrypt when using Direct Charge API and sending sensitive information like card details or OTP.
  - Hosted checkout, HTML checkout, and Inline JS checkout do not document backend payload encryption in the provided files.
- Sensitive body params example:
```yaml
{

    "requestID": 13434jjfhd8ududfy82e324234234jkhjsfhdfhskdjfh89fjhduohdfjhsgkdfksjdfskldhfkjs,
    "otp": 1234
}
```
- Encryption example verbatim from docs:

```python
import json, requests
  import base64
  from Crypto.Cipher import DES3
  import hashlib

  def encryptData(self, key, plainText):
    blockSize = 8
    padDiff = blockSize - (len(plainText) % blockSize)
    cipher = DES3.new(key, DES3.MODE_ECB)
    plainText = "{}{}".format(plainText, "".join(chr(padDiff) * padDiff))
    encrypted = base64.b64encode(cipher.encrypt(plainText))
    return encrypted
```

## 11. HTML Checkout
Source: 07_HTML Checkout.md

- HTML checkout uses a frontend HTML form that posts to Chapa.
- Endpoint:
  - `POST https://api.chapa.co/v1/hosted/pay`
- Key used:
  - `public_key`.
- Backend needs:
  - Generate or provide a unique `tx_ref`.
  - Provide trusted amount, currency, customer fields, callback URL, return URL, and metadata.
  - Verify final transaction state server-side using the secret key.
- Fields found:
  - `public_key`
  - `tx_ref`
  - `amount`
  - `currency`
  - `email`
  - `first_name`
  - `last_name`
  - `title`
  - `description`
  - `logo`
  - `callback_url`
  - `return_url`
  - `meta[title]`
- Backend must not trust frontend-submitted amount as final truth; verify with Chapa before delivering value.
- If payment fails, Chapa keeps the checkout page open so the customer can retry until success or cancellation.

## 12. Inline JS Checkout
Source: 09_Inline JS.md

- Inline JS uses Chapa's `ChapaCheckout` JavaScript class.
- Hosted script:
```html
<script src="https://js.chapa.co/v1/inline.js"></script>
```
- NPM package:
```bash
npm install @chapa_et/inline.js
```
- Backend needs:
  - Provide trusted amount/currency/transaction metadata to the frontend.
  - Provide `callbackUrl` and `returnUrl`.
  - Provide or coordinate a unique `tx_ref` if used by the frontend flow.
  - Verify webhook and transaction details server-side before delivering value.
- Features:
  - Dynamic payment form.
  - Payment method support including Telebirr, CBE Birr, Ebirr, Mpesa, and others via Chapa.
  - Ethiopian mobile number validation.
  - Customizable styles and button text.
  - Callback and return URLs.
  - Success and failure callbacks.
  - Popup handling.
  - Pre-filled phone numbers.
  - Show/hide payment method names.
- Configuration options:
  - `publicKey`: required Chapa public key.
  - `amount`: required amount.
  - `currency`: default `ETB`.
  - `availablePaymentMethods`: default `['telebirr', 'cbebirr', 'ebirr', 'mpesa']`.
  - `customizations.buttonText`.
  - `customizations.styles`.
  - `callbackUrl`.
  - `returnUrl`.
  - `showFlag`: default `true`.
  - `showPaymentMethodsNames`: default `true`.
  - `onSuccessfulPayment`.
  - `customizations.successMessage`.
  - `onPaymentFailure`.
  - `onClose`.
- Security notice:
  - The amount parameter in frontend integration can be manipulated by users.
  - Always implement webhooks to verify payment amounts, status, and transaction details on the backend.

## 13. Mobile Testing
Source: 10_Testing Mobile.md

- Mobile testing uses documented success mobile money test numbers.
- Any numbers other than the documented success numbers return `failed` status.
- Awash Bank:
  - Phone: `0900123456`, OTP: `12345`
  - Phone: `0900112233`, OTP: `12345`
  - Phone: `0900881111`, OTP: `12345`
- Amole:
  - Phone: `0900123456`, OTP: `12345`
  - Phone: `0900112233`, OTP: `12345`
  - Phone: `0900881111`, OTP: `12345`
- telebirr:
  - Phone: `0900123456`
  - Phone: `0900112233`
  - Phone: `0900881111`
- CBEBirr:
  - Phone: `0900123456`
  - Phone: `0900112233`
  - Phone: `0900881111`
- COOPPay-ebirr:
  - Phone: `0900123456`
  - Phone: `0900112233`
  - Phone: `0900881111`
- mpesa:
  - Phone: `0700123456`
  - Phone: `0700112233`
  - Phone: `0700881111`
- Mobile-specific flow differences: NOT DOCUMENTED IN PROVIDED FILES beyond provider-specific test numbers and OTP requirements.

## 14. Currencies Supported
Source: 05_Currency Supported.md

- Endpoint:
  - `GET https://api.chapa.co/v1/currency_supported`
- Authorization:
  - `Authorization: Bearer <secret-key>`.
- Supported currencies found:
  - `ETB`
  - `USD`
- Default currency for the platform is `ETB` IN PROVIDED FILES.
- How to specify currency:
  - Hosted checkout/accept payment uses `currency`; docs say allowed values are `ETB` and `USD`.
  - Direct charge uses `currency`; direct charge docs say allowed currency is `ETB`.
- Best practices documented:
  - Cache the supported currency response.
  - Handle errors gracefully.
  - Validate currency before initiating payment.
  - Display currency names with codes.

⚠️ CONFLICT: 01_Accept Payment.md says hosted payment currency allowed is ETB and USD, while 11_Initiate Payments.md says Direct Charge currency allowed is ETB.

## 15. Chapa Receipt
Source: 06_Chapa Receipt.md

- Receipt URL format:
  - `https://chapa.link/payment-receipt/{chapa_reference_id}`
- Example:
  - `https://chapa.link/payment-receipt/APQ1kcaiCZi2`
- Receipt contains:
  - Reference ID.
  - Payer name.
  - Phone number.
  - Email.
  - Payment method.
  - Status, example `Paid`.
  - Payment date.
  - Payment reason.
  - Sub Total.
  - Charge.
  - Total.
  - Merchant name.
  - TIN.
  - Merchant phone.
  - Merchant address.
  - Merchant website.
  - Chapa Reference.
  - Merchant Reference.
  - Bank Reference.
- How to access/generate:
  - Use `response.data.reference` from Chapa payment response to build the receipt URL.
- Backend storage:
  - Store Chapa reference ID if receipt links need to be reconstructed.
  - Store receipt URL or derive it from the reference.
  - Do not store full receipt data unless a platform feature needs it.
- What to expose to Flutter and React:
  - Chapa reference ID.
  - Receipt URL.
  - Payment reason and invoice line items if the client displays them.
- Invoice receipt metadata:
  - Use `meta.invoices` with key/value items.
  - Use `meta[payment_reason]` for payment purpose.
- Custom receipts:
  - Enabled from dashboard Settings > Account Settings.
  - Supports logo, primary color, secondary color, and footer removal.

## 16. All Error Codes
Source: 03_Error Codes.md plus errors found in other files

| Code | Meaning | Which endpoint | How to handle |
|---|---|---|---|
| 401 | Authorization required | Transaction Initialize | Do not retry blindly; check secret key/header. |
| 401 | Invalid API Key or User doesn't exist | Transaction Initialize | Check Chapa key and account mode. |
| 400 | Required Attribute: validation.required | Transaction Initialize | Return validation error; include required amount/currency/tx_ref as applicable. |
| 400 | Invalid currency, currency is not supported | Transaction Initialize | Validate currency before calling Chapa. |
| 400 | Incorrect header settings; content-type must be application/json | Transaction Initialize | Fix request headers. |
| 400 | Subaccount id is not associated with this account | Transaction Initialize / Split | Check subaccount ID/account ownership. |
| 400 | Merchant's share of payment is not enough to cover transaction fee | Transaction Initialize / Split | Adjust split values before retry. |
| 400 | Merchant fee is greater than split flat amount | Transaction Initialize / Split | Adjust flat split value. |
| 200 | Hosted Link | Transaction Initialize | Persist pending transaction and checkout URL. |
| 400 | Transaction reference has been used before | Transaction Initialize | Generate a new unique `tx_ref`; do not reuse. |
| 400 | User can't receive payments | Transaction Initialize | Do not proceed; contact Chapa/account owner. |
| 404 | Payments through API is disabled, please contact us | Transaction Initialize | Stop flow; Chapa account/API must be enabled. |
| 401 | Authorization required | Transaction Verify | Check secret key/header. |
| 401 | Invalid API Key or User doesn't exist | Transaction Verify | Check Chapa key and account mode. |
| 401 | Invalid API Key | Transaction Verify | Check Chapa key. |
| 404 | Invalid transaction or Transaction not found | Transaction Verify | Keep transaction unresolved/failed; do not deliver value. |
| 401 | Live secret keys can't be used to verify a test transaction | Transaction Verify | Fix environment/key mismatch. |
| 401 | Test secret keys can't be used to verify a live transaction | Transaction Verify | Fix environment/key mismatch. |
| 404 | Payment not paid yet | Transaction Verify | Keep pending; do not deliver value. |
| 200 | Payment details | Transaction Verify | Persist verified status and safe details. |
| 401 | Authorization required | List Banks | Check secret key/header. |
| 200 | Banks retrieved | List Banks | Use returned bank data. |
| 401 | Invalid API Key | List Banks | Check Chapa key. |
| 401 | Authorization required | Transfer Initialize | Check secret key/header. |
| 401 | Transfer hours are Mon-Sat from 08:30 AM - 04:30 PM only | Transfer Initialize | Retry in allowed transfer hours. |
| 401 | Invalid API Key or User doesn't exist | Transfer Initialize | Check key/account. |
| 400 | Required Attribute: validation.required | Transfer Initialize | Return validation error. |
| 400 | This bank is no longer supported or banned by National bank of Ethiopia | Transfer Initialize | Reject unsupported bank. |
| 400 | Account number is not valid for bank name | Transfer Initialize | Validate bank/account details. |
| 400 | Subaccount id is not associated with this account | Transfer Initialize | Check subaccount/account ownership. |
| 400 | Insufficient Balance | Transfer Initialize | Stop/retry after balance update. |
| 200 | Transfer Queued Successfully | Transfer Initialize | Persist queued transfer. |
| 200 | Transfer Queued Successfully in Test Mode | Transfer Initialize | Persist test queued transfer. |
| 400 | Reference number has been used before | Transfer Initialize | Generate a new unique reference. |
| 400 | Invalid currency; only ETB is supported for Transfer API | Transfer Initialize | Validate ETB only. |
| 401 | Bank Code is incorrect | Transfer Initialize | Validate bank code against get banks endpoint. |
| 400 | User can't receive payments | Transfer Initialize | Stop flow. |
| 404 | Transfer API isn't available now | Transfer Initialize | Stop/retry later; contact Chapa if persistent. |
| 401 | Authorization required | Create Subaccount | Check secret key/header. |
| 401 | Invalid API Key or User doesn't exist | Create Subaccount | Check key/account. |
| 400 | Required Attribute: validation.required | Create Subaccount | Return validation error for split_type, split_value, reference, business_name, bank_code, account_number, account_name. |
| 400 | Account number is not valid for bank name | Create Subaccount | Validate bank/account details. |
| 200 | Subaccount created successfully | Create Subaccount | Persist Chapa subaccount ID. |
| 400 | Something went wrong while creating the subaccount | Create Subaccount | Stop and surface safe failure. |
| 400 | This bank is not longer supported or banned by National bank of Ethiopia | Create Subaccount | Reject unsupported bank. |
| 400 | This subaccount does exist | Create Subaccount | Reuse existing subaccount if safe. |
| 400 | To create subaccounts via API you need to be on live mode | Create Subaccount | Do not attempt in test mode. |
| 401 | Bank Code is incorrect | Create Subaccount | Validate bank code against get banks endpoint. |
| 400 | Invalid API Key or User doesn't exist | Create Subaccount | Check key/account. |
| 401 | You Can't create a subaccount via API, try to create from dashboard | Create Subaccount | Stop API creation; use dashboard. |
| 429 | Too many requests | Bulk Transfer | Back off and retry later. |
| 401 | Authorization required | Supported Currencies | Check secret key/header. |
| 401 | Invalid API Key or User doesn't exist | Supported Currencies | Check key/account. |
| 200 | Supported countries retrieved successfully | Supported Currencies | Cache/use supported currency list. |
| failed | Authorization required | Accept Payment / Direct Charge examples | Check secret key/header. |
| failed | Payment failed | Direct Charge portal view | Mark failed; do not deliver value. |
| failed | Payment link already expired | Cancel Transaction | Mark expired/cancelled if appropriate. |
| failed | Invalid client data or Transaction is nowhere to be found | Authorize Payment | Do not deliver value; verify state. |

## 17. Test Mode vs Live Mode
Source: 00_test_mode_vs_live_mode.md

- Live Mode:
  - Actual money.
  - Actual exchanges.
  - Actual results.
  - Use after extensively testing integration.
- Test Mode:
  - No actual money is used.
  - Only test cards and test phone numbers can be used.
  - Majority of API features remain the same.
  - Chapa continues sending email notifications and webhooks.
- How to switch modes:
  - Chapa dashboard toggle switches Live/Test mode and changes the API keys shown.
  - Platform code must use `settings.CHAPA_ENV` only.
- Test credentials:
  - Test public keys have `CHAPUBK_TEST` prefix.
  - Test mobile numbers are listed in Section 13.
- Behavior differences:
  - Test mode cannot use real money.
  - Test mode accepts only documented test cards/phone numbers.
  - Live mode uses actual money and actual results.

## 18. Settings Required

- `CHAPA_SECRET_KEY`: secret server-side Chapa key.
- `CHAPA_PUBLIC_KEY`: public key for HTML checkout and Inline JS.
- `CHAPA_WEBHOOK_SECRET`: webhook secret hash from Chapa dashboard.
- `CHAPA_ENCRYPTION_KEY`: Direct Charge encryption key from Chapa dashboard Settings > API.
- `CHAPA_BASE_URL`: base Chapa API URL. Provided files document `https://api.chapa.co`.
- `CHAPA_ENV`: active mode, `test` or `live`.
- `CHAPA_RETURN_URL`: platform return URL. Name not documented by Chapa, but `return_url` field is documented.
- `CHAPA_CALLBACK_URL`: platform callback URL. Can be found in CHAPA_CALLBACK_URL enviroment key, but `callback_url` field is documented.

## 19. services/payment.py Contract

- `initiate_payment(amount, currency, tx_ref, user, callback_url, return_url, metadata) -> dict`
  - Source: Section 4.
  - For hosted checkout, map to `POST /v1/transaction/initialize`.
  - Must persist or return `checkout_url`, `tx_ref`, and pending status.
- `authorize_payment(amount, currency, tx_ref, user, metadata) -> dict`
  - Source: Section 5.
  - For Direct Charge authorization only.
  - Must use encrypted `client` payload when sensitive data is required.
- `verify_payment(tx_ref) -> dict`
  - Source: Section 6.
  - Must call `GET /v1/transaction/verify/<tx_ref>`.
  - Must not deliver value without successful verification.
- `cancel_transaction(tx_ref) -> dict`
  - Source: Section 7.
  - Must call `PUT /v1/transaction/cancel/<tx_ref>`.
- `initiate_split_payment(amount, currency, tx_ref, user, splits) -> dict`
  - Source: Section 8.
  - Must keep split payment logic separate from standard payment.
  - Must include `subaccounts.id` and optional split overrides.
- `verify_webhook_signature(payload, signature) -> bool`
  - Source: Section 9 — verbatim algorithm.
  - Must compute HMAC SHA256 with webhook secret over JSON serialized payload and compare to Chapa signature.
- `process_webhook_event(event_type, payload) -> None`
  - Source: Section 9 — event routing.
  - Must be idempotent.
  - Must verify critical transaction values before changing platform business state.
- `encrypt_payload(data: dict) -> str`
  - Source: Section 10.
  - Must use 3DES and `settings.CHAPA_ENCRYPTION_KEY`.

## 20. What Must Never Happen
Extracted from all 15 files:

- Never expose `CHAPA_SECRET_KEY` to any client.
- Never expose card data, OTP data, or secret credentials in logs.
- Never process a webhook without signature verification.
- Never reject an invalid webhook in a way that causes Chapa to retry sensitive invalid payloads; return 200 and do not process.
- Never trust initiation as payment success; always verify.
- Never trust frontend amount in HTML checkout or Inline JS as final truth.
- Never deliver booking/contact/order value before Chapa verification succeeds.
- Never mix split payment flow with standard payment flow.
- Never hardcode `tx_ref`; it must be unique per transaction.
- Never reuse `tx_ref`; Chapa can reject duplicate transaction references.
- Never hardcode Chapa keys or environment.
- Never use a live secret key to verify a test transaction.
- Never use a test secret key to verify a live transaction.
- Never create subaccounts via API in test mode if Chapa requires live mode.
- Never cancel unless the transaction is active.
- Never assume cancellation can be undone.
- Never use Direct Charge encryption for unrelated hosted checkout payloads unless Chapa documents it.
- Never ignore amount, currency, status, mode, and `tx_ref` matching during verification.
