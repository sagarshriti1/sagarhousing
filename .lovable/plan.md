# Plan: Switch "Promote Your Profile" tab to Become Featured

The current "Promote Your Profile" tab uses the realtor monthly subscription (`REALTOR_SIGNUP` / `REALTOR_RENEWAL`) flag. Replace its payment with the **`FEATURED_REALTOR`** flag, so paying here marks the realtor as `is_featured = true` (boosted in the directory).

## Changes (`src/pages/ProfilePage.tsx`)

1. Swap feature flag:
   - Use `useFeatureFlag(FEATURE_KEYS.FEATURED_REALTOR)` instead of `REALTOR_SIGNUP` for the tab.
   - Keep `REALTOR_SIGNUP` only if needed elsewhere (it isn't, after this change — remove it).
2. Extend `RealtorRow` to include `is_featured`. Fetch it in `fetchRealtor`.
3. Rewrite `handlePromotePayment` → `handleBecomeFeatured`:
   - Requires an existing realtor row (since featuring acts on a realtor profile). If none exists, show a message: "Activate your realtor profile from the Realtor Dashboard first." with a link to `/realtor-dashboard`. Do not create one here.
   - On payment success: `UPDATE realtors SET is_featured = true WHERE id = realtor.id`.
   - Log payment with `service_key: FEATURED_REALTOR`, `service_label: "Featured Realtor"`, `related_type: "realtor"`, `related_id`, `related_label: realtor.name`, `amount: featuredFee`, `status: free ? "promotion" : "paid"`, `promo_label`.
4. Update tab UI:
   - Title stays "Promote Your Profile".
   - Description: explains featuring boosts visibility for `Rs. {featuredFee}/month` (or shows promo label when free).
   - Status row: show a "Featured ⭐" / "Not Featured" badge based on `realtor.is_featured`.
   - Button: `SimulatedPaymentForm` (paid flow) or "Become Featured (Free)" when promo is active. If already featured, show a disabled "Already Featured ✓" state.

## Out of scope
- Realtor Dashboard, monthly subscription flow, and Payment History tab remain unchanged.
- No DB schema changes; `is_featured` and the `featured_realtor` flag already exist.
