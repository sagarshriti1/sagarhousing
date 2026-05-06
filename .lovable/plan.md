## Confirm + disable-after-save for all Save buttons

Two behaviors added to every form Save button:

1. **Confirm before saving** — clicking Save opens an `AlertDialog` ("Are you sure you want to save these changes?") with Cancel / Confirm. The existing save handler runs only on Confirm.
2. **Disable after save** — once saved successfully, the Save button is greyed out (`disabled`) until the user edits any field again. Editing any tracked field re-enables it.

### Implementation pattern (per form)

- Add local state `const [dirty, setDirty] = useState(false)`.
- In every field `onChange` handler, call `setDirty(true)` (or wrap the existing setters).
- After the save handler succeeds, call `setDirty(false)`.
- Save trigger button: `<Button disabled={!dirty}>Save Changes</Button>`, wrapped in the confirmation `AlertDialog`.

### Buttons to update

1. `src/pages/ProfilePage.tsx` (line 339) — profile edit "Save Changes".
2. `src/pages/admin/AdminUserDetailPage.tsx` (line 287) — user edit "Save Changes".
3. `src/pages/AdminDashboard.tsx` (line 1173) — admin profile "Save Changes".
4. `src/components/admin/RealtorFormDialog.tsx` (line 425) — realtor "Save Changes" (keep "Create Realtor" always enabled in create mode; dirty-tracking applies only when editing).
5. `src/components/PaymentHistoryList.tsx` (line 278) — inline payment note "Save" (dirty = note text differs from original).

### Confirmation dialog snippet

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button disabled={!dirty}>Save Changes</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Save changes?</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to save these changes?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={async () => { await saveHandler(); setDirty(false); }}>
        Confirm
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Imports from `@/components/ui/alert-dialog`. No backend, validation, or data-shape changes.

### Out of scope

- Toggle-style saves (favorite heart, bookmark realtor) — these are instant toggles, not form saves.
