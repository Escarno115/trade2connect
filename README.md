# Remix of Trade Connect

Build a full-stack, mobile-first marketplace web app for skilled trades (like plumbers, electricians, builders, carpenters) operating in a specific city or region.



The app must include three types of users:

1. Customers

2. Businesses (service providers)

3. Admin (platform owner)



-----------------------------------

CUSTOMER FEATURES

-----------------------------------

- User registration and login

- Browse services by category (plumbing, electrical, carpentry, etc)

- Filter services by:

  - category

  - price range

  - location/city

- View business profiles with:

  - business name

  - description

  - services offered

  - base prices

  - verification badge (if verified)

- Request a quote for custom jobs

- Book a service with:

  - selected date

  - selected time

  - additional notes

- View booking history and status

- Receive status updates (pending, accepted, rejected, completed)



-----------------------------------

BUSINESS FEATURES

-----------------------------------

- Business registration and login

- Create and manage business profile:

  - business name

  - description

  - service area (city/region)

  - contact details

- Add, edit, and delete services:

  - title

  - description

  - base price

  - category

- View incoming booking requests

- Accept or reject bookings

- Manage job status (pending, in progress, completed)

- View earnings summary (basic dashboard)



-----------------------------------

BUSINESS VERIFICATION SYSTEM

-----------------------------------

Businesses must be verified before being fully active.



Verification requirements:

- Upload official documents relevant to their region:

  - business registration certificate

  - ID document

  - trade license (if applicable)

  - proof of address



Verification flow:

- Businesses submit documents

- Status = "pending verification"

- Admin reviews documents

- Admin can:

  - approve (verified badge appears)

  - reject (with reason)

- Only verified businesses can:

  - appear in search results

  - receive bookings



-----------------------------------

SUBSCRIPTION TIERS (MANDATORY)

-----------------------------------

Each business must have a subscription tier:



1. Free Tier:

   - Max 3 services

   - Not featured in search

   - Limited visibility



2. Basic Tier:

   - Max 10 services

   - Normal visibility



3. Pro Tier:

   - Unlimited services

   - Featured at top of search results

   - Highlighted profile



System logic:

- Prevent businesses from exceeding service limits

- Show upgrade prompts when limits are reached

- Store subscription data and expiry dates

- Allow admin to upgrade/downgrade businesses manually



-----------------------------------

ADMIN PANEL (IMPORTANT)

-----------------------------------

Admin dashboard must include:

- View all users (customers and businesses)

- View all businesses

- Approve or reject verification documents

- Manage subscription tiers

- View all bookings

- Ban or suspend users

- View platform activity



-----------------------------------

DATABASE STRUCTURE

-----------------------------------

Include these tables:



- users

- businesses

- services

- bookings

- subscriptions

- verification_documents



Each table must be properly related (foreign keys).



-----------------------------------

UI / UX REQUIREMENTS

-----------------------------------

- Mobile-first design (very important)

- Clean modern UI similar to Uber Eats

- Card-based layout for services

- Simple navigation:

  - Home

  - Search

  - Bookings

  - Dashboard

- Use badges for:

  - Verified businesses

  - Subscription tiers



-----------------------------------

TECH STACK

-----------------------------------

- Frontend: React

- Backend: Supabase (authentication, database, storage)

- File upload: Supabase storage for verification documents



-----------------------------------

EXTRA LOGIC

-----------------------------------

- Only verified businesses are visible to customers

- Featured businesses (Pro tier) appear first in search results

- Bookings must connect customer to business and service

- Ensure secure authentication and role-based access



-----------------------------------

GOAL

-----------------------------------

The app should function like a full marketplace similar to Uber Eats or TaskRabbit, but specifically for skilled trades, with a strong focus on trust through business verification and a subscription-based model.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://trade2connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3dc9e0cb-9b2e-40fb-9860-e68efcaad0ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
