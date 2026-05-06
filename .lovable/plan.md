## Limit non-realtors to 2 listings

**Goal:** Prevent users with role `user` (non-realtors, non-admins) from creating more than 2 property listings. Show a clear message when blocked.

### Behavior

- Limit applies to role `user` only. `realtor` and `admin` are unrestricted.
- Counts all rows in `user_properties` for that `user_id` (any status), so deleting a listing frees a slot.
- Limit = 2.

### UI changes (`src/pages/ListPropertyPage.tsx`)

- On mount (create mode only, non-realtor/non-admin), query `count` of `user_properties` for current `user.id`.
- If count ≥ 2:
  - Show a blocking `Alert` (destructive) at top of the form: *"You've reached the 2-listing limit for standard accounts. Delete an existing listing or upgrade to a Realtor account to post more."*
  - Disable the Submit button.
- On submit, re-check count as a safeguard; if ≥ 2, toast the same message and abort.

### UI changes (`src/pages/MyListingsPage.tsx`)

- For non-realtor/non-admin users, show a small helper line near the "Add Property" button: *"Standard accounts can post up to 2 listings (X/2 used)."*
- When at limit, the "Add Property" button becomes disabled with a tooltip explaining why; otherwise unchanged.

### Out of scope

- No DB schema changes / no DB-level enforcement (kept client-side per the UI-focused request).
- No changes to realtor flow, payment flow, or admin behavior.
