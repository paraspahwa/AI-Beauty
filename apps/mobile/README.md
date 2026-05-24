# Renovaara Mobile (Phase 1)

This is the initial mobile foundation for Android + iOS using Expo.

## What is implemented

- Expo Router app shell
- Mobile Supabase auth client with secure session persistence
- Authenticated API wrapper (Bearer token)
- Analyze polling helper for mobile (SSE fallback)
- Basic test screen for sign-in and protected API call

## Setup on Windows + iPhone

1. Install dependencies
   - `cd apps/mobile`
   - `npm install`
2. Configure environment
   - Copy `.env.example` to `.env`
   - Set all `EXPO_PUBLIC_*` values
3. Start dev server
   - `npm run start`
4. Test on iPhone
   - Install Expo Go from App Store
   - Scan the QR shown by Expo CLI

## Notes

- iPhone development/testing works from Windows via Expo Go.
- iOS App Store/TestFlight binary creation still needs Mac or cloud build later.
- Android local build can be done on Windows.
