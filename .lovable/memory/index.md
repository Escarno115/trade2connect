# Memory: index.md
Updated: today

TradeHub marketplace app - design system, architecture, and key decisions

## Design System
- Primary: emerald green (160 84% 39%) - fresh, trustworthy
- Background: cool white (210 40% 98%)
- Foreground: dark slate (222 47% 11%)
- Font: DM Sans
- Mobile-first, max-w-lg centered layout
- Bottom nav with 4 tabs: Home, Browse, Bookings, Account
- Card-based UI inspired by Uber Eats

## User Roles
- customer, business, admin (stored in user_roles table)
- Role assigned on signup via handle_new_user trigger
- has_role() security definer function for RLS

## Subscription Tiers
- free (3 services), basic (10), pro (unlimited + featured)
- Enforced client-side in BusinessDashboard
- Admin can change tiers in AdminPanel

## Verification Flow
- Businesses upload docs to verification-docs bucket
- Admin reviews and approves/rejects in AdminPanel
- Only approved businesses visible to customers

## Key Pages
- / (HomePage), /browse, /business/:id, /book/:id
- /bookings, /account, /auth
- /dashboard (business), /admin

## Auth
- Auto-confirm emails enabled
- Profile + role auto-created on signup
