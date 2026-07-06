## Authorize Payments[](https://developer.chapa.co/charge/authorize-payments/#authorize-payments)

This document will go through the necessary actions taken to authorize transactions after payment using `Chapa’s Direct API`.

### How to Authorize Transactions[](https://developer.chapa.co/charge/authorize-payments/#how-to-authorize-transactions)

Authorizing a payment is dependent on the method used when first initializing a transaction. This request is initiated after you initiated a direct charge payment. Using your transaction reference, a POST request is needed to be made to the Authorize Transaction endpoint server.

Authorizing payments vary depending on the payment method (for example, some mobile money charge may include multiple authorization steps including OTPs). We’ll explain what applies to each method in its guide.

### Direct charge options[](https://developer.chapa.co/charge/authorize-payments/#direct-charge-options)

Here are the different options for authorizing payments initiated via direct charge. Each type of direct charge has its own unique requirements and authorization flow. Follow the links to view detailed guides for each type:

-   telebirr
-   M-Pesa
-   amole
-   cbebirr
-   ebirr
-   awashbirr
-   yaya
-   boa\_ussd

### Type of `auth_type` parameters[](https://developer.chapa.co/charge/authorize-payments/#type-of-auth_type-parameters)

-   otp
-   ussd

### When to Encrypt?[](https://developer.chapa.co/charge/authorize-payments/#when-to-encrypt)

While using our direct charges API you are responsible to handle some sensitive security information like OTPs. In those times, you’ll encrypt the secure object from the payload you’ve built up. You’ll need your encryption key [from the Settings > API section of your dashboard](https://dashboard.chapa.co), and you’ll use the [3DES algorithm](https://en.wikipedia.org/wiki/Triple_DES) for encryption. You can see examples of this in our [encryption guide](https://developer.chapa.co/charge/encryption).

Now, you’ll wrap the encrypted payload inside a JSON body like this:

Successfully Encrypted Payload

```json
{
    "client": "0jhd12Dfee+2h/FzHA/X1zPlDmRmH5v+F4sdsfFFSEgg44FAFDSFS000+YwUHegTSogQdnXp7OGdUxPngiv6592YoL0YXa4eHcH1fRGjAimdqucGJPurFVu4sE5gJIEmBCXdESVqNPG72PwdRPfAINT9x1bXemI1M3bBdydtWvAx58ZE4fcOtWkD/IDi+o8K7qpmzgUR8YUbgZ71yi0pg5UmrT4YpcY2eq5i46Gg3L+rtjhjkgjkjg83hfkjajhf3"
}
```

Here is a sample code for verifying transactions:

**Endpoint** `https://api.chapa.co/v1/validate?type=amole`

**Method** `POST`

-   `Authorization` : Pass your secret key as a bearer token in the request header to authorize this call.

python
```python
import requests
    
  url = "https://api.chapa.co/v1/validate?type=amole"
  dataList = []
  boundary = 'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T'
  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="reference"')
  dataList.append('')
  dataList.append('CHcuKjgnN0Dk0')

  dataList.append('--' + boundary)
  dataList.append('Content-Disposition: form-data; name="client"')
  dataList.append('')
  dataList.append('0jhd12Dfee+2h/FzHA/X1zPlDmRmH5v+F4sdsfFFSEgg44FAFDSFS000+YwUHegTSogQdnXp7OGdUxPngiv6592YoL0YXa4eHcH1fRGjAimdqucGJPurFVu4sE5gJIEmBCXdESVqNPG72PwdRPfAINT9x1bXemI1M3bBdydtWvAx58ZE4fcOtWkD/IDi+o8K7qpmzgUR8YUbgZ71yi0pg5UmrT4YpcY2eq5i46Gg3L+rtjhjkgjkjg83hfkjajhf3')

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
```
{
  "message": "Payment is completed",
  "trx_ref": "CHS7WFpXdCMR0",
  "processor_id": null
  }
```

### Failed Response
```
{
  "message": "Invalid client data or Transaction is nowhere to be found.",
  "status": "failed",
  "data": null
  }
```
ℹ️ Refer to our 03_Error Codes.md file for all responses for this request.

### After the payment[](https://developer.chapa.co/charge/authorize-payments/#after-the-payment)

Four things will happen when payment is successfully authorized:

-   We’ll send you a webhook if you have that enabled. You can find more information on 08_Web hooks.md file.

ℹ️ On your server, you should handle the redirect and always verify the final state of the transaction.

### Verify Transaction[](https://developer.chapa.co/charge/authorize-payments/#verify-transaction)

It is important to verify the transaction and confirm its status. Here is how you can [Verify a Transaction](https://developer.chapa.co/integrations/verify-payments).

### Webhook[](https://developer.chapa.co/charge/authorize-payments/#webhook)

Chapa has event listeners that will send a message whenever a payment is successful. You can find more information on 08_Web hooks.md file