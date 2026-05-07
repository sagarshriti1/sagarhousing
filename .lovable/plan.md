## Plan

### 1. Auto-select numeric input values on focus

For all numeric inputs in `src/pages/ListPropertyPage.tsx` (Price, Bedrooms, Bathrooms, Square Meter, Year Built, Lot Size, Maintenance Fee, Bike Parking, Car Parking, Stories), add an `onFocus` handler that calls `e.target.select()`. When a user clicks/tabs into the field, the existing value (e.g. `0`) is auto-highlighted so typing replaces it instantly — no manual delete needed.

Defaults stay as `0`; submission/validation logic is unchanged.

### 2. Lot Size split input (value + unit dropdown)

Convert the current single `Lot Size (Aana)` input into a split control:

- **Left**: numeric input bound to `form.lot_size` (with the same auto-select-on-focus behavior as task 1).
- **Right**: a `Select` dropdown bound to a new `form.lot_unit` field.
- **Unit options (alphabetical):** `Aana`, `Bigha`, `Daam`, `Dhur`, `Katha`, `Paisa`, `Ropani`, `Sq. Ft.`
- Default unit: `Aana` (matches today's behavior).
- Label updates to just `Lot Size` (the unit now lives in the dropdown).

**Persistence (DB change required):** add a `lot_unit TEXT` column (nullable, default `'Aana'`) to `public.user_properties`. The form will read/write it alongside `lot_size`. Existing rows keep `Aana` as their unit.

No other pages currently read `lot_size`, so display surfaces don't need updates as part of this task. (If you'd like the unit shown on PropertyCard / PropertyDetail, say so and I'll add it.)

### Files touched

- `src/pages/ListPropertyPage.tsx` — focus-select handler on numeric inputs; replace Lot Size input with split input + unit dropdown; include `lot_unit` in form state, fetch (edit mode), and submit payload.
- DB migration — add `lot_unit` column to `user_properties`.

### Out of scope

- No changes to filters, listings display, or unit-conversion math.
- No changes to validation rules or business logic beyond persisting the unit.