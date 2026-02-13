# Tap to Pay on iPhone (SparkDesk)

This project now includes Stripe Terminal backend endpoints to support in-person NFC payments from a native iOS app.

## What is implemented

- `POST /api/terminal/connection-token`
- `POST /api/terminal/payment-intents`
- `POST /api/terminal/payment-intents/:paymentIntentId/complete`

All endpoints require authenticated user + active org + `sales:create` permission.

## Required Stripe setup

1. Enable Stripe Terminal for your account.
2. Use a supported country/account for Tap to Pay on iPhone.
3. Use Stripe **Terminal SDK** in your iOS app.
4. Keep using server-side secret keys only (never in app code).

## Environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (for web checkout/webhooks already in app)

## Mobile app flow

1. POS sale exists in SparkDesk (`status=draft`).
2. iOS app requests connection token from `/api/terminal/connection-token`.
3. iOS app calls `/api/terminal/payment-intents` with `{ saleId }`.
4. Backend creates Stripe `card_present` PaymentIntent and returns `clientSecret`.
5. iOS app collects + processes payment using Stripe Terminal SDK.
6. iOS app calls `/api/terminal/payment-intents/:id/complete`.
7. Backend verifies status and marks sale as paid.

## Notes

- This is separate from web Stripe Checkout.
- Tap to Pay requires native iOS (or Android) app, not a browser-only flow.
