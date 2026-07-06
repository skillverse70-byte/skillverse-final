## Integrations Guides - Currency Supported

## Supported Currencies[](https://developer.chapa.co/integrations/currency-supported/#supported-currencies)

This document covers how to retrieve the list of currencies countries and their codes that can be used for payment processing with Chapa API.

When integrating with Chapa, you need to know which currencies are supported for payment processing. This endpoint provides you with a comprehensive list of all supported currencies.

### Get Supported Countries and Currencies[](https://developer.chapa.co/integrations/currency-supported/#get-supported-countries-and-currencies)

**Endpoint** `https://api.chapa.co/v1/currency_supported`

**Method** `GET`

-   `Authorization` : Pass your secret key as a bearer token in the request header to authorize this call.

python

```python
import requests

url = "https://api.chapa.co/v1/currency_supported"

headers = {
  'Authorization': 'Bearer CHASECK-xxxxxxxxxxxxxxxx'
}

response = requests.get(url, headers=headers)
print(response.text)
```

### Successful Response
```
{
  "status": "success",
  "currency_code": [
    1,
    2
  ],
  "currency_name": [
    "ETB",
    "USD"
  ]
}
```
### Failed Response
```
{
  "message": "Invalid API Key",
  "status": "failed",
  "data": null
}
```
ℹ️ Refer to our [Error Codes](https://developer.chapa.co/integrations/responses) page for all responses for this request.

### Response Structure[](https://developer.chapa.co/integrations/currency-supported/#response-structure)

When successful, the API returns a JSON object with the following structure:

```json
{
  "status": "success",
  "currency_code": [
        1,
        2
  ],
  "currency_name": [
        "ETB",
        "USD"
  ]
}
```

### Response Parameters[](https://developer.chapa.co/integrations/currency-supported/#response-parameters)

|   Parameter   |  Type  |                           Description                            |
|---------------|--------|------------------------------------------------------------------|
|    status     | string | Status of the request (always “success” for successful requests) |
| currency_code | array  |          Array of supported currency codes (e.g., 1, 2)          |
| currency_name | array  |    Array of corresponding currency names (e.g., “ETH”, “USD”)    |

### Use Cases[](https://developer.chapa.co/integrations/currency-supported/#use-cases)

This endpoint is useful for:

-   **Dynamic Currency Selection**: Populate currency dropdowns in your payment forms
-   **Currency Validation**: Check if a currency is supported before initiating payments
-   **User Experience**: Display available payment options to customers
-   **Integration Planning**: Understand the scope of Chapa’s payment network

### Example Implementation[](https://developer.chapa.co/integrations/currency-supported/#example-implementation)

```javascript
// Fetch supported currencies
const response = await fetch('https://api.chapa.co/v1/currency_supported', {
  headers: {
    'Authorization': 'Bearer YOUR_SECRET_KEY'
  }
});

const data = await response.json();

// Validate currency before payment
function isCurrencySupported(currencyCode) {
  return data.currency_code.includes(currencyCode);
}

// Populate currency dropdown
data.currency_code.forEach((code, index) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = `${code} - ${data.currency_name[index]}`;
  currencySelect.appendChild(option);
});
```

### Best Practices[](https://developer.chapa.co/integrations/currency-supported/#best-practices)

1.  **Cache the Response**: Since supported currencies don’t change frequently, consider caching the response to reduce API calls.
    
2.  **Error Handling**: Always implement proper error handling for cases where the API is unavailable.
    
3.  **Currency Validation**: Use this endpoint to validate currency codes before initiating payments to avoid failed transactions.
    
4.  **User Experience**: Display currency names along with codes to provide better user experience.