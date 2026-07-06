Integrations Guides - Error Codes

## Error Codes[](https://developer.chapa.co/integrations/responses/#error-codes)

When accepting a payment, a transaction is established and following every transaction carries out a complete payment method.

### List of Responses[](https://developer.chapa.co/integrations/responses/#list-of-responses)

How to Interpret our API Responses: A Comprehensive List of our Response Codes and Their Meanings

#### Transaction Initialize Endpoint[](https://developer.chapa.co/integrations/responses/#transaction-initialize-endpoint)

|                                                                      Message                                                                       | Status  | Status Code |                                        Data                                        |
|----------------------------------------------------------------------------------------------------------------------------------------------------|---------|-------------|------------------------------------------------------------------------------------|
|                                                               Authorization required                                                               | failed  |     401     |                                        null                                        |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |                                        null                                        |
|                                                    _Required Attribute_: [ “validation.required”]                                                    | failed  |     400     |                                        null                                        |
|                                                    Invalid currency, _currency_ is not supported                                                     | failed  |     400     |                                        null                                        |
|                           Incorrect header settings Please check if content-type is present and set to application/json                            | failed  |     400     |                                        null                                        |
| The subaccount id you provided isn’t associated with this account. Please make sure the id is correct or to create a subaccount before proceeding  | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
|                                                  Merchant fee is greater than split flat amount.                                                   | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
| The subaccount id you provided isn’t associated with this account. Please make sure the id is correct or to create a subaccount before proceeding. | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
|                                                  Merchant fee is greater than split flat amount.                                                   | failed  |     400     |                                        null                                        |
|                                                                    Hosted Link                                                                     | success |     200     | ”checkout_url”: “https://checkout.chapa.co/checkout/payment/Od4P12hbhkbqiw9oZFHgO” |
|                                                     Transaction reference has been used before                                                     | failed  |     400     |                                        null                                        |
|                                                            User can’t receive payments                                                             | failed  |     400     |                                        null                                        |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |                                        null                                        |
|                                                Payments through API is disabled, please contact us                                                 | failed  |     404     |                                        null                                        |

ℹ️ Required Attributes could be amount, currency, tx\_ref

#### Transaction Initialize Endpoint[](https://developer.chapa.co/integrations/responses/#transaction-initialize-endpoint-1)

|                                                                      Message                                                                       | Status  | Status Code |                                        Data                                        |
|----------------------------------------------------------------------------------------------------------------------------------------------------|---------|-------------|------------------------------------------------------------------------------------|
|                                                               Authorization required                                                               | failed  |     401     |                                        null                                        |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |                                        null                                        |
|                                                    _Required Attribute_: [ “validation.required”]                                                    | failed  |     400     |                                        null                                        |
|                                                    Invalid currency, _currency_ is not supported                                                     | failed  |     400     |                                        null                                        |
|                           Incorrect header settings Please check if content-type is present and set to application/json                            | failed  |     400     |                                        null                                        |
| The subaccount id you provided isn’t associated with this account. Please make sure the id is correct or to create a subaccount before proceeding  | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
|                                                  Merchant fee is greater than split flat amount.                                                   | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
| The subaccount id you provided isn’t associated with this account. Please make sure the id is correct or to create a subaccount before proceeding. | failed  |     400     |                                        null                                        |
|                                        Merchant’s share of payment is not enough to cover transaction fee.                                         | failed  |     400     |                                        null                                        |
|                                                  Merchant fee is greater than split flat amount.                                                   | failed  |     400     |                                        null                                        |
|                                                                    Hosted Link                                                                     | success |     200     | ”checkout_url”: “https://checkout.chapa.co/checkout/payment/Od4P12hbhkbqiw9oZFHgO” |
|                                                     Transaction reference has been used before                                                     | failed  |     400     |                                        null                                        |
|                                                            User can’t receive payments                                                             | failed  |     400     |                                        null                                        |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |                                        null                                        |
|                                                Payments through API is disabled, please contact us                                                 | failed  |     404     |                                        null                                        |

ℹ️ Required Attributes could be amount, currency, tx\_ref

#### Transaction Verify Endpoint[](https://developer.chapa.co/integrations/responses/#transaction-verify-endpoint)

|                           Message                           |     Status     | Status Code |                                                                                                                                                                                                                                      Data                                                                                                                                                                                                                                      |
|-------------------------------------------------------------|----------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|                   Authorization required                    |     failed     |     401     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
|            Invalid API Key or User doesn’t exist            |     failed     |     401     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
|                       Invalid API Key                       |     failed     |     401     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
|        Invalid transaction or Transaction not found         |     failed     |     404     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
| Live secret keys can’t be used to verify a test transaction |     failed     |     401     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
| Test secret keys can’t be used to verify a live transaction |     failed     |     401     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
|                    Payment not paid yet                     |      null      |     404     |                                                                                                                                                                                                                                      null                                                                                                                                                                                                                                      |
|                       Payment details                       | _payment status_ |     200     | ”first_name”: “Bilen”, “last_name”: “Gizachew”,“email”: “abebech_bekele@gmail.com”,“currency”: “ETB”,“amount”: 100,“charge”: 3.5,“mode”: “test”,“method”: “test”,“type”: “API”,“status”: “success”,“reference”: “6jnheVKQEmy”,“tx_ref”: “chewatatest-6669”,“customization”: “title”: “Payment for my favourite merchant”, “description”: “I love online payments”, “logo”: null,“meta”: null,“created_at”: “2023-02-02T07:05:23.000000Z”,“updated_at”: “2023-02-02T07:05:23.000000Z” |

ℹ️ Payment status could be failed, success, pending.

#### List Banks Endpoint[](https://developer.chapa.co/integrations/responses/#list-banks-endpoint)

|        Message         | Status | Status Code | Data |
|------------------------|--------|-------------|------|
| Authorization required | failed |     401     | null |
|    Banks retrieved     |   -    |     200     | null |
|    Invalid API Key     | failed |     401     | null |

#### Transfer Initialize Endpoint[](https://developer.chapa.co/integrations/responses/#transfer-initialize-endpoint)

|                                                                      Message                                                                       | Status  | Status Code |      Data      |
|----------------------------------------------------------------------------------------------------------------------------------------------------|---------|-------------|----------------|
|                                                               Authorization required                                                               | failed  |     401     |      null      |
|       Our Transfer hours are Mon-Sat from 08:30 AM - 04:30 PM only, please check our transfer manuals or contact us for an immediate assist.       | failed  |     401     |      null      |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |      null      |
|                                                    _Required Attribute_: [ “validation.required”]                                                    | failed  |     400     |      null      |
|                                      This bank is no longer supported or banned by National bank of Ethiopia                                       | failed  |     400     |      null      |
|                                                   The account number is not valid for _bank name_                                                    | failed  |     400     |      null      |
| The subaccount id you provided isn’t associated with this account. Please make sure the id is correct or to create a subaccount before proceeding. | failed  |     400     |      null      |
|                                                                Insufficient Balance                                                                | failed  |     400     |      null      |
|                                                            Transfer Queued Successfully                                                            | success |     200     | 3241342142sfdd |
|                                                     Transfer Queued Successfully in Test Mode                                                      | success |     200     | 3241342142sfdd |
|                                                     TThe reference number has been used before                                                     | failed  |     400     |      null      |
|                                                                Insufficient Balance                                                                | failed  |     400     |      null      |
|                               Invalid currency, _currency_ is not supported only ETB is supported to use Transfer API.                               | failed  |     400     |      null      |
|                               The Bank Code is incorrect please check if it does exist with our getbanks endpoint.’,                               | failed  |     401     |      null      |
|                                                           User can’t receive payments’,                                                            | failed  |     400     |      null      |
|                                                       Invalid API Key or User doesn’t exist                                                        | failed  |     401     |      null      |
|                                                Transfer API isn’t available now, please contact us                                                 | failed  |     404     |      null      |

ℹ️ Required Attributes could be amount, currency, bank\_code, reference, account\_number, account\_name

#### Create Subaccount Endpoint[](https://developer.chapa.co/integrations/responses/#create-subaccount-endpoint)

|                                       Message                                        | Status  | Status Code |                           Data                            |
|--------------------------------------------------------------------------------------|---------|-------------|-----------------------------------------------------------|
|                                Authorization required                                | failed  |     401     |                           null                            |
|                        Invalid API Key or User doesn’t exist                         | failed  |     401     |                           null                            |
|                     _Required Attribute_: [ “validation.required”]                     | failed  |     400     |                           null                            |
|                    The account number is not valid for _bank name_                     | failed  |     400     |                           null                            |
|                           Subaccount created successfully                            | success |     200     | ”subaccounts[id]”: “837b4e5e-57c8-4e39-b2df-66e7886b8bdb” |
|                 Something went wrong while creating the subaccount.                  | failed  |     400     |                           null                            |
|       This bank is not longer supported or banned by National bank of Ethiopia       | failed  |     400     |                           null                            |
|                              This subaccount does exist                              | failed  |     400     |                           null                            |
|              To create subaccounts via API you need to be on live mode.              | failed  |     400     |                           null                            |
| The Bank Code is incorrect please check if it does exist with our getbanks endpoint. | failed  |     401     |                           null                            |
|                        Invalid API Key or User doesn’t exist                         | failed  |     400     |                           null                            |
|         You Can’t create a subaccount via API, try to create from dashboard.         | failed  |     401     |                           null                            |

ℹ️ Required Attributes could be split\_type, split\_value, reference,business\_name,bank\_code, account\_number, account\_name

#### Bulk Transfer Endpoint[](https://developer.chapa.co/integrations/responses/#bulk-transfer-endpoint)

|      Message      | Status | Status Code | Data |
|-------------------|--------|-------------|------|
| Too many requests | failed |     429     | null |

#### Supported Currencies Endpoint[](https://developer.chapa.co/integrations/responses/#supported-currencies-endpoint)

|                  Message                   | Status  | Status Code |                                      Data                                       |
|--------------------------------------------|---------|-------------|---------------------------------------------------------------------------------|
|           Authorization required           | failed  |     401     |                                      null                                       |
|   Invalid API Key or User doesn’t exist    | failed  |     401     |                                      null                                       |
| Supported countries retrieved successfully | success |     200     | ”currency_code”: [“ETB”, “USD”], “currency_name”: [“Ethiopian Birr”, “US Dollar”] |
