Integrations Guides

## Test Mode Vs Live Mode[](https://developer.chapa.co/integrations/test-mode-vs-live-mode/#test-mode-vs-live-mode)

In this document we’ll cover the differences between Test mode and Live mode as well as when to utilize them.

### Your Chapa merchant account can be used in one of two ways[](https://developer.chapa.co/integrations/test-mode-vs-live-mode/#your-chapa-merchant-account-can-be-used-in-one-of-two-ways)

1.  **Live Mode**: Actual money, actual exchanges, and actual results. After extensively testing your integration, switch to live mode.
    
2.  **Test Mode**: No actual money is used in the test mode. Only our [test cards](https://developer.chapa.co/test/testing-cards) and [phone numbers](https://developer.chapa.co/test/testing-mobile) can be used. The majority of the API’s features remain the same, and we’ll continue to send email notifications and webhooks.


You can easily switch between Live and Test modes with the toggle button at the top right side of the page. When you switch between modes, we’ll also switch the API keys shown. Test keys will always have CHAPUBK\_TEST in the prefix (for example CHAPUBK\_TEST-BbsIL9E0NillGIZ4beEuU9HNCXxlJ8dR)

### API Keys[](https://developer.chapa.co/integrations/test-mode-vs-live-mode/#api-keys)

When you sign up in the Chapa dashboard you’re given two type of API keys :

1.  **Secret key**: Secret keys are the most powerful kind of keys and should never be made public because they have the power to authorize any action on your account.
2.  **Public key**: When writing “public” code, such as front-end JavaScript, you should use the public key.

To get to your keys:

-   Log in to your Chapa [Dashboard](https://dashboard.chapa.co/dashboard).
-   Navigate to settings by clicking on the top right side circle icon with your name’s first two letters on it.


-   Select the API Keys on the horizontal tab to access both public and secret keys.

> **Don’t take any chances**: Suppose you think your keys may have been compromised (for instance, you accidentally committed them to Git). In that case, you should immediately generate new ones using the “Generate new keys” button on the Settings > API page on your dashboard. This will invalidate all existing keys and give you a new set, and you can then update your app to use the new ones.

--------------------------------------------------------------------------