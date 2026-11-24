# CONNECT — Visual identity V1

## Brand meaning
CONNECT is a platform for intentional one-to-one connection. Two independent curved paths converge without becoming indistinguishable. The identity balances human warmth with the energy of real-time interaction.

## Brand assets
- `connect-symbol.svg`: vector symbol, editable and scalable
- `connect-brand.css`: additive CSS token/theme layer
- `docs/connect-symbol.svg` and `docs/connect-brand.css`: GitHub Pages production copies

## Palette
- Electric violet: `#7545F7`
- Warm coral: `#FA7C78`
- Fresh lime: `#C6F27C`
- Midnight: `#19152B`
- Main ink: `#211B36`
- Surface: `#FCFAFF`

## Typography
Space Grotesk for headings, DM Sans for interface content. Typography is loaded in the existing HTML.

## Implementation scope
This is a non-destructive first pass on visible brand identity and top-level interface polish, not a completed engineering rebuild. Existing schemas, RLS rules, RPCs, payments, authentication and match logic remain unchanged. For the full transformation, the next stages need a screen-by-screen component audit, theme integration, motion regression tests, security tests, responsive screenshots, and staged backend review.

## Theme
The CSS layer includes a dark-theme token foundation with `data-connect-theme="dark"` but the existing theme.js and theme.css remain authoritative for end-user settings. The custom accent selector is not implemented here.

## Notes before release
1. Check light, dark, and custom themes on real mobile and desktop devices.
2. Verify homepage, authenticated application, all admin sections, profile sharing, and subscription screens.
3. Validate browser PWA icon refresh; raster icons currently remain from previous branding.
4. Test all critical user journeys before merging.
