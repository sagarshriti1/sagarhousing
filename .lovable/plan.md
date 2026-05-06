## Goal

Make "Featured Realtor" behave like the realtor subscription: a paid 1-month term with its own start/end dates, an active/expired state, and a renewal flow. Today `is_featured` is a boolean toggle with a single payment and no expiry — featured realtors stay featured forever until manually unfeatured.

## Database changes

Add to `public.realtors`:
- `featured_start_date date` (nullable)
- `featured_expiration_date date` (nullable)
- `featured_payment_status text not null default 'none'` — values: `none | paid | bypassed | promotion | expired`
- `featured_payment_bypassed boolean not null default false`
- `featured_bypass_reason text` (nullable, mirrors how realtor bypass is captured)

`is_featured` stays as the live "currently featured" flag. Source of truth for whether a realtor appears as featured remains `is_featured = true`, but it is now driven by payment + expiration:

- On successful featured payment/renewal/bypass: set `is_featured = true`, set `featured_start_date = today`, `featured_expiration_date = today + 1 month`, `featured_payment_status` accordingly.
- A scheduled check (client-side on read, plus a guard in `AuthContext`/admin views — same pattern as `realtorExpired`) flips `is_featured` to `false` and `featured_payment_status` to `expired` when `featured_expiration_date < now()`. We'll do this lazily on relevant reads (cheap, matches the existing realtor-expiration approach — no cron needed).

No new table; `payment_history` already supports `featured_realtor` via `service_key`.

## Frontend changes

### 1. `src/hooks/useFeatureFlag.ts`
No change. `FEATURE_KEYS.FEATURED_REALTOR` already exists.

### 2. `src/pages/ProfilePage.tsx` — Promote tab
- Load `featured_start_date`, `featured_expiration_date`, `featured_payment_status` in addition to `is_featured`.
- Compute `featuredExpired = expiration_date && new Date(expiration_date) < now`.
- States shown in the Promote card:
  - **Active**: show "Featured ⭐ — active until <date>", disabled "Already Featured" button.
  - **Not featured / expired**: show payment form (or free button if promo). On success → call `handleBecomeFeatured` which now also writes `featured_start_date`, `featured_expiration_date` (today + 1 month), and `featured_payment_status`.
  - **Expired**: extra banner "Your featured placement expired on <date>. Renew to be boosted again." with a Renew button (same payment flow).
- `logPayment` keeps using `service_key: featured_realtor`, now also passes `expiration_date`.

### 3. `src/components/admin/RealtorFormDialog.tsx`
Add a **Featured Subscription** sub-section (mirrors the existing Subscription & Payment block):
- `is_featured` switch (kept; auto-toggled by date logic but admin can force).
- Start date + Expiration date pickers (default: today / today + 1 month, same `addMonths` helper).
- Featured payment status select (`none | paid | bypassed | promotion | expired`).
- "Bypass featured payment" switch + reason textarea.
- Simulated payment form for the featured fee when not bypassed and status ≠ paid.
- Validation: if `is_featured` is on, both featured dates required; start < expiration.
- On save: writes the new columns; logs a `featured_realtor` payment_history entry when payment is processed/bypassed (same pattern as realtor signup/renewal).

Add to `RealtorFormData` interface: `featured_start_date`, `featured_expiration_date`, `featured_payment_status`, `featured_payment_bypassed`, `featured_bypass_reason`.

### 4. `src/pages/AdminDashboard.tsx`
- `toggleFeatured`: when turning ON, also set `featured_start_date = today`, `featured_expiration_date = today + 1 month`, `featured_payment_status = 'bypassed'` (admin manual feature is treated as a bypass) and log a `payment_history` entry with `status: 'bypassed'`. When turning OFF, clear `featured_expiration_date` (or set status `none`).
- Include the new columns in the realtor select queries.

### 5. `src/pages/admin/AdminRealtorDetailPage.tsx`
- Read & pass through the new featured_* fields to `RealtorFormDialog`.
- Show featured expiration in the realtor summary card with an Active/Expired badge (parallel to the existing subscription badge).

### 6. `src/pages/RealtorDashboard.tsx`
- Add a "Featured Status" card next to "Subscription Status": shows active/expired, expiration date, and a Renew Featured button (links to `/profile?tab=promote`) when expired or not featured.

### 7. Directory pages — `FindRealtors.tsx`, `RealtorsPage.tsx`, `SavedRealtorsPage.tsx`, `RealtorProfilePage.tsx`
- No structural change. They already key off `is_featured`. Because the lazy expiration sweep flips `is_featured` to false when expired, these will naturally stop showing the star.
- Add a one-line client-side guard on read: if `featured_expiration_date < now` and `is_featured` true, treat as not featured for display (safety net before the row is updated).

### 8. `src/components/RealtorExpiredBanner.tsx`
No change — it covers the *subscription*, not featured. Featured expiry is non-blocking (realtor still works, just loses the star).

### 9. Optional small helper
Add `src/lib/featuredStatus.ts` with `isFeaturedActive(realtor)` and `markFeaturedExpiredIfNeeded(realtorId, expirationDate)` so the lazy sweep is consistent across pages.

## Out of scope
- No cron / edge function — lazy expiration only, matching the existing realtor-subscription pattern.
- No new payment provider — keeps `SimulatedPaymentForm`.
- No changes to `feature_flags` schema; the existing `featured_realtor` flag (fee, promo) still drives pricing.

## Technical summary

- New columns on `realtors`: `featured_start_date`, `featured_expiration_date`, `featured_payment_status`, `featured_payment_bypassed`, `featured_bypass_reason`.
- Featured term = 1 month, computed via existing `addMonths` helper.
- `is_featured` becomes a derived/maintained flag: set true on paid/bypassed/promotion activation, set false lazily when expired.
- Payment history entries with `service_key = 'featured_realtor'` get `expiration_date` populated for both initial activation and renewals.
- All four touch points (ProfilePage promote tab, RealtorDashboard, RealtorFormDialog, AdminDashboard quick toggle) drive the same write pattern.
