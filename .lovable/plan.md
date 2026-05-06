## Reorder Subscription & Payment section in Admin Realtor Edit Dialog

### Problem
In the admin realtor edit/create dialog (`RealtorFormDialog.tsx`), the **Subscription & Payment** section (payment status, bypass toggle, simulated payment form) appears above the **Start Date / Expiration Date** fields. The user wants Subscription & Payment to appear *below* the date fields.

### Solution
Swap the order of two blocks in `src/components/admin/RealtorFormDialog.tsx`:

1. Move the **Date Selection** grid (Start Date + Expiration Date pickers) above the `<Separator />` that precedes the Subscription & Payment section.
2. Move the **Subscription & Payment** block below the Date Selection block.

### Technical details
- File: `src/components/admin/RealtorFormDialog.tsx`
- Lines involved: ~277–430 (the Subscription & Payment section and Date Selection section)
- No logic changes — purely a layout/reordering change within the JSX.

### Out of scope
- No changes to data, validation, or save behavior.
- No changes to other admin pages.