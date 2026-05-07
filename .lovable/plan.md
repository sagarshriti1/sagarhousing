## Plan

Make reactivation of a deactivated (`pending`) listing free when it still has time left in its paid period. Only listings whose paid period has expired are charged.

### Rule

A listing is "still within its active period" if `expiration_date` exists AND `new Date(expiration_date) > now`.

| State | Expiration | Reactivate action | Charge? |
|---|---|---|---|
| `pending` | future date | **Reactivate** (free, just flip status) | No |
| `pending` | past / null | **Pay to Activate** (existing flow) | Yes (or free promo if flag is free) |
| `active` (expired) | past | **Renew** (existing flow) | Yes (or free promo) |
| `active` (valid) | future | "Active until …" label | — |

### Changes — `src/pages/MyListingsPage.tsx`

1. **New handler `handleReactivate(listing)`**:
   - `update({ status: 'active' })` on `user_properties` for that id.
   - On success, update local state and toast `"Listing reactivated"`.
   - **Do not** call `logPayment` and **do not** change `payment_date` / `expiration_date` (they were already paid for and still valid).

2. **Update the action-cell logic (around line 306)** for `status === "pending"`:
   - Compute `withinActivePeriod = exp && new Date(exp) > new Date()`.
   - If `withinActivePeriod`: render a green "Reactivate" button that calls `handleReactivate(listing)` (icon: `Power` or reuse a check icon).
   - Else: render the existing "Pay Rs. X to Activate" / "Activate Free 🎉" button as today.

3. No change to the expired-active "Renew" branch — it already correctly charges.
4. No change to `handleDeactivate` (it already preserves `expiration_date`, which is what makes free reactivation possible).

### Out of scope

- No DB schema or RLS changes.
- No admin-side changes; admins can already toggle status freely.
- No change to the realtor-inactive gate (separate concern).