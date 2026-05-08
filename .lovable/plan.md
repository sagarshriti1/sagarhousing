## Plan

### 1. Database: add `contact_details` to profiles

Migration: add column `contact_details TEXT` to `public.profiles` (nullable). No RLS change needed — existing "Profiles are viewable by everyone" SELECT policy already exposes it for the public Property Detail page.

### 2. ProfilePage (`src/pages/ProfilePage.tsx`) — applies to both Realtors and Non-Realtors

In the Personal Information card, add a new section **"Contact Details for Viewers"** below the existing fields:

- A `Textarea` (rows=6) bound to `profile.contact_details`.
- Helper text: "Shown publicly on your property listings. Add phone, WhatsApp, office address, etc."
- 6-line limit enforced in `onChange`: if `value.split("\n").length > 6`, ignore the change (or trim to first 6 lines). Also a `maxLength` (e.g. 600) for safety.
- Include `contact_details` in the `ProfileData` interface, in load (`setProfileState`), and in the `handleSave` payload.

### 3. Admin user detail (`src/pages/admin/AdminUserDetailPage.tsx`)

- Extend the `Profile` interface with `contact_details: string | null`.
- In the read-only details grid, add a `sm:col-span-2` row showing **"Contact Details for Viewers"** with `whitespace-pre-line` rendering of `profile.contact_details || "—"`.
- In the Edit dialog, add a `Textarea` (rows=6) for `contact_details` with the same 6-line cap, save it via existing `update` flow.

### 4. Property Detail (`src/pages/PropertyDetail.tsx`) — public "Contact Seller" box

After fetching the property, also fetch the lister's profile:

```ts
supabase.from("profiles")
  .select("display_name, contact_details, avatar_url")
  .eq("user_id", property.user_id)
  .maybeSingle();
```

Render a new prominent **"Contact Seller"** card in the right sidebar (above the existing "Inquire About This Property" form). It shows:

- Lister's `display_name` (with avatar if available).
- If `contact_details` is set → render it inside a styled box using `<p className="whitespace-pre-line text-sm text-foreground">`.
- If `contact_details` is empty → hide the details block (still show name) or show muted "No contact info provided".

Card uses semantic tokens (`bg-card`, `border-border`, accent heading) to make it visually prominent.

### Out of scope

- No changes to the `realtors` table — realtor public profile page (`RealtorProfilePage`) is separate and not requested.
- No changes to the listing creation/edit flow.
- No notifications or messaging — purely displayed text.
