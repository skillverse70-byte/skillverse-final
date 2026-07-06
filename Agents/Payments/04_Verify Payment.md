Integrations Guides - Verify Payment

## Verify Payments[](https://developer.chapa.co/integrations/verify-payments/#verify-payments)

This document will go through the necessary actions taken to verify transactions after payment using Chapa’s API.

### How to Verify Payments[](https://developer.chapa.co/integrations/verify-payments/#how-to-verify-payments)

Verifying payment is dependent on the method used when first initializing a transaction. This request is initiated from your callback URL. Using your transaction reference, a GET request is needed to be made to the Verify Transaction endpoint server.

Here is a sample code for verifying transactions:

**Endpoint** `https://api.chapa.co/v1/transaction/verify/<tx_ref>`

> `<tx_ref>` is the tx\_ref that was set by you when initiating a payment.

**Method** `GET`

-   `Authorization` : Pass your secret key as a bearer token in the request header to authorize this call.

python

```python
import requests
    
  url = "https://api.chapa.co/v1/transaction/verify/chewatatest-6669"
  payload = ''
  headers = {
      'Authorization': 'Bearer CHASECK_TEST-XXXXXXXXXXXXXXX'
  }

  response = requests.get(url, headers=headers, data=payload)
  data = response.text
  print(data)
```

### Successful Response
```
{
  "message": "Payment details",
  "status": "success",
  "data": {
      "first_name": "Bilen",
      "last_name": "Gizachew",
      "email": "abebech_bekele@gmail.com",
      "currency": "ETB",
      "amount": 100,
      "charge": 3.5,
      "mode": "test",
      "method": "test",
      "type": "API",
      "status": "success",
      "reference": "6jnheVKQEmy",
      "tx_ref": "chewatatest-6669",
      "customization": {
          "title": "Payment for my favourite merchant",
          "description": "I love online payments",
          "logo": null
      },
      "meta": null,
      "created_at": "2023-02-02T07:05:23.000000Z",
      "updated_at": "2023-02-02T07:05:23.000000Z"
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
ℹ️ Refer to our 03_Error Codes.md file for all responses for this request.