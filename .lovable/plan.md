## Plan

### Problem

`src/pages/MyListingsPage.tsx` uses the browser's native `window.confirm(...)` for the "Delete listing" action. In an embedded preview / iframe, the browser prefixes that dialog with `An embedded page at <domain> says…`, which looks broken and unprofessional. Every other delete action in the app already uses the styled in-app `AlertDialog` (admin pages use a `confirm({...})` helper from a confirm context).

### Fix

1. **Replace the native confirm in `MyListingsPage**` with a styled `AlertDialog` so it matches the rest of the app:
  - Add local state `deleteId: string | null`.
  - `handleDelete(id)` just opens the dialog (sets `deleteId`); the actual Supabase delete runs from the dialog's confirm action.
  - Render an `AlertDialog` at the bottom of the page with:
    - **Title:** `Delete listing?`
    - **Description:** `This will permanently remove this listing. This action cannot be undone.`
    - **Cancel:** `Cancel`
    - **Confirm (destructive):** `Delete`
2. **Standardize delete confirmation copy** across all admin delete dialogs so the wording is uniform and clean. Today the copy is mixed ("This cannot be undone." vs "This action cannot be undone.", "Permanently delete…" vs "Are you sure you want to delete…"). Normalize to:

  | Action                       | Title                         | Description                                                                      |
  | ---------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
  | Delete user                  | `Delete user account?`        | `This will permanently delete "<name>". This action cannot be undone.`           |
  | Delete realtor (single)      | `Delete realtor?`             | `This will permanently delete "<name>". This action cannot be undone.`           |
  | Delete realtors (bulk)       | `Delete selected realtors?`   | `This will permanently delete <N> realtor(s). This action cannot be undone.`     |
  | Delete property (single)     | `Delete property?`            | `This will permanently delete "<title>". This action cannot be undone.`          |
  | Delete properties (bulk)     | `Delete selected properties?` | `This will permanently delete <N> propert(y/ies). This action cannot be undone.` |
  | Delete listing (My Listings) | `Delete listing?`             | `This will permanently remove this listing. This action cannot be undone.`       |

   Files updated: `src/pages/AdminDashboard.tsx`, `src/pages/admin/AdminUserDetailPage.tsx`, `src/pages/admin/AdminRealtorDetailPage.tsx`, `src/pages/admin/AdminPropertyDetailPage.tsx`, `src/pages/MyListingsPage.tsx`.

### Out of scope

- No backend / RLS / DB changes.
- No new shared confirm component — the admin pages already share one; My Listings just gets a local `AlertDialog`.
- No styling overhaul of the existing dialog component.