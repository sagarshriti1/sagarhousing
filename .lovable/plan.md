## Problem

Admins can create a realtor profile without a linked user account (`realtors.user_id` is null). If that person later signs up and posts listings, those properties live under their new `auth.users` id and never connect back to the admin-created realtor row — so the realtor detail page shows "No linked user account."

## Recommended approach: auto-link by email + manual admin link

Combine two mechanisms so the realtor → properties relationship "just works" in both directions:

### A. Auto-link on signup (the main fix)
When a new user signs up, if their email matches an existing `realtors.email` that has no `user_id`, attach that user's id to the realtor row. This way an admin-created realtor profile becomes "claimed" automatically the moment the realtor signs up — no manual step, no broken state.

Implementation: extend the existing `handle_new_user` trigger (or add a sibling `handle_new_user_realtor_link` trigger) on `auth.users` insert:

```sql
UPDATE public.realtors
   SET user_id = NEW.id, updated_at = now()
 WHERE user_id IS NULL
   AND lower(email) = lower(NEW.email);
```

Case-insensitive match, only fills empty `user_id`, never overwrites an existing link.

### B. Email-based fallback in the UI (covers the gap before they sign up / for legacy data)
On the admin realtor detail page, when `realtor.user_id` is null but `realtor.email` is set:
1. Look up `profiles` by that email.
2. If a profile is found, use its `user_id` to fetch `user_properties` (and show a small "Auto-matched by email" hint).
3. If none found, show a friendly empty state: "This realtor hasn't signed up yet. Once they create an account with **{email}**, their listings will appear here automatically."

### C. Manual "Link to user account" admin action (escape hatch)
Add a button on the realtor detail page that opens a small dialog where the admin can:
- Search `profiles` by email or name
- Pick a user → set `realtors.user_id`
Useful when emails don't match (typo, different signup email).

This action also becomes the documented way to *change* the link if needed.

## Why this combo

- **No data model change required.** `realtors.user_id` already exists.
- **Self-healing.** Admin can pre-create realtor profiles, and they become fully linked without admin intervention once the realtor signs up.
- **Resilient.** Email fallback in UI bridges the gap for accounts created before the trigger existed.
- **Manual override** handles the edge cases (mismatched emails) without code changes later.

## Files affected

- **Migration**: add the auto-link trigger on `auth.users` (or extend `handle_new_user`).
- `src/pages/admin/AdminRealtorDetailPage.tsx`:
  - Resolve effective `userIdForProperties` = `realtor.user_id ?? (profile lookup by realtor.email)?.user_id`.
  - Replace the "No linked user account" message with the friendlier email-pending message.
  - Add **Link User** button → dialog with profile search → updates `realtors.user_id`.
- (Optional) Same email-fallback resolution on `AdminUserDetailPage` / `RealtorDashboard` if relevant — out of scope unless you want it.

## Out of scope

- Backfilling existing realtor rows whose linked user already exists under a matching email — happy to add a one-shot SQL backfill if you want.
- Changing `payment_history` linkage.
