## Plan

### 1. Layout: move "Contact Seller" + "Inquire" to the bottom of `PropertyDetail.tsx`

Currently both cards live in the right sidebar. Restructure:

- Remove the right sidebar column. Put all property content (gallery, title, description, features) in a single full-width column.
- Below all that, add a new full-width section `Contact Seller` with consistent padding (`max-w-3xl mx-auto`, same card styling).
  - Top half: lister avatar + display name + the 6-line `contact_details` (whitespace-pre-line). Fallback message if empty.
  - Divider.
  - Bottom half: `Inquire About This Property` form (Name, Email, Phone, Message + Send button).
- Both halves share the same outer card so they line up vertically with identical padding.

### 2. Email sending

Set up Lovable's built-in email infrastructure (no third-party). Steps:
- Set up email domain (one-click dialog).
- Run `setup_email_infra` then `scaffold_transactional_email`.
- Create a new template `property-inquiry.tsx` in `_shared/transactional-email-templates/` with props: `inquirerName`, `inquirerEmail`, `inquirerPhone`, `message`, `propertyTitle`, `propertyUrl`. Subject: `New inquiry about "{propertyTitle}"`.
- Register in `registry.ts`.

### 3. Wire up the form

In `PropertyDetail.tsx`:
- Convert the form to controlled inputs with `name`, `email`, `phone`, `message` state.
- Add `sending` and `sent` state plus a `dirtySinceSent` flag.
- On submit:
  1. Fetch the lister's signup email via `profiles.email` (already on profiles table).
  2. Build property URL from `window.location.href`.
  3. Call `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'property-inquiry', recipientEmail: ownerEmail, idempotencyKey: \`inquiry-${property.id}-${Date.now()}\`, templateData: {...} } })`.
  4. On success: `setSent(true)`, button becomes disabled with label "Message Sent!".
- Button disabled when `sending || (sent && !dirtySinceSent)`.
- `onChange` of Name or Message inputs sets `dirtySinceSent = true`, which re-enables the button and resets the label back to "Send Message".

### 4. Validation

- Required: name, email, message. Show inline toast on missing fields before sending.

### Out of scope
- No changes to admin/profile pages.
- No new DB tables — `profiles.email` already exists.

### Email domain

You'll need to set up a sender domain first (one-click). After that, I'll wire up the rest automatically.
