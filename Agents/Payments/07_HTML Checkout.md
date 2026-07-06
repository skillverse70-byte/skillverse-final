## Integrations Guides - HTML Checkout

## HTML Checkout[](https://developer.chapa.co/integrations/html-checkout/#html-checkout)

Our HTML checkout option is done entirely in HTML. You create a regular HTML form containing the payment details. When the customer submits the form, they’ll be redirected to our payment page where they can complete the payment.

### An example[](https://developer.chapa.co/integrations/html-checkout/#an-example)

Here’s an example of how you’d implement HTML checkout:

```php
<form method="POST" action="https://api.chapa.co/v1/hosted/pay" >
    <input type="hidden" name="public_key" value="YOUR_PUBLIC_API_KEY" />
    <input type="hidden" name="tx_ref" value="negade-tx-12345678sss9" />
    <input type="hidden" name="amount" value="10" />
    <input type="hidden" name="currency" value="ETB" />
    <input type="hidden" name="email" value="israel@negade.et" />
    <input type="hidden" name="first_name" value="Israel" />
    <input type="hidden" name="last_name" value="Goytom" />
    <input type="hidden" name="title" value="Let us do this" />
    <input type="hidden" name="description" value="Paying with Confidence with cha" />
    <input type="hidden" name="logo" value="https://chapa.link/asset/images/chapa_swirl.svg" />
    <input type="hidden" name="callback_url" value="https://example.com/callbackurl" />
    <input type="hidden" name="return_url" value="https://example.com/returnurl" />
    <input type="hidden" name="meta[title]" value="test" />
    <button type="submit">Pay Now</button>
</form>
```

### Walkthrough[](https://developer.chapa.co/integrations/html-checkout/#walkthrough)

Let’s take a closer look at what this code is doing.

First, we create a regular HTML form. The form must have the `method` as `POST`, and the `action` pointing to Chapa’s hosted checkout page.

```php
<form method="POST" action="https://api.chapa.co/v1/hosted/pay" >
```

Second up is setting the your public api key. You can get your public api key from your dashboard after signing up. Checkout [Quick Start](https://developer.chapa.co/dashboard/quickstart) on how you can get it.

```lua
<input type="hidden" name="public_key" value="YOUR_PUBLIC_API_KEY" />
```

Next up is the payment button. This is the button the customer clicks after they’ve reviewed their order and are ready to pay you. Make sure it’s inside the form and set to `type="submit"` so the form submits when it’s clicked.

```php
<form method="POST" action="https://api.chapa.co/v1/hosted/pay" >
    <button type="submit">Pay Now</button>
 </form>
```

Finally, we add hidden input fields to the form containing the payment options. These payment options are the same values used in the Standard flows, converted into form fields. Object fields are referenced with square brackets.

___

**NOTE**

On your server, you should handle the redirect and always verify the final state of the transaction.

Transaction verification should always be done on the server, as it makes use of your secret key, which should never be exposed publicly.

___

### What if the payment fails?[](https://developer.chapa.co/integrations/html-checkout/#what-if-the-payment-fails)

If the payment attempt fails (for instance, due to insufficient funds), you don’t need to do anything. We’ll keep the payment page open, so the customer can try again until the payment succeeds or they choose to cancel.

All done!