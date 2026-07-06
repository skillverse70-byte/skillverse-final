## Accept Payment[](https://developer.chapa.co/integrations/accept-payments/#accept-payment)

This document covers payment transaction and its establishment with the help of our API, Javascript library, Popup Js or our SDKs.

When accepting a payment, a transaction is established and following every transaction carries out a complete payment method.

### Collecting Customer Information[](https://developer.chapa.co/integrations/accept-payments/#collecting-customer-information)

Before carrying out the transaction, a user must provide required information such as full name, email address, the amount to transfer, etc. Below you will find a list of parameter needed:

#### Required Fields

|                 Parameter                  |                  Description                   |
|--------------------------------------------|------------------------------------------------|
|                   amount                   | The amount you will be charging your customer. |
| phone_number _Required For Risky Businesses_ |          The customer’s phone number           |

#### Optional Fields
|         Parameter          |                                                                                            Description                                                                                             |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|           email            |                                                                                     A customer’s email address                                                                                     |
|         first_name         |                                                                                      A customer’s first name                                                                                       |
|         last_name          |                                                                                       A customer’s last name                                                                                       |
|        phone_number        |                                                                                    The customer’s phone number                                                                                     |
|        callback_url        |               Function that runs when payment is successful. This should ideally be a script that uses the verify endpoint on the Chapa API to check the status of the transaction.                |
|         return_url         |                                                                   Web address to redirect the user after payment is successful.                                                                    |
|    customization[title]    | The customizations field (optional) allows you to customize the look and feel of the payment modal. You can set a logo, the store name to be displayed (title), and a description for the payment. |
|           tx_ref           |                                                                           A unique reference given to each transaction.                                                                            |
|          currency          |                                                          The currency in which all the charges are made. Currency allowed is ETB and USD.                                                          |
|     meta[hide_receipt]     |                                                                            Boolean Option to hide receipt for customer                                                                             |
|   meta[disable_phone_edit]   |                                                                       Boolean Option to make the phone number field required                                                                       |
| meta[custom_receipt_enabled] |                                                 Boolean Option to enable custom receipt with merchant branding (colors, logo, and footer removal)                                                  |
|       meta[invoices]       |                   Array of objects containing invoice line items to display on the receipt. Each object should have a “key” (item name) and “value” (item quantity/description).                   |
|    meta[payment_reason]    |                   The purpose or reason for the payment (e.g. “Paid to Merchant via Payment Link”, “Paid for goods/services online”). This is displayed on the payment receipt.                    |

> Phone number is not required, but if you pass phone\_number, it must be 10 digits, so it should be in 09xxxxxxxx or 07xxxxxxxx format.

### Initialize the Transaction and Get a payment link[](https://developer.chapa.co/integrations/accept-payments/#initialize-the-transaction-and-get-a-payment-link)

Once all the information needed to proceed with the transaction is retrieved, the action taken further would be to associate the following information into the javascript function(chosen language) which will innately display the checkout.

**Endpoint** `https://api.chapa.co/v1/transaction/initialize`

**Method** `POST`

-   `Authorization` : Pass your secret key as a bearer token in the request header to authorize this call.

python

```python
import requests
    import json
      
    url = "https://api.chapa.co/v1/transaction/initialize"
    payload = {
    "amount": "10",
    "currency": "ETB",
    "email": "abebech_bekele@gmail.com",
    "first_name": "Bilen",
    "last_name": "Gizachew",
    "phone_number": "0912345678",
    "tx_ref": "chewatatest-6669",
    "callback_url": "https://webhook.site/077164d6-29cb-40df-ba29-8a00e59a7e60",
    "return_url": "https://www.google.com/",
    "customization": {
    "title": "Payment for my favourite merchant",
    "description": "I love online payments"
    },
    "meta": {
          "invoices": [
            {"key": "Paracetamol", "value": "2pcs"},
            {"key": "Ibuprofen", "value": "1pcs"}
                      ]
           }
    }
    headers = {
    'Authorization': 'Bearer CHASECK-xxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
    }
      
    response = requests.post(url, json=payload, headers=headers)
    data = response.text
    print(data)
```

### Successful Response

```
{
  "message": "Hosted Link",
  "status": "success",
  "data": {
    "checkout_url": "https://checkout.chapa.co/checkout/payment/V38JyhpTygC9QimkJrdful9oEjih0heIv53eJ1MsJS6xG"
    }
  }
```
### Failed Response
```
{
    "message": "Authorization required	",
    "status": "failed",
    "data": null
}
```
ℹ️ Refer to our [Error Codes](https://developer.chapa.co/integrations/responses) page for all responses for this request.

### Redirect the user to the payment link[](https://developer.chapa.co/integrations/accept-payments/#redirect-the-user-to-the-payment-link)

Now all you need to do is redirect your customer to the link returned in `data.checkout_url`, and we’ll display our checkout modal for them to complete the payment.


### After the payment[](https://developer.chapa.co/integrations/accept-payments/#after-the-payment)

Four things will happen when payment is done (successful):

1.  We’ll redirect to your set `return_url` if set.
2.  The `callback_url` will return `status`, `ref_id`, and `tx_ref` after payment is complete.
3.  We’ll send you a webhook if you have that enabled. You can find more information on [Webhooks here](https://developer.chapa.co/integrations/webhooks).
4.  We’ll send you an email notification (unless you’ve disabled that).

N.B: On your server, you should handle the redirect and always verify the final state of the transaction.

#### Callback Response Structure[](https://developer.chapa.co/integrations/accept-payments/#callback-response-structure)

When the payment is completed, the `callback_url` will receive a `GET` request with a JSON payload containing:

```json
{
  "trx_ref": "chewatatest-6669",
  "ref_id": "APqDvYw1okk2",
  "status": "success"
}
```

| Parameter |                                   Description                                   |
|-----------|---------------------------------------------------------------------------------|
|  trx_ref  | The unique transaction reference you provided when initializing the transaction |
|  ref_id   |           Chapa’s internal reference ID for tracking the transaction            |
|  status   |       The status of the transaction: “pending”, “success”, “failed”, etc.       |

Your callback handler should verify this transaction using the verification endpoint to confirm the authenticity and get the details of the transaction.

### Verify Transaction[](https://developer.chapa.co/integrations/accept-payments/#verify-transaction)

It is important to verify the transaction and confirm its status. Here is how you can [Verify a Transaction](https://developer.chapa.co/integrations/verify-payments).

### Webhook[](https://developer.chapa.co/integrations/accept-payments/#webhook)

Chapa has event listeners that will send a message whenever a payment is successful. You can find more information on [Webhooks here](https://developer.chapa.co/integrations/webhooks).

### Redirection[](https://developer.chapa.co/integrations/accept-payments/#redirection)

The Initialization transaction API is used for redirection. When users go for check out, it generates a link that redirects them to the payment page. Once the payment has been made the users are redirected back to the website.

### Retry[](https://developer.chapa.co/integrations/accept-payments/#retry)

Chapa allows your customers to retry failed payments up to 10 times. These retry attempts are only available within a specific time interval that you can configure in your dashboard (the default interval is 60 minutes).

> **Note**: You can customize the retry time interval in your dashboard under Settings > Account Settings. The retry interval can range from 5 minutes upto 60 minutes . A screenshot is provided below to help you locate this setting.

### Customer Profile[](https://developer.chapa.co/integrations/accept-payments/#customer-profile)

Chapa provides a customer management system that allows you to create and manage customer profiles directly from your dashboard. To use this feature:

1.  Enable customer profile creation in your dashboard under Settings > Account Settings
2.  Access the Customers section from your dashboard menu to manage your customer base
