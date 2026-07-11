# Kladi v0.2 — HUD Redesign, Find & Explore, Storytelling, SR/EN

**Date:** 2026-07-11
**Status:** Approved (mockup approved in visual companion: `.superpowers/brainstorm/*/content/hud-mockup.html`)
**Builds on:** `2026-07-10-belgrade-betting-map-design.md` (v0.1, merged at 451d2e2)

## Purpose

v0.1 proved the concept; v0.2 makes it usable and shareable. Three gaps close: the monolithic sidebar becomes a HUD so the map is the hero; "find my school" becomes the core interaction; the story travels (animated intro, shareable URLs, Serbian-first UI).

## Success criteria

1. A parent can type their school's name (no diacritics needed) and within two interactions see every betting venue near it, with distances.
2. First-time visitors get the 3-beat framing in ≤8 seconds or one click to skip; returning visitors never see it again.
3. Any configured view (radius, layers, camera, selection, language) survives copy-paste of the URL.
4. The UI defaults to Serbian; every string exists in both `sr` and `en`.
5. All v0.1 honesty constraints hold: never "illegal", air-distance caveat, kindergartens-not-in-law note, stats follow layer toggles.

## What does NOT change

Data pipeline and GeoJSON files; `exposure.ts` model; dataviz rules; test stack. The v0.1 sidebar components (`Sidebar.tsx`) are dismantled, not preserved.

**New runtime dependencies (the only two):** `lucide-react` (icons), `react-intl` (i18n). The dark palette hexes stay; a light-mode palette joins them (see Theming).

## Layout: the HUD (per approved mockup)

Four floating widgets over a full-viewport map, all `rgba(17,21,28,.88)` + `backdrop-filter: blur(10px)`, radius 14px, 1px `rgba(255,255,255,.12)` border:

- **TitleCard** (top-left, 300px): title + subtitle, hero row (44px bold % + context line naming current radius), three text links — "O podacima i zakonu" (opens AboutPanel), "Podeli prikaz" (copies URL, toast confirms), "Intro" (replays intro).
- **SearchBox** (top-center pill, 340px): placeholder "Nađi školu ili vrtić…", ⌘K/`/` focus shortcut shown as kbd hint. Dropdown lists ≤8 matches (name + kind + opština-less address), keyboard navigable (↑↓ Enter Esc). Selecting → school selection (below).
- **ControlDock** (bottom-left, 330px): radius slider (100–1000, step 25) with a tick at 200 m and preset chips `100 / 200 · zakon / 300 / 500`; compact histogram (52px tall, same bin logic/emphasis as v0.1, law line + label); layer chips (colored dot + label, click toggles, off = 38% opacity) replacing checkboxes; persistent hint line: "Statistika prati uključene slojeve — isključi vrtiće za broj uporediv sa zakonom."
- **DetailPanel** (right, 320px, slides in 200ms): kind eyebrow, school name, address, verdict chip (red-tinted when ≥1 venue within radius: "⚠ N kladionica na manje od R m", green-tinted "✓ Nema kladionica u radijusu" otherwise), scrollable venue rows (color dot, name, tabular-nums distance) — all venues within current radius, then up to 3 beyond radius at 55% opacity labeled with distance; hovering a row highlights that venue on the map. Footer repeats provenance + air-distance caveat. ✕ and Esc close.
- **AboutPanel**: slide-over (from right, above DetailPanel z-order) with the legal note, methodology (air-distance vs pedestrian-path), provenance, law link, replay-intro button. Esc/✕/backdrop-click closes.

**Mobile (≤640px):** TitleCard collapses to a slim top bar (title + hero % inline, links behind "ⓘ"); SearchBox full-width beneath it; ControlDock becomes a bottom sheet — collapsed shows the slider row only; tapping the handle toggles expansion to histogram + chips (no drag gesture required); DetailPanel is a full-height sheet over everything. No hover affordances required on touch.

## Interaction model

- **Selection** (`selectedSchoolId: string | null` in App): set via search or clicking a school dot; map `flyTo` centers the school with right-side padding equal to panel width (bottom padding on mobile); the school's dot enlarges with a bright ring; its buffer circle renders emphasized (fill 0.16, stroke 0.65 opacity — mockup values). Clicking elsewhere on the map, ✕, or Esc clears selection. Venue click keeps the v0.1 styled popup (unchanged behavior, panel not used).
- **Hover:** map dots get a feature-state radius bump (+2px) and pointer cursor; DetailPanel venue-row hover sets a `hoveredVenueId` feature-state highlight on the corresponding dot (white ring).
- **Keyboard:** ⌘K or `/` focuses search; Esc walks back (dropdown → panel → about); slider and chips reachable by Tab.

## Search

Pure function in `src/lib/search.ts`: `searchSchools(query, schools): School[]`.
Normalization: lowercase, strip diacritics via NFD + combining-mark removal, plus explicit `đ→dj` (NFD does not decompose đ). Applies to both query and names. Ranking: exact prefix of any word > prefix of name > substring; ties by name length. Empty/1-char query → no results. Cap 8.

## Intro sequence

State machine in `IntroSequence.tsx` overlaying the map; phases: `venues` (venues layer fades in over dimmed basemap, caption "373 kladionice, kazina i slot klubova"; counts come from live data, not hardcoded) → `schools` (schools fade in, "503 škole i vrtića") → `overlap` (buffers fade in, hero counts 0→32% in the caption, "Koliko su blizu?") → done (captions out, HUD fades in). ~2.5s per beat, Skip button always visible. Layer opacity driven via MapView (an `introPhase` prop; MapView maps phase → paint opacities).
Plays when: no URL hash present AND `localStorage['kladi:introSeen'] !== '1'`. Sets the flag on finish or skip. `prefers-reduced-motion` → static single overlay card (headline stat + Istraži button) instead of animation. Replayable from TitleCard/AboutPanel (replay ignores the flag).

## URL state

Hash-based, no router: `#r=200&l=bkm,sch&c=20.457,44.810,12&s=node/123&lang=sr`.
- `r` radius; `l` comma-list of enabled kinds (codes: `bkm,cas,slo,sch,kin`); `c` lon,lat,zoom (2 decimals lon/lat, 1 zoom); `s` selected school id; `lang` sr|en. All optional; invalid values silently fall back to defaults.
- Codec in `src/lib/urlState.ts`: `parseHash(hash): Partial<AppState>`, `buildHash(state): string` — pure, tested roundtrip.
- On load: parse once; any hash present skips intro. On change: `history.replaceState` debounced 300ms (camera updates come from MapView `moveend`).
- Share: `navigator.clipboard.writeText(location.href)`; on rejection, toast shows the URL text for manual copy. Toast: 2s, bottom-center.

## i18n (react-intl)

Translations live in **flat JSON message files the user edits by hand**: `src/locales/sr.json` and `src/locales/en.json` — ICU message syntax, ids namespaced by component (`title.heading`, `dock.radiusLabel`, `detail.verdictExposed`, `kind.bookmaker`, …). `<IntlProvider locale={lang} messages={MESSAGES[lang]}>` wraps App; components use `useIntl()`/`<FormattedMessage>` only — no hard-coded copy. Parameterized strings use ICU arguments (`{radius}`) and **plurals use ICU plural rules** so Serbian declension is correct: `{count, plural, one {# kladionica} few {# kladionice} other {# kladionica}}`. Locale precedence: URL param > localStorage `kladi:lang` > default `sr`; a thin `useLang()` hook owns persistence and sets `<html lang>`. `strings.ts` shrinks to non-linguistic constants (`LEGAL_MIN_M`, `LAW_URL`; colors move to `theme.ts`). Initial `sr` translations (ekavica) written at plan time; the JSON format means later manual edits need no code changes. A test asserts sr↔en message-id parity by importing both JSON files.

## Theming (system-aware light/dark) & icons

The app follows `prefers-color-scheme` — no manual theme toggle. Two mechanisms:

- **CSS tokens:** dark values stay the `:root` default; a `@media (prefers-color-scheme: light)` block overrides them. Light values (from the validated reference palette): page `#f9f9f7`, panel glass `rgba(252,252,251,.88)`, ink `#0b0b0b`, secondary `#52514e`, muted `#898781`, grid `#e1e0d9`, baseline `#c3c2b7`, border `rgba(11,11,11,.10)`. The histogram/SVG strokes switch from inline hexes to CSS vars (closes a deferred v0.1 finding).
- **JS theme constants** (`src/lib/theme.ts`): MapLibre paint and basemap can't read CSS vars, so `THEME = { dark: {...}, light: {...} }` exports per-scheme `KIND_COLORS`, buffer color/opacities, and basemap style URL (`…/styles/dark` ↔ `…/styles/positron`). A `useColorScheme()` hook (matchMedia + change listener) drives both React and MapView; on scheme change MapView calls `map.setStyle(url)` and re-adds sources/layers on the subsequent `style.load` (layer-adding is factored into a reusable function for this).

**Light categorical palette** (validated with the dataviz six-checks script on `#fcfcfb`: all pass; magenta/aqua sit below 3:1 contrast — relief provided by dot strokes + always-visible labeled legend): bookmaker `#e34948`, casino `#eb6834`, slots `#e87ba4`, school `#2a78d6`, kindergarten `#1baf7a`. Dark palette unchanged from v0.1.

**Icons:** `lucide-react`, replacing all emoji/typographic glyphs. Set: `Search` (search box), `X` (close), `Share2` (share link), `RotateCcw` (replay intro), `Info` (about / dock hint), `TriangleAlert` / `ShieldCheck` (detail verdict chips), `Languages` (SR/EN chip), `ChevronUp`/`ChevronDown` (mobile sheet). 16–18px, `stroke-width: 2`, colored via `currentColor`.

## Architecture

```
src/lib/search.ts        searchSchools + normalizeName (tested)
src/lib/urlState.ts      parseHash/buildHash (tested)
src/lib/theme.ts         THEME.dark/.light (kind colors, buffer paint, basemap URL) + useColorScheme
src/lib/lang.ts          useLang (locale precedence + persistence + <html lang>)
src/locales/sr.json      ICU messages — hand-editable
src/locales/en.json      ICU messages — hand-editable
src/lib/strings.ts       shrinks to constants (LEGAL_MIN_M, LAW_URL)
src/components/
  MapView.tsx            + props: selectedSchoolId, hoveredVenueId, introPhase,
                           onSelectSchool(id|null), onCameraChange(c); feature-states, flyTo
  TitleCard.tsx, SearchBox.tsx, ControlDock.tsx (subsumes RadiusControl/LayerToggles),
  DistanceHistogram.tsx  (visual compaction only, logic unchanged),
  DetailPanel.tsx, AboutPanel.tsx, IntroSequence.tsx, Toast.tsx
  Sidebar.tsx            deleted
App.tsx                  composition + state: radius, kinds, selection, hover, lang, intro
```

App state stays plain `useState`/`useMemo` (no state library); URL sync isolated in a `useUrlState` hook.

## Error handling

Clipboard rejection → manual-copy toast. Malformed hash → defaults (never crash). Selected school id not found (stale link after data refresh) → selection ignored, camera/radius still applied. Intro on WebGL-less browsers: never plays (stats-only fallback unchanged from v0.1).

## Testing

Vitest: `search.ts` (diacritics incl. đ/dj, ranking order, cap, short-query), `urlState.ts` (roundtrip, partial/garbage input), locales (sr↔en message-id parity by importing both JSON files; ICU plural strings parse via `intl-messageformat`). Existing 20 tests stay green (histogram/exposure logic untouched). Browser E2E checklist re-run at the end (search flow, selection panel, intro, URL roundtrip, lang toggle, light AND dark scheme via emulation, mobile viewport).

## Out of scope (v0.2)

Rankings/municipality stats, official-registry ingestion, isochrones, heatmaps, map↔histogram brushing, venue detail panel.
