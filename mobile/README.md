# SparkDesk Mobile (Tap to Pay)

This app is now wired for production-style handoff from web POS:

1. In web POS, select job and press `Tap to Pay on phone`.
2. Web creates a draft card sale and opens `sparkdesk://tap-pay?...`.
3. Mobile app receives a short-lived handoff token and sale id.
4. Operator presses `Tap & Pay` and customer taps card/phone.

No manual API/session/org/sale input is required in app UI.

## Required backend endpoints

- `POST /api/terminal/handoff`
- `POST /api/terminal/connection-token`
- `POST /api/terminal/payment-intents`
- `POST /api/terminal/payment-intents/:paymentIntentId/complete`
- `GET /api/terminal/sale`

## Environment

Set this for mobile builds:

- `EXPO_PUBLIC_API_BASE_URL=https://app.sparkdesk.com.au`

## Local native run (not Expo Go)

```bash
cd mobile
npm install
npx expo prebuild
npx expo run:ios
```

## TestFlight build

```bash
cd mobile
npm install
npx eas login
npx eas build:configure
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

Then in App Store Connect:

1. Open your app.
2. TestFlight tab.
3. Add Internal Testers (your Apple ID team users).
4. Install from TestFlight app on iPhone.
