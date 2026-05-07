## Goal

For every form in the app, when the user clicks Save/Submit and required fields are missing or invalid, show **inline red error messages directly under each offending field** instead of (or in addition to) a single generic toast. Each error must name what is required (e.g. "Title is required", "Price must be greater than 0").

## Approach

Standardize on **zod + react-hook-form + shadcn `<Form>` components** (already installed in the project). For each form:

1. Define a `zod` schema listing every required field with a clear human-readable message.
2. Wire the form via `useForm({ resolver: zodResolver(schema) })`.
3. Replace raw `<Input>` / `<Select>` / `<Textarea>` blocks with shadcn `<FormField> / <FormItem> / <FormLabel> / <FormControl> / <FormMessage>` so the inline red message renders automatically under the field.
4. Remove the generic "Please fill in all required fields" toasts — inline messages replace them. Keep toasts only for server / network errors and cross-field rules that don't belong to a single input (e.g. "Start date must be earlier than expiration date" stays as toast OR as a `form.setError('expiration_date', …)` so it shows inline too).
5. On submit, also auto-scroll to the first invalid field for long forms.

## Forms to update

User-facing
- `src/pages/AuthPage.tsx` — sign in / sign up (email, password, name, role)
- `src/pages/ResetPasswordPage.tsx` — new password + confirm
- `src/pages/ListPropertyPage.tsx` — large property form: title, description, address, city, district, price, type, listing type, bedrooms, bathrooms, area, images, plus payment block (start/expiration date, payment reason)
- `src/pages/ProfilePage.tsx` — profile edit + realtor promote / featured forms (display name, phone, dates, bypass reason)
- `src/pages/MyListingsPage.tsx` — any inline edit dialogs
- `src/pages/PropertyDetail.tsx` — contact / inquiry inputs if present

Admin
- `src/components/admin/RealtorFormDialog.tsx` — realtor create/edit incl. Subscription & Featured Subscription sections
- `src/pages/admin/AdminUserDetailPage.tsx` — display name, email, role
- `src/pages/admin/AdminPropertyDetailPage.tsx` — property edit fields
- `src/pages/admin/AdminRealtorDetailPage.tsx` — realtor edit fields
- `src/components/admin/FeaturesTab.tsx` — feature flag forms if any required inputs

## Field-level rules (representative — exact list per form derived from each schema)

- Strings: `.trim().min(1, '<Field> is required').max(<n>, '<Field> is too long')`
- Email: `.email('Enter a valid email address')`
- Password: `.min(8, 'Password must be at least 8 characters')`; sign-up confirm: `refine` for match
- Numbers (price, area, beds, baths): `.coerce.number().positive('<Field> must be greater than 0')`
- Selects (city, district, property type, listing type, role, payment status): `.min(1, 'Please select <field>')`
- Dates (start_date, expiration_date, featured_*): required; cross-field refine: `expiration_date > start_date`
- Conditional: when `payment_bypassed` is true → `bypass_reason` required; same for featured
- Images on List Property: at least 1 image — surfaced as inline message under the upload area

## Technical notes

- Use `zodResolver` from `@hookform/resolvers/zod` (already a dep — verify, otherwise add).
- Cross-field errors: prefer `schema.refine((v) => …, { message, path: ['<field>'] })` so the error renders under a specific field.
- Keep existing toasts only for: server errors, upload failures, and successful save confirmations.
- Maintain existing styling — `<FormMessage>` already uses `text-destructive` from the design system.
- No DB schema changes.
- No business-logic changes; only validation feedback UX.

## Out of scope

- Server-side validation changes (Supabase RLS / triggers stay as is).
- New required fields — only surface what is already required today.
- Redesigning forms or layouts.