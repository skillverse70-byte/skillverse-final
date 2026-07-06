## Initiate Payments[](https://developer.chapa.co/charge/initiate-payments/#initiate-payments)

This document covers payment transaction and its establishment with the help of our Direct charges API, or our SDKs.

ℹ️ This solution is specifically designed for physical stores and integrated Enterprise Resource Planning software.

Chapa Inline, Standard, and HTML checkout make it easy for you to collect payments via card, bank, or any of our supported methods with one integration. However, they’re bundled with the Chapa UI, branding and experience.

Sometimes you want more control, or a custom solution that fits in with your app. That’s where direct charge comes in. We provide the APIs to charge customers, but you collect their payment information yourself and bring your own UI and payment flow. This means you can customize and control the customer’s experience as you wish.

With direct charge, you’ll have to integrate separately for each payment method you want to support, which can be tasking. Use direct charge only when your customers will be using a specific payment method (like cards or banks).

### How does direct charge work?[](https://developer.chapa.co/charge/initiate-payments/#how-does-direct-charge-work)

There are three main stages in direct charge:

-   Initiate the payment: You send the transaction details and the customer’s payment details to the appropriate charge endpoints.
-   Authorize the charge: The customer authorizes the charge with their payment provider, such as their mobile wallet issuer or bank. This completes the charge.
-   Verify the payment: As a failsafe, you’ll call our API to verify that the payment was successful before giving value (the verify transaction endpoint).

These steps vary depending on the payment method (for example, some mobile money charge may include multiple authorization steps including OTPs). We’ll explain what applies to each method in its guide.

### Direct charge options[](https://developer.chapa.co/charge/initiate-payments/#direct-charge-options)

Here are the different options for collecting payments via direct charge. Each type of direct charge has its own unique requirements and authorization flow. Follow the links to view detailed guides for each type:

-   telebirr
-   mpesa
-   CBEBirr
-   Coopay-Ebirr
-   Enat Bank (Use portal view)
-   awashbirr
-   yaya
-   boa\_ussd

#### Query[](https://developer.chapa.co/charge/initiate-payments/#query)

| Parameter | Required |  Type  |                                                            Description                                                             |
|-----------|----------|--------|------------------------------------------------------------------------------------------------------------------------------------|
|   type    |   yes    | string | The payment method you are interested to charge your customer with. Allowed values are telebirr, mpesa, cbebirr, ebirr, enat_bank. |

#### Body Params[](https://developer.chapa.co/charge/initiate-payments/#body-params)

Before carrying out the transaction, a user must provide required information such as full name, email address, the amount to transfer, etc. Below you will find a list of parameter needed:

#### Required Fields

| Parameter | Required |    Type    |                                                      Description                                                      |
|-----------|----------|------------|-----------------------------------------------------------------------------------------------------------------------|
|    key    |   yes    | Bearer Key | This will be your private key from Chapa. When on test mode use the test key, and when on live mode use the live key. |
|  amount   |   yes    |   digits   |                                    The amount you will be charging your customer.                                     |
|  mobile   |   yes    |   digits   |                                             The customer’s phone number.                                              |
|  tx_ref   |   yes    |   string   |                                     A unique reference given to each transaction.                                     |
| currency  |   yes    |   string   |                       The currency in which all the charges are made. Currency allowed is ETB.                        |


#### Optional Fields
| Parameter  | Required |  Type  |         Description         |
|------------|----------|--------|-----------------------------|
|   email    |    no    | email  | A customer’s email address. |
| first_name |    no    | string |  A customer’s first name.   |
| last_name  |    no    | string |   A customer’s last name.   |

### Initialize the Transaction and Get a response[](https://developer.chapa.co/charge/initiate-payments/#initialize-the-transaction-and-get-a-response)

Once all the information needed to proceed with the transaction is retrieved, the action taken further would be to associate the following information into the javascript function(chosen language) which will innately display the checkout.

**Endpoint** `https://api.chapa.co/v1/charges?type={payment_method_name}`

**Method** `POST`

python

```python
import requests
    
  url = "https://api.chapa.co/v1/charges?type=telebirr"
  dataList = []
  boundary = 'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T'
  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="amount"')
  dataList.append('')
  dataList.append('10')

  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="currency"')
  dataList.append('')
  dataList.append('ETB')

  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="tx_ref"')
  dataList.append('')
  dataList.append('12311se2319ud4')

  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="mobile"')
  dataList.append('')
  dataList.append('09xxxxxxxx')

  dataList.append('--' + boundary + '--')
  dataList.append('')
  body = '
'.join(dataList)
  payload = body.encode('utf-8')
  headers = {
      'Authorization': 'Bearer CHASECK-xxxxxxxxxxxxxxxx',
      'Content-type': 'multipart/form-data; boundary={}'.format(boundary)
  }

  response = requests.post(url, data=payload, headers=headers)
  data = response.text
  print(data)    
```

### Successful Response

```json
  {
    "message": "Charge initiated",
    "status": "success",
    "data": {
        "auth_type": "ussd",
        "requestID": "66dPW486w0z6uibrcraZ2diYztK2lx2WaslwGnS18UBXTctDxRdAudYtq3jJtMu7CV6gzyCpBSfrm9kKFJBsA8Wq7zKvk0UxL",
        "meta": {
            "message": "Payment successfully initiated with telebirr",
            "status": "success",
            "ref_id": "CH3mhMQVhsHm2",
            "payment_status": "PENDING"
        },
        "mode": "live"
    }
  }
```

### Failed Response

```bash
{
  "message": "Authorization required",
  "status": "failed",
  "data": null
  }
```

#### Types of Direct charges[](https://developer.chapa.co/charge/initiate-payments/#types-of-direct-charges)

1.  **USSD** A USSD push notification is sent to the account owner for transaction authorization. Example: Telebirr, Mpesa,AwashBirr,Yaya Wallet, CBEBirr, Coopay-Ebirr

**Example response for USSD:**

### Successful Response

```json
  {
    "message": "Charge initiated",
    "status": "success",
    "data": {
        "auth_type": "ussd",
        "requestID": "66dPW486w0z6uibrcraZ2diYztK2lx2WaslwGnS18UBXTctDxRdAudYtq3jJtMu7CV6gzyCpBSfrm9kKFJBsA8Wq7zKvk0UxL",
        "meta": {
            "message": "Payment successfully initiated with telebirr",
            "status": "success",
            "ref_id": "CH3mhMQVhsHm2",
            "payment_status": "PENDING"
        },
        "mode": "live"
    }
  }
```

### Failed Response

```bash
{
  "message": "Authorization required",
  "status": "failed",
  "data": null
  }
```

2.  **Portal View** The response will contain HTML content which will should be opened on a separate new tab for completing the transaction (will not work with in a frame). Example: Enat Bank

**Example response for portal view:**

### Successful Response

```json
  {
    "message": "Charge initiated",
    "status": "success",
    "data": {
        "auth_type": "portal_view",
        "requestID": "Zn6qkFmZ0Rzwbv3oxEZQPftK0h1GI5tTiPBfAe3yGQJdO4N8KH8V46wDXwZLnxxVazOiHOhBWDHG9uos6OUsu9Uplf6XLg4KL",
        "meta": {
            "message": "Payment successfully initiated with Enat Bank",
            "status": "success",
            "portal": "https://bank.com",
            "ref_id": "CHIao4sITVmom",
            "payment_status": "PENDING"
        },
        "mode": "live"
    }
}
```

### Failed Response

```bash
  {
    "message": "Payment failed",
    "status": "failed",
    "data": null
  }
```

ℹ️ Refer to our 03_Error Codes.md file for all responses for this request.