Country-based business registration, phone validation, and document requirements

## Country System
- businesses table has `country` (text) and `phone_verified` (boolean) columns
- Country config in src/lib/countries.ts with dial codes, phone regex, required docs
- Supported: ZA, NG, KE, GH, US, GB, AU, IN
- CreateBusinessForm extracted to src/components/CreateBusinessForm.tsx

## Verification
- Each country has specific required documents (business reg + ID)
- VerificationUpload accepts `country` prop for country-specific docs
- Phone verification: admin manually marks as verified (no Twilio - user declined)
- Admin panel shows country, phone, and phone verification toggle
