## Goal
On the Admin Dashboard's **Admins** tab, clicking an admin row should open the user detail page that shows only the admin's profile info — no Payment History section.

## Change
**File:** `src/pages/admin/AdminUserDetailPage.tsx`

Conditionally hide the Payment History card when the viewed user has the `admin` role. Realtor and regular user detail views remain unchanged (they still show payment history).

```tsx
{userRole !== "admin" && (
  <Card>
    <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
    <CardContent>
      <PaymentHistoryList userId={profile.user_id} canEditNotes compact />
    </CardContent>
  </Card>
)}
```

Also drop the now-unused `PaymentHistoryList` import path? No — still used for non-admin users, keep it.

## Out of scope
- Realtors tab and Properties tab detail pages (unchanged).
- Routing, edit dialog, reset password, activate/deactivate actions (unchanged).