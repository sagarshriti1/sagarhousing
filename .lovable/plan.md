## Remove duplicate Payment History tab from My Profile

The Payment History tab on `/profile` overlaps with payment views already shown elsewhere:
- Realtors see realtor-related payments in **Realtor Dashboard**
- Property owners see per-listing payments from **My Listings → Receipt** dialog
- Admins see full per-user history in the **Admin** views

### Changes

1. **`src/pages/ProfilePage.tsx`**
   - Remove the `payments` `TabsTrigger` (line 238).
   - Remove the entire `<TabsContent value="payments">` block (lines 399–408).
   - Remove the now-unused `PaymentHistoryList` import and `Receipt` icon import (if not used elsewhere in the file).

No other files change. No DB or routing changes.

### Note on why it existed
Earlier iterations added the tab as a single place for users to see their full account-wide payment history. Since you've consolidated payment views into the Realtor Dashboard (for realtors) and per-listing receipts (for property owners), the profile tab is redundant and will be removed.
