## Header dropdown cleanup

Edit `src/components/Header.tsx` only.

### Desktop header
1. Remove the "List Property" outline button (the `Link to='/list-property'` block with the `Plus` icon).
2. Remove the standalone Heart icon button (`Link to="/favorites"` wrapping the ghost icon button).
3. In the user dropdown menu, reorder items and add a "My Favorites" entry with the `Heart` icon. Add a list-style icon (e.g. `List`) next to "My Listings". Final order:
   - My Profile (User icon)
   - My Listings (List icon)
   - My Favorites (Heart icon)
   - Saved Realtors (Bookmark icon)
   - Realtor Dashboard (Megaphone icon, realtor/admin only)
   - Admin Dashboard (Shield, admin only — kept below)

### Mobile menu
4. Remove the "List Property" link.
5. Reorder the auth'd links to match: My Listings, Favorites, Saved Realtors. (Mobile already shows Favorites; just reorder and drop List Property.)

### Imports
6. Drop `Plus` from lucide-react imports (no longer used). Add `List` for the My Listings icon. Keep `Heart`, `Bookmark`, `User`, `Megaphone`, `Shield`, `LogOut`, `Home`, `Menu`, `X`.

No routing, business logic, or other files change.
