# Plan: Realtor Dashboard cleanup + move Subscription to Profile

## 1. Realtor Dashboard (`src/pages/RealtorDashboard.tsx`)
- Remove the entire "Create Your Realtor Profile" / "Edit Profile" form Card (the big form with name, email, phone, photo, bio, specialties, district, etc.) and all related state and handlers that exist solely for that form: `formData`, `newSpecialty`, `isCreating`, `uploading`, `fileInputRef`, `addSpecialty`, `removeSpecialty`, `handlePhotoUpload`, `saveProfile`, and the `NEPAL_CITIES`/`district` imports if no longer used.
- Remove the inline Subscription Payment card (the one shown when `isCreating` with `SimulatedPaymentForm` / free-promo activate button) — it moves to My Profile.
- Keep: Subscription Status card and Payment History card.
- If no realtor row exists yet, show a short message pointing the user to "My Profile → Promote Your Profile" to activate.

## 2. My Profile (`src/pages/ProfilePage.tsx`)
- Add a new tab labeled **"Promote Your Profile"** (icon: `CreditCard`), visible only when the signed-in user has `role === 'realtor'` (read from `useAuth`).
- Tab content = a card titled **"Promote Your Profile"** containing the subscription payment UI moved out of RealtorDashboard:
  - If free promo flag active: "Activate Profile (Free)" button.
  - Otherwise: `SimulatedPaymentForm` for the monthly fee.
  - On success: same `handlePaymentComplete` logic — create or update the `realtors` row (insert minimal record with `user_id`, `name = profile.display_name`, `payment_status='paid'`, `start_date`, `expiration_date` one month out) and call `logPayment`. If a realtor row already exists, just renew (update dates + status).
- Show current subscription state inline (Active until / Expired badge) so the user knows the status without going to the dashboard.

## Technical notes
- Reuse `useFeatureFlag(FEATURE_KEYS.REALTOR_SIGNUP)`, `SimulatedPaymentForm`, `logPayment`, and the realtor fetch by `user_id` pattern already in `RealtorDashboard`.
- Keep `PaymentHistoryList` on both Realtor Dashboard (scoped to realtor) and Profile page (scoped to user) as today.
- No DB schema changes. No new routes.
