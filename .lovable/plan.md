## Problem

When a user signs up with an email that's already registered, Supabase returns a 200 success (no error) for security reasons. Our `AuthPage` treats that as success and shows "Account created! Check your email to verify." — so the user has no idea the email is already in use.

This is confirmed in the auth logs: `action: "user_repeated_signup"` returns `status: 200`.

## Fix

In `src/pages/AuthPage.tsx`, detect the repeated-signup case after `supabase.auth.signUp(...)` and surface an inline error on the email field (matching the existing inline-red-error pattern from the previous validation pass).

### Detection

Supabase signals a repeated signup by returning a `user` object whose `identities` array is empty:

```ts
if (data.user && data.user.identities && data.user.identities.length === 0) {
  setErrors({ email: 'An account with this email already exists. Try signing in instead.' });
  return; // do not log payment, do not show success toast
}
```

### Sign-in side

For sign-in, Supabase already returns a clear `Invalid login credentials` error, which we currently surface via `toast.error`. Optionally we'll also mirror it as an inline error under the password field for consistency with the rest of the form.

## Scope

- File: `src/pages/AuthPage.tsx` only
- Inline red error under the email field on repeated signup
- Skip the realtor payment-history log when signup is rejected as duplicate
- No DB, schema, RLS, or business-logic changes
- No changes to other forms

## Out of scope

- Changing Supabase's "confirm email" security behavior
- Rate-limit / brute-force handling
- Password reset flow (already works)