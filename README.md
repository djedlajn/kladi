# Kladi — Betting shops around Belgrade's schools

Interactive map of Belgrade overlaying schools and kindergartens with betting
venues (kladionice, casinos, slot clubs), to make visible how close gambling
sits to children's daily paths.

Serbian law (Zakon o igrama na sreću, "Sl. glasnik RS" 18/2020 & 94/2024)
requires betting venues to keep at least **200 m** from primary and secondary
schools, measured along the shortest safe pedestrian path. This map draws
straight-line (air) distances — an approximation, and a conservative signal,
not a legal finding. Kindergartens are shown for context; the law does not
cover them.

## Run

    npm install
    npm run dev        # http://localhost:5173

## Data

`public/data/*.geojson` is committed and self-contained. Source:
OpenStreetMap via the Overpass API (© OpenStreetMap contributors).
Venue counts are a lower bound — unmapped venues exist.

Refresh with:

    npm run fetch-data

## Test / build

    npm test
    npm run build
