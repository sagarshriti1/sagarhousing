# Plan: Reuse profile data for Become Featured

The Promote tab should never ask for fields the user already provided at signup or on Personal Info. Payment is the only interaction; on success the realtor row is created (if needed) and marked featured using existing data.

## Changes (`src/pages/ProfilePage.tsx`)

1. **No extra input fields** in the Promote tab. The only inputs come from `SimulatedPaymentForm` (card details) when payment is required.
2. **Reuse existing data** when creating the realtor row inside `handleBecomeFeatured` (only when `realtor` is null):
   - `name` ← `profile.display_name` || `user.email`
   - `email` ← `profile.email` || `user.email`
   - `phone` ← `profile.phone`
   - `street_address` ← `profile.street_address`
   - `city` / `district` ← parsed from `profile.location` (`"City, District"`) using the same `parseLocation` helper already in this file
   - `state` ← `"Nepal"`
   - `payment_status: "paid"`, `is_featured: true`
   - If `realtor` exists, only `UPDATE realtors SET is_featured = true`.
3. **Payment handles everything**:
   - Bypass active (`featuredFree`) → single button "Become Featured (Free)" calls `handleBecomeFeatured` directly.
   - Otherwise → `SimulatedPaymentForm` with `amount={FEATURED_FEE}`, `onPaymentComplete={handleBecomeFeatured}`. No redirect to Realtor Dashboard.
4. Keep status row (name + Featured/Not Featured badge) and "Already Featured ✓" disabled state. Remove the "Activate from Realtor Dashboard" message.
5. Log payment with `FEATURED_REALTOR` key as today.

## Out of scope
- Personal Info tab unchanged (still where the user maintains display_name, phone, location, etc.).
- No DB schema changes.
