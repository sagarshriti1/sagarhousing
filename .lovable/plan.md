## Add Confirm Password to Sign Up

Add a "Confirm Password" field that appears only on the sign-up form (not sign-in or forgot-password) in `src/pages/AuthPage.tsx`.

### Changes (single file: `src/pages/AuthPage.tsx`)

1. **State**: add `const [confirmPassword, setConfirmPassword] = useState('');`

2. **UI**: render a new field directly below the existing Password input, gated on `isSignUp`:
   - Label: "Confirm Password"
   - Type: password
   - `aria-invalid={!!errors.confirmPassword}`
   - Inline red error `<p className='text-xs text-destructive'>` when present
   - `onChange` clears the `confirmPassword` error (matching existing pattern)

3. **Validation in `handleSubmit`** (only when `isSignUp`):
   - Existing rule kept: `password.length >= 6` → error "Password must be at least 6 characters"
   - New rule: if `!confirmPassword` → "Please confirm your password"
   - New rule: if `password !== confirmPassword` → "Passwords do not match" (set on `confirmPassword`)
   - All errors surface inline (red text under the relevant field), consistent with the existing UX style.

4. **Reset**: clear `confirmPassword` and its error when toggling between Sign In ↔ Sign Up so stale values don't carry over.

### Out of scope

- No changes to sign-in, forgot-password, or reset-password flows.
- No DB / RLS / business-logic changes.
- No styling beyond reusing existing `Input`, `Label`, and `text-destructive` patterns.