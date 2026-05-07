## Goal
In Admin → Feature Flags & Pricing, the "Save" button should be disabled (greyed out) when the form values match what's saved in the database, and become active as soon as the admin changes anything — including toggling the "Free Promotion (Bypass Payment)" switch on or off.

## Change
Single-file update to `src/components/admin/FeaturesTab.tsx`:

1. Add an `isDirty(flag, draft)` helper that compares all four editable fields:
   - `fee` (numeric equality)
   - `bypass_payment` (boolean — covers the toggle on/off case)
   - `promo_label` (normalize: trim + treat `""` as `null` so empty vs null doesn't falsely register as dirty)
   - `promo_ends_at` (compare ISO strings, both nullable)

2. In the render loop, compute `const dirty = isDirty(flag, draft);` per card.

3. Update the Save button:
   ```tsx
   <Button
     onClick={() => save(flag.id)}
     disabled={saving === flag.id || !dirty}
     ...
   >
   ```

4. After a successful save, `load()` already refreshes both `flags` and `drafts` from the DB, so the button naturally returns to disabled until the next edit.

## Behavior summary
- Page load → Save disabled.
- Change fee, edit promo label, pick/clear promo end date, OR flip the bypass toggle → Save enabled.
- Revert manually to original values → Save disabled again.
- After successful save → Save disabled until next change.

## Out of scope
- No DB, schema, or business-logic changes.
- No styling changes beyond shadcn's built-in `disabled` greyed-out state.
- Other admin tabs/forms unchanged.