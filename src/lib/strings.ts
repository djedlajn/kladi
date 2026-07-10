import type { Kind } from './exposure'

export const LEGAL_MIN_M = 200
export const LAW_URL = 'https://www.paragraf.rs/propisi/zakon_o_igrama_na_srecu.html'

export const KIND_LABELS: Record<Kind, string> = {
  bookmaker: 'Betting shops (kladionice)',
  casino: 'Casinos',
  slots: 'Slot clubs',
  school: 'Schools',
  kindergarten: 'Kindergartens',
}

export const KIND_COLORS: Record<Kind, string> = {
  bookmaker: '#e66767',
  casino: '#d95926',
  slots: '#d55181',
  school: '#3987e5',
  kindergarten: '#199e70',
}

export const STRINGS = {
  title: 'Klađenje pored škole',
  subtitle: 'Betting shops around Belgrade’s schools',
  intro:
    'Serbian law requires betting venues to keep a 200 m distance from primary and secondary schools. This map shows every mapped betting venue and school in Belgrade — and how close they really are.',
  legalNote:
    'The law (Zakon o igrama na sreću, 18/2020 & 94/2024) measures the shortest safe pedestrian path and does not cover kindergartens. Distances here are straight-line (air) approximations — proximity shown is a signal, not a legal finding.',
  heroLabel: (radiusM: number) =>
    `of visible schools & kindergartens have a betting venue within ${radiusM} m (air distance)`,
  exposedTile: 'Exposed institutions',
  medianTile: 'Median distance to nearest venue',
  venuesTile: 'Betting venues shown',
  radiusLabel: 'Exposure radius',
  radiusLegalTag: (m: number) => `${m} m = legal minimum for schools`,
  histogramTitle: 'How far is the nearest betting venue?',
  histogramSubtitle: 'Number of visible institutions by distance to nearest visible venue',
  legalLineLabel: 'law: 200 m',
  overflowBinLabel: '1 km+',
  layersTitle: 'On the map',
  nearestHeading: 'Nearest betting venues:',
  noneNearby: 'No mapped venue within 1 km.',
  provenance:
    'Data © OpenStreetMap contributors (Overpass API). Venue counts are a lower bound — unmapped venues exist.',
  lawLinkText: 'Law text (paragraf.rs)',
  loading: 'Loading map data…',
  dataError: 'Could not load map data.',
  retry: 'Retry',
  noWebgl:
    'Your browser cannot show the interactive map (WebGL unavailable). The numbers still tell the story:',
} as const
