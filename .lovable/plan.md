## Fix: Back button on Non-Realtor user detail page

### Problem
In `AdminUserDetailPage`, the back button always reads **"Back to Admin Dashboard"** and links to `/admin`. When an admin views a **non-realtor** user profile, returning to the general dashboard loses the `non-realtors` tab context.

### Solution
Update the back link in `src/pages/admin/AdminUserDetailPage.tsx` to be role-aware:

- **Admin users** (`userRole === "admin"`): Keep "Back to Admin Dashboard" → `/admin?tab=admins`
- **Non-realtor users** (`userRole !== "admin"`): Show "Back to Non-Realtors" → `/admin?tab=non-realtors`

### Files changed
- `src/pages/admin/AdminUserDetailPage.tsx` (single conditional on the existing `<Link>`)