## Add Print Payment History with Date Range filtering

### Approach
Embed the print feature directly inside the existing `PaymentHistoryList` component. Every caller (Admin Dashboard, Admin User/Realtor/Property detail pages, Profile, Realtor Dashboard, ListPropertyPage) automatically gets it — no per-page wiring, fully consistent UI as required.

Permissions are already enforced by the component's existing `allowed` guard plus Supabase RLS:
- Admin sees everything.
- Owners see only their own records (`auth.uid() = user_id`, or owner of the related property/realtor).

### UI changes (inside `PaymentHistoryList.tsx`)

1. **Date Range Picker bar** at the top:
   - Two shadcn `Popover` + `Calendar` triggers ("From" / "To").
   - "Clear" button to reset.
   - "Print All" button (uses `react-to-print`) — prints the currently filtered set.
2. **Per-row Print icon button** (`Printer` from lucide) — prints a single receipt.
3. Date filter is applied **client-side** to already-fetched records for the selected range; when a range is set, we also re-query without pagination (cap 1000) so "Print All" reflects the full filtered range, not just the current page.

### Print template

New file `src/components/PaymentReceipt.tsx`:
- Forward-ref'd component, hidden via `className="hidden print:block"` (or rendered into an off-screen div used by `react-to-print`).
- Layout: company logo + name (Sagar Housing) header, receipt title, generation timestamp, optional date range, then for each record a clean block with:
  - Transaction ID (`r.id`)
  - Date (`created_at`)
  - Service label
  - Property/Realtor reference + address (when `related_type=property`, fetch `address, city, district` lazily once when printing)
  - Amount, Status, Promo label
  - Processed by, Active until, Notes
- Footer with page generation note.
- Tailwind `print:` utilities used for layout; global `@media print` rule in `index.css` to hide site chrome (`header, footer, nav, [data-print-hide]`) and remove backgrounds.

### Library

Install `react-to-print` and use its `useReactToPrint` hook. Single `contentRef` shared by Print All; for single-row printing we set a small state (`printingId`) so the template renders just that row, then trigger print.

### Files

- **Modify** `src/components/PaymentHistoryList.tsx` — add date range state, filtering, print buttons, integrate `useReactToPrint`.
- **Create** `src/components/PaymentReceipt.tsx` — printable template (forwardRef).
- **Modify** `src/index.css` — add `@media print` rules to hide nav/footer/buttons and reset backgrounds.
- **Install** `react-to-print`.

### Out of scope

- No DB schema changes (existing RLS already covers permissions).
- No standalone DateRangePicker shadcn primitive added — using two Popover+Calendar inline (matches existing project style; can be extracted later if reused elsewhere).
- Logo: reuse the text/lockup currently used in `Header`; if the project has an image asset later we swap it in.