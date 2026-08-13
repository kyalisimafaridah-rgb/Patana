# Patana (Hybrid MVP)

**Where buyers and sellers meet.**

Verified marketplace directory — WhatsApp-native.

This package is the **hybrid MVP**: full schema + working core loop, with complex features deferred.

## Working end-to-end loop

1. Seller applies at `/apply`
2. Admin logs in at `/admin/login` → approves → gets **activation key**
3. Seller activates at `/activate` → lands on **Seller Dashboard**
4. Seller adds a listing
5. Listing appears on homepage / category / search
6. Buyer opens product → taps **Chat on WhatsApp** → pre-filled message opens

## Debug fixes (applied)

- Fixed React Router: `/seller/login` was captured by `/seller/:id`
- Fixed `dotenv` loading after JWT module (secret was ignored)
- Fixed CORS for multiple frontend origins
- Flexible WhatsApp number match on seller login (`07...` vs `+2567...`)
- Uganda-friendly `wa.me` links (auto-prefix 256)
- Block duplicate applications / sellers on same WhatsApp
- Guard admin approve if seller already exists
- Offline sellers hidden from public profile
- Multer upload error messages returned cleanly
- Fixed `seed-admin.ts` ReferenceError (`dotenv.config()` without import)
- Application status lookup now uppercases reference (`pat-xxx` → `PAT-XXX`)
- Soft phone match on application submit + admin approve (prevents `07…` / `+2567…` duplicates)

## Security hardening (applied)

| Issue | Fix |
|-------|-----|
| Seller login without OTP | OTP flow: `request-otp` → `verify-otp` (legacy seller-login disabled 410) |
| Activation key in approve response | Approve does not return key; `POST /admin/keys/reveal` |
| Spoofable reviews | Reviews require signed `reviewToken` bound to transaction + buyer |
| Self-review trust gaming | Blocked if buyer WhatsApp matches seller |
| Global-only rate limit | Extra limiters: auth, OTP, activate, tap, review, application |
| Weak Math.random keys | `crypto.randomInt` + collision retry |
| Activation ref/key casing | Trim + uppercase on activate |
| Blacklist gaps | Checks whatsapp, primaryPhone, national ID (+ normalized digits) |
| Biased `.sort(Math.random)` | Fisher–Yates `shuffled()` |
| View-count inflation | 30-min debounce per IP+product |
| Tap spam | `tapLimiter` 10/min per IP |
| Weak JWT_SECRET | Production process exits if secret missing/weak |

**Note:** OTP is stored and verified server-side. Delivery via WhatsApp Business API is still a TODO — in development the OTP is returned as `devOtp` and logged to the server console.

## Deploy notes (Render + Supabase)

1. Run `prisma db push` (or migrate) against Supabase before first API boot.
2. Set `JWT_SECRET` to a long random string (32+ chars) — production exits without it.
3. Set `FRONTEND_URL` to your static site origin (CORS).
4. Set `VITE_API_URL` to `https://your-api.onrender.com/api/v1` **at build time** for the web service.
5. API build runs `prisma generate` automatically.
6. `trust proxy` is enabled for correct rate limiting behind Render.

## Quick start

```bash
unzip patana-mvp.zip && cd patana
pnpm install

cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL + DIRECT_URL from Supabase
# Set JWT_SECRET to a long random string

cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
npx prisma db push --schema=../../prisma/schema.prisma
npx tsx src/scripts/seed.ts          # admin + categories

cd ../..
pnpm dev:api    # http://localhost:3001
pnpm dev:web    # http://localhost:5173
```

Default admin (from seed):
- Email: `admin@patana.ug`
- Password: `ChangeMeImmediately123!`  
**Change this immediately.**

## Test checklist

### Phase 1 – Foundation
- [ ] `pnpm` install + prisma push + seed succeed
- [ ] Admin can log in at `/admin/login`
- [ ] Submit application at `/apply` → get reference number
- [ ] Admin sees application → Approve → copy activation key from alert
- [ ] `/activate` with reference + key → redirects to seller dashboard
- [ ] Seller appears as ACTIVE

### Marketplace
- [ ] Seller can **Add Listing** from dashboard
- [ ] Listing shows on homepage “Recently Added”
- [ ] Listing shows under its category
- [ ] Product page loads
- [ ] **Chat on WhatsApp** opens with correct pre-filled message
- [ ] Search finds the product by name

### Seller return login
- [ ] `/seller/login` with reference + WhatsApp number works
- [ ] Seller can mark listing sold / out of stock

## Photo upload

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Copy Cloud name, API Key, API Secret into `apps/api/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
3. Restart the API. Sellers can then pick images in **Add Listing**.

Without Cloudinary, listings still work — just without uploaded photos.

## What is deferred (on purpose)
- WhatsApp Business API OTP
- Cloudinary photo uploads (paste URL for now)
- Full trust score / complaints system
- Renewals + MoMo payments
- Featured listings, Near You, advanced admin modules

## Stack
- Frontend: React + Vite + Tailwind
- Backend: Node + Express + Prisma
- DB: Supabase PostgreSQL
- Hosting: Render (see `render.yaml`)

## Author
Based on Patana Developer Specification v1.0 by Shafic Kiryowa (Kampala).
