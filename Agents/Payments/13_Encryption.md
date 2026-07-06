## Encryption[](https://developer.chapa.co/charge/encryption/#encryption)

When using our `Direct Charge API` to charge a card directly or send us OTP, you’ll need to encrypt the payload containing the sensitive information before making the request.

### How to Encrypt payload?[](https://developer.chapa.co/charge/encryption/#how-to-encrypt-payload)

To encrypt the payload manually, you’ll need your encryption key [(from the Settings > API section of your dashboard)](https://dashboard.chapa.co). You’ll use the [3DES algorithm](https://en.wikipedia.org/wiki/Triple_DES) to encrypt the payload.

### What to encrypt[](https://developer.chapa.co/charge/encryption/#what-to-encrypt)

When you are sending sensitive information like card details or otp, you need to encrypt the following body params incase of when otp needed, make sure to include request token whenever we’ve returned to you when you initiate the transaction.

```yaml
{

    "requestID": 13434jjfhd8ududfy82e324234234jkhjsfhdfhskdjfh89fjhduohdfjhsgkdfksjdfskldhfkjs,
    "otp": 1234
}
```

Here’s an example of an encryption function in different languages. In each case, the function takes the payload as a hash, converts it to JSON, encrypts it and encodes it in base64:

python

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