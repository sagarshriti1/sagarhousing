## Goal

Add a "Listed Properties" section to the admin **User Detail** page (the Non-Realtor view), mirroring exactly what was implemented on the Realtor Detail page.

## Changes

**File:** `src/pages/admin/AdminUserDetailPage.tsx`

1. Fetch `user_properties` for the viewed `userId` alongside the existing profile + role load:
   - `select id, title, city, district, listing_type, price, status, expiration_date`
   - `.eq("user_id", userId)` ordered by `created_at desc`
   - Store in a `properties` state array.

2. Insert a new **Listed Properties** card between the profile card and the Payment History card, identical to the one in `AdminRealtorDetailPage`:
   - Header: `<Home /> Listed Properties ({properties.length})`
   - If empty: `"No listings yet."`
   - Otherwise: list with title, `city, district • For Rent/Sale • Rs. price`, status badge, chevron — each row a button navigating to `/admin/property/{id}` (same link target as realtor view).

3. Show this card for **all non-admin users** (regular users + realtors). For admin profiles it is hidden, matching the existing Payment History rule. (Realtors viewed via this page already see their listings here too — consistent, since the realtor detail page uses its own resolution path.)

4. Reuse `Home`, `ChevronRight` icons from `lucide-react` and the existing `Badge` component — no new dependencies, no new components.

## Out of scope

- No DB/schema changes.
- No changes to `PaymentHistoryList` or the realtor page.
- No new shared component extraction (the JSX block is small; duplicating keeps the change minimal as requested — happy to extract to a `<UserListedProperties />` component in a follow-up if preferred).
