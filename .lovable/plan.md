## Display Property ID + Make My Listings/Favorites Searchable

### 1. Show Property ID (publicly visible)

Use the existing `user_properties.property_code` (bigint sequence) as the human-readable Property ID, formatted as `#<code>`.

**Display locations:**
- **Property Detail page** (`src/pages/PropertyDetail.tsx`) — show `Property ID: #<code>` near the title/address block, visible to all visitors (no auth required; route already public).
- **My Listings** (`src/pages/MyListingsPage.tsx`) — show `#<code>` as a small label above each listing title.
- **My Favorites** (`src/pages/FavoritesPage.tsx`) — show `#<code>` on each card. Add `property_code` to the select query and pass it through to `PropertyCard`.
- **PropertyCard** (`src/components/PropertyCard.tsx`) — render an optional `propertyCode` badge/label.

### 2. Searchable lists

Add a search input at the top of each page that filters client-side as the user types. Matches against:
- `property_code` (e.g. user types `123` or `#123`)
- `title`
- `address`, `city`, `district`

**Pages:**
- `src/pages/MyListingsPage.tsx` — add Search input above the listings.
- `src/pages/FavoritesPage.tsx` — add Search input above the grid.

Empty-state message updates when a filter yields zero results ("No matches for …").

### Out of scope
- No DB schema changes (property_code already exists).
- No changes to admin pages or RealtorProfilePage.
- No server-side search; client-side filtering only since both pages already load the full set.