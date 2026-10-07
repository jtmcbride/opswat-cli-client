# Leximble interface

Leximble uses a folded-page L mark, warm neutral surfaces, deep blue actions, and a system sans-serif type scale. The tagline is **Words that stay with you.** Shared colors live in `src/constants/theme.ts`; reusable controls live in `src/components/ui.tsx`.

## Main flows

- An empty language collection opens with placement and common-word starter options. Manual entry and dictionary import remain available. Starter and placement actions wait for a usable dictionary.
- A populated collection shows the actual study queue and daily goal, search, and vocabulary. Add word expands a labeled single-word or bulk-entry form. Drafts, searches, and notices reset when the selected language changes.
- The daily review action opens Review; an empty queue offers Learn new words. Word rows display textual status and separate pronunciation controls.
- Below 1000px, five labeled bottom tabs accompany the compact brand header. At wider sizes, the same routes appear in a sidebar with secondary Progress and Settings links. Practice and reading screens keep a bounded reading width.
- Shared controls include light/dark colors, visible keyboard focus on web, labeled inputs, selected chip states, and larger touch targets.

## Compatibility

The public display name, logo, favicon, and splash configuration are Leximble. Existing storage keys, backup schema, Expo slug, URL scheme, native bundle/package IDs, and GitHub Pages base path are retained so this visual update does not migrate or orphan user data. The small navigation mark is a separate optimized asset from the full app icon.

## Validation

- ESLint and TypeScript checks.
- Existing Jest suite: 18 suites / 136 tests.
- Production Expo web export.
- Chromium views at 320, 390, 768, and 1440px; welcome, populated collection, and dark theme.
- Browser workflows: 25-word starter set, single-word addition, bulk import, meaning search, no-result search, word detail, review reveal/grading, all five destinations, language switching, resize across the sidebar breakpoint, and an empty eligible queue.
- Native iOS/Android packaging and on-device behavior still need a native preview build; browser device sizes are not native-device testing.
