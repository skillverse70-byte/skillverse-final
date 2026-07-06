Integrations Guides - Split Payments

## Split Payments[](https://developer.chapa.co/integrations/split-payment/#split-payments)

This document goes over how you can share your transaction settlement with a third party.

### What is a subaccount?[](https://developer.chapa.co/integrations/split-payment/#what-is-a-subaccount)

A subaccount holds the external bank information for a third-party seller, vendor, or service provider with whom you want to split payments. When a split payment is made, the funds are sent to the bank account associated with the subaccount.

Split payments are carried out by first creating a subaccount, then initializing the split payment. Utilizing split payment is essential in scenarios where there is a shared payment between a service provider and platform provider.

### Create a subaccount[](https://developer.chapa.co/integrations/split-payment/#create-a-subaccount)

Subaccounts can be created easily via the [Chapa Dashboard](https://dashboard.chapa.co) or using the Create Subaccount API:

-   `bank_code` and `account_number`: The bank account details for this subaccount. The `bank_code` is the **bank id** (you can get this from the [get banks](https://developer.chapa.co/transfer/list-banks) endpoint).
    
-   `business_name`: The vendor/merchant detail the subaccount for.
    
-   `account_name`: The vendor/merchant account’s name matches from the bank account.
    
-   `split_type`: The type of split you want to use with this subaccount.
    
    -   Use `percentage` if you want to get a percentage of each transaction.
    -   Use `flat` if you want to get a flat fee from each transaction, while the subaccount gets the rest.
-   `split_value`: The amount you want to get as commission on each transaction. This goes with the `split_type`, for example:
    
    -   to collect 3% from each transaction, `split_type` will be `percentage` and `split_value` will be `0.03`.
    -   to collect `25 Birr` from each transaction, `split_type` will be `flat` and `split_value` will be `25`.

> Note that subaccounts are working with `ETB` currency as a default settlement. This means if we get `subaccount` in your payload regardless of the currency we will convert it to ETB and do the settlement.

**Endpoint** `https://api.chapa.co/v1/subaccount`

**Method** `POST`

-   `Authorization` : Pass your secret key as a bearer token in the request header to authorize this call.

python

```python
import requests
  import json

  url = "https://api.chapa.co/v1/subaccount"
  payload = {
      "account_name": "Abebe Bikila ",
      "bank_code": 128,
      "account_number": "0123456789",
      "split_value": 0.2,
      "split_type": "percentage"
  }
  headers = {
      'Authorization': 'Bearer CHASECK-XXXXXXXXXXXXXXX',
      'Content-Type': 'application/json'
  }

  response = requests.post(url, json=payload, headers=headers)
  data = response.text
  print(data)
```

### Successful Response
```
{
  "message": "Subaccount created succesfully",
  "status": "success",
  "data": {
      "subaccounts[id]": "837b4e5e-57c8-4e39-b2df-66e7886b8bdb"
  }
}
```
### Failed Response
```
{
  "message": "Invalid transaction or Transaction not found	",
  "status": "failed",
  "data": null
  }
```
ℹ️ Refer to our Error Codes in 03_Error Codes.md file for all responses for this request.

If creating this account is successful we will return the `subaccount id` which you will need it when you initiate a transaction.

### Initializing Split Payment[](https://developer.chapa.co/integrations/split-payment/#initializing-split-payment)

Split payments can be initialized via the `Initialize Transaction API` or `Direct Charge API`:

**Endpoint** `https://api.chapa.co/v1/transaction/initialize` or `https://api.chapa.co/v1/charges?type={payment_method}`

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
      "tx_ref": "chewatatest-6663",
      "callback_url": "https://webhook.site/077164d6-29cb-40df-ba29-8a00e59a7e60",
      "return_url": "https://www.google.com/",
      "customization": {
  "title": "Payment for my favourite merchant",
              "description": "I love online payments."
          },
          "subaccounts": {
              "id": "ac2e6b5b-0e76-464a-8c20-2d441fbaca6c"
          }
      }
      headers = {
          'Authorization': 'Bearer CHASECK-XXXXXXXXXXXXXXX',
          'Content-Type': 'application/json'
      }
      
      response = requests.post(url, json=payload, headers=headers)
      data = response.json()
      
      if response.status_code == 200 and data.get('status') == 'success':
          checkout_url = data['data']['checkout_url']
          print(f"Checkout URL: {checkout_url}")
      else:
          error_message = data['message']
          print(f"Transaction initialization failed: {error_message}")
          
```

### Overriding the defaults[](https://developer.chapa.co/integrations/split-payment/#overriding-the-defaults)

When collecting a payment, you can override the default `split_type` and `split_value` you set when creating the subaccount, by specifying these fields in the subaccounts item:

-   `split_type`: The type of commision to charge for this transaction:
    -   `flat` if you want to get a flat fee while the subaccount gets the rest, or
    -   `percentage` if you want to get a percentage of the settlement amount.
-   `split_value`: The amount to charge as commission on the transaction. It is important to match the `split_value` for example:

for example:

-   to collect 3% from each transaction, `split_type` will be `percentage` and `split_value` will be `0.03`.
-   to collect `25 Birr` from each transaction, `split_type` will be `flat` and `split_value` will be `25`.

Here are some examples. In each of these transactions, For example if the whole amount paid is 100 ETB and Chapa fees are 6 ETB.

```cpp
subaccounts: 
  {
    id: "3380b03b-1142-44b2-b6ab-9asec740fbe49",
    // If you want the subaccount to get 69 ETB only
    // Subaccount gets: 69
    // You get: 100 - 6 - 25 = 69
    split_type: "flat",
    split_value: 25,
  },
,
```

## Keep in Mind!!!![](https://developer.chapa.co/integrations/split-payment/#keep-in-mind)

> Knowing your vendors/sub-accounts is your responsibility and if there is any dispute or chargeback raised we will be taking it from your account and it will be reflecting in your image.

-   Chapa fees are taken from you / customer.