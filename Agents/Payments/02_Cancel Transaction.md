[Integrations Guides](https://developer.chapa.co/integrations/test-mode-vs-live-mode "Integrations Guides") - Cancel Transaction

## Cancel Transaction[](https://developer.chapa.co/integrations/transaction-cancel/#cancel-transaction)

This endpoint allows you to cancel an active transaction by its transaction reference. When a transaction is cancelled, the checkout link will be expired and no further payment attempts will be possible.

### How to Cancel a Transaction[](https://developer.chapa.co/integrations/transaction-cancel/#how-to-cancel-a-transaction)

**Endpoint** `https://api.chapa.co/v1/transaction/cancel/<tx_ref>`

> `<tx_ref>` is the transaction reference that you provided when the transaction was initialized.

**Method** `PUT`

-   `Authorization`: Pass your secret key as a bearer token in the request header to authorize this call.

### Important Notes[](https://developer.chapa.co/integrations/transaction-cancel/#important-notes)

-   Only active transactions can be cancelled
-   Once cancelled, the transaction cannot be reactivated
-   The checkout link will be expired immediately
-   This action is irreversible

python

```python
import requests

  url = "https://api.chapa.co/v1/transaction/cancel/chewatatest-6669"

  headers = {
    'Authorization': 'Bearer CHASECK-xxxxxxxxxxxxxxxx'
  }

  response = requests.request("PUT", url, headers=headers)

  print(response.text)
```

### Successful Response
```
{
    "message": "Checkout link expired successfully",
    "status": "success",
    "data": {
        "tx_ref": "tx-456-sdf",
        "amount": 5,
        "currency": "ETB",
        "created_at": "2025-10-22T09:10:03.000000Z",
        "updated_at": "2025-10-22T09:10:21.000000Z"
    }
}
```
### Failed Response
```
{
  "message": "Payment link already expired",
  "status": "failed",
  "data": null
}
```

ℹ️Refer to our [Error Codes](https://developer.chapa.co/integrations/responses) page for all responses for this request.