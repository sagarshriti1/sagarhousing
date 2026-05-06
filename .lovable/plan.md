## Goal

On the Admin → Realtor detail page, show the realtor's listed properties with a link into each property's detail page (where its payment history already lives). Keep the realtor-wide payment history section. Add pagination to the payment history list everywhere it's used. Restrict per-property/per-realtor payment history visibility to admins and the owner of the listing only.

## Changes

### 1. Add a "Listed Properties" section on `AdminRealtorDetailPage`
- Query `user_properties` where `user_id = realtor.user_id` (only if realtor has a linked user_id).
- Render a compact table/list: title, city/district, listing type, price, status, expiration date.
- Each row links to `/admin/property/:id` (existing `AdminPropertyDetailPage`, which already shows that property's payment history).
- Empty state: "This realtor has no listed properties yet."
- Show below the realtor info card, above the realtor-wide "Payment History" section.

### 2. Pagination in `PaymentHistoryList` (component-level, applies everywhere)
- Default page size: **20**, with a `pageSize?: number` prop override.
- Use Supabase `.range(from, to)` and `count: 'exact'` for total.
- Render shadcn `Pagination` (Prev / page numbers with ellipsis / Next) below the list, hidden when total ≤ page size.
- Reset to page 1 when filter props (`userId`, `relatedType`, `relatedId`) change.
- Loading state preserved during page changes.

### 3. Visibility rules for payment history (admin or owner only)
Already enforced for `userId`-scoped lists by RLS. For `relatedType` + `relatedId` queries, currently the consumers (`AdminPropertyDetailPage`, `AdminRealtorDetailPage`, `RealtorDashboard`, `ListPropertyPage`, `RealtorFormDialog`) are gated, but to be defensive add an internal guard inside `PaymentHistoryList`:
- If `relatedType`/`relatedId` is provided without `userId`, the component fetches the current user's role; if not admin and not the owner of the related realtor/property, render nothing (or an "Access restricted" line).
- Owner check: for `related_type="property"` look up `user_properties.user_id`; for `related_type="realtor"` look up `realtors.user_id`. Compare to `auth.uid()`.

This guarantees no other logged-in users see the payment history even if a future page exposes the component.

### 4. No DB migration required
RLS on `payment_history` already restricts SELECT to the row's `user_id` or admins, so even bypassing the UI guard returns no rows for non-owners/non-admins.

## Files affected
- `src/components/PaymentHistoryList.tsx` — pagination + visibility guard.
- `src/pages/admin/AdminRealtorDetailPage.tsx` — new "Listed Properties" section linking to `/admin/property/:id`.

## Out of scope
- Changing the existing realtor-wide payment history section.
- Changing the Properties tab or My Listings flows (they already navigate to detail pages where payment history is shown).
- Schema/RLS changes.
