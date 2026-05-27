# info-plots — Land Plot Tracker

## Purpose
Personal tool for tracking real-estate land plots in Poland. The user clicks
on a map, saves a plot (marker) with a color-coded status, and records notes,
price, availability, and contact info. MVP is single-user, client-side only
(localStorage). No backend yet.

## Stack (pinned)
- Next.js 16.2.6 (App Router) — **always read `node_modules/next/dist/docs/`
  before any framework-level work; training data is outdated**
- React 19.2.4, TypeScript 5
- Tailwind CSS 4 (via `@tailwindcss/postcss`)
- `react-leaflet` 5 + `leaflet` for the map
- `zustand` 5 with the `persist` middleware (localStorage key:
  `info-plots-store`)

## Map data sources
- Base tiles: OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Cadastral overlay (działki ewidencyjne): GUGiK WMS
  `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow`
  layers: `dzialki,numery_dzialek`, `format=image/png`, transparent, ~0.6
  opacity.
- Parcel-by-coordinate lookup (ULDK): `https://uldk.gugik.gov.pl/` with
  `request=GetParcelByXY&xy=LON,LAT,4326&srid=4326&result=geom_wkt,id,voivodeship,county,commune,region,parcel`.
  Wrapped in `lib/uldk.ts → fetchParcelAt(lat, lng)`. Returns WKT POLYGON in
  WGS84 plus TERYT parcel id and human-readable address; we parse the outer
  ring only (holes ignored).

## Viewport
- Map is locked to Wrocław (center `[51.1079, 17.0385]`, zoom 12,
  `minZoom=10`, `maxBounds=[[50.83,16.55],[51.39,17.55]]`,
  `maxBoundsViscosity=1.0`). Constants live at the top of
  `components/LeafletMap.tsx` — change them there if the scope expands.

## Conventions / gotchas
- Server Components by default. Client-only files start with `'use client'`.
- **Leaflet must never run on the server.** It is imported only inside
  `components/LeafletMap.tsx`, which is loaded through
  `components/MapView.tsx` via `next/dynamic({ ssr: false })`. In Next 16,
  `ssr: false` is **not** allowed inside an RSC — `MapView` must itself be a
  client component.
- Leaflet stylesheet (`leaflet/dist/leaflet.css`) is imported at the top of
  `app/globals.css`, before Tailwind.
- `.leaflet-container { height: 100%; width: 100%; }` is required — the map's
  parent must have an explicit height (we use `flex-1` chains from
  `<body class="min-h-full flex flex-col">` in `layout.tsx`).
- All persisted data flows through the zustand store in `lib/store.ts`.
  Components must never touch `localStorage` directly.
- Plot status enum lives in `lib/types.ts`; colors and labels in
  `lib/status.ts`.

## File map
- `app/layout.tsx` — html/body, imports `globals.css`
- `app/page.tsx` — RSC shell, flex row: `<MapView />` + `<DetailsPane />`
- `app/globals.css` — imports leaflet.css then tailwindcss
- `components/MapView.tsx` — client wrapper, `dynamic(LeafletMap, ssr:false)`
- `components/LeafletMap.tsx` — `MapContainer` + tiles + WMS + markers,
  `useMapEvents` click-to-add
- `components/DetailsPane.tsx` — sidebar; list view when nothing selected,
  edit form when a plot is selected
- `components/StatusBadge.tsx` — colored status chip
- `lib/types.ts` — `Plot`, `PlotStatus`
- `lib/status.ts` — `STATUS_COLORS`, `STATUS_LABELS`, `STATUS_ORDER`
- `lib/store.ts` — `useStore` zustand store with `persist`

## How to restore context in a new session
Feed Claude the prompt:
> Read `CLAUDE.md`, `AGENTS.md`, and `project-context.md` at the project
> root before answering. We are continuing work on info-plots.

## Click-to-add behavior
1. User clicks the map. `ClickHandler` in `LeafletMap.tsx` immediately calls
   `addPlot(lat, lng, { title: 'Loading parcel…' })` so a marker appears
   without waiting on the network.
2. It then `await fetchParcelAt(lat, lng)`. On success, the plot is patched
   with `polygon`, `parcelId`, `address`, and `title` (defaulted to the
   address). The renderer swaps the marker for a filled `<Polygon>`.
3. On ULDK miss (water, outside Poland, server down), the plot stays as a
   point marker with title `New plot`.

Polygons use `bubblingMouseEvents={false}` so clicking an existing plot
selects it instead of dropping a new one underneath.

## Roadmap (not yet implemented)
- Manual polygon drawing/editing for plots ULDK can't resolve.
- Filtering markers by status.
- Export/import JSON.
- Optional Supabase/Postgres backend once the data set outgrows localStorage.
