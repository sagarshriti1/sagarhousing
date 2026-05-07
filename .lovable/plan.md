## Plan

### 1. Activate / Deactivate toggle on the edit page

In `src/pages/ListPropertyPage.tsx`, when `isEdit` is true, show a status control near the top of the form (under the page header, above the main fields).

- Fetch the current `status` and `expiration_date` from `user_properties` in the existing edit-load effect and store in local state (`currentStatus`, `expirationDate`).
- Render a compact card with:
  - A status badge ("Active" / "Inactive") and, if active, "Active until {date}".
  - A `Switch` labeled "Active" / "Inactive".
- Behavior on toggle:
  - **Active → Inactive (Deactivate):** open a small confirm dialog ("Deactivate this listing? It will be hidden from buyers."). On confirm, `update({ status: 'pending' })` on `user_properties`, toast success, update local state. `expiration_date` is preserved.
  - **Inactive → Active (Reactivate):**
    - If `expiration_date` exists AND `> now()` → free reactivation: `update({ status: 'active' })`, toast "Listing reactivated".
    - Else (no expiration or expired) → open the existing `SimulatedPaymentForm` dialog (mirrors `MyListingsPage` pay-to-activate flow), and on payment complete set status active, set `payment_date`/`expiration_date` (+1 month), and `logPayment(...)`. If the relevant feature flag is free, skip charge and just activate.
- Admins keep the ability to toggle freely (no payment required); reuse the existing admin-bypass behavior already present in this page.

The toggle is **only** shown in edit mode (not on create), and only to the listing owner or an admin.

### 2. Make the delete-blocked message a centered modal

Currently in `src/pages/MyListingsPage.tsx`, clicking Delete on an active listing shows a sonner toast in the corner. Replace it with a centered `AlertDialog`:

- Add state `blockedDeleteOpen: boolean`.
- In `handleDelete`, if `listing.status === "active"`, set `blockedDeleteOpen = true` instead of calling `toast.error(...)`.
- Render a new `AlertDialog`:
  - Title: **"Cannot delete active listing"**
  - Description: **"Active listings cannot be deleted. Please change the status to Inactive before deleting."**
  - Single action button: **"Got it"** (closes the dialog). No destructive action button.
- The existing confirm-delete `AlertDialog` for inactive/sold/rented listings remains unchanged.

### Out of scope

- No DB schema or RLS changes.
- No changes to admin pages (`AdminPropertyDetailPage`, etc.) — they already have status controls.
- No changes to the existing pending-listing "Reactivate" / "Pay to Activate" buttons on the My Listings cards; the toggle on the edit page is an additional entry point.
