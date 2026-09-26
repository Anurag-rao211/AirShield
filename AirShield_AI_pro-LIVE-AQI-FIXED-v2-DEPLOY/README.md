# AirShield — Detect. Predict. Respond.

AirShield is an AI-assisted air quality and climate-resilience dashboard prototype for
Indian cities and districts. It ships with realistic simulated ("demo") environmental
data out of the box, and can optionally switch to **live AQI data** via the
[WAQI (World Air Quality Index)](https://aqicn.org/) public API.

This build is organized as a clean, static, dependency-free project — no build step,
no bundler, no backend. It runs entirely in the browser and deploys as-is to any static
host (GitHub Pages, Netlify, Vercel, S3, etc).

## Project structure

```
AirShield_AI/
├── index.html                 Page shell — loads the stylesheet and every JS module in order
├── css/
│   └── styles.css             All application styling (theme tokens, layout, components)
└── js/
    ├── core/
    │   └── app-core.js        Helpers, icons, translations (EN/HI), saved settings,
    │                          AQI color bands, and the full India city/district dataset
    ├── api/
    │   └── waqi.js            Live WAQI API integration — the ONLY file that talks to
    │                          the network. Isolated here so it's the first place to
    │                          check if live data isn't working.
    ├── data/
    │   └── city-data.js       Generates each city's simulated sensors, hotspots,
    │                          citizen reports, infrastructure and alerts
    ├── ui/
    │   ├── shell.js           Navigation, modals, toasts, notifications, theme/
    │   │                      language/city switching, search, downloads
    │   ├── charts-map.js      Chart.js graph setup + the interactive SVG city map
    │   └── shared-components.js   Reusable pieces: AQI dial, pollutant grid, KPI cards
    ├── pages/
    │   ├── dashboard.js
    │   ├── map.js
    │   ├── reports.js
    │   ├── hotspots.js
    │   ├── forecast.js
    │   ├── analytics.js
    │   ├── alerts.js
    │   ├── infrastructure.js
    │   ├── compare.js
    │   ├── data-federation.js
    │   └── settings.js        One file per screen in the app
    ├── ai/
    │   └── assistant.js       The in-app AirShield AI chat assistant (rule-based)
    └── app.js                 Boots the application once every module has loaded
```

Every file is a plain classic `<script>` (no ES modules, no imports), loaded in the
exact dependency order listed above. They share one global scope, the same way the
original single-file prototype did — splitting them into files changes nothing about
how the app runs, only how easy it is to navigate and debug.

## Cities and districts covered

`js/core/app-core.js` defines **96 Indian cities and districts**, covering every state
and union territory:

- The original 6 hand-curated cities (Delhi, Kanpur, Mumbai, Kolkata, Lucknow, Patna)
  have realistic, individually named localities for their sensors and hotspots.
- 90 additional cities/districts — including every state capital and union territory,
  plus major metros and industrial centers — were generated with region-appropriate
  baseline AQI, temperature, humidity and wind values (e.g. hill and northeastern
  cities skew cleaner and cooler; north Indian plains skew higher AQI; coastal cities
  skew humid).

This gives nationwide coverage rather than exhaustive coverage of all 700+ Indian
districts, which would require field-verified locality names per district to be
genuinely useful rather than just padding a dropdown.

Switching cities works the same way for all 96 — pick any of them from the city
selector or the search box.

## Live data (WAQI API)

AirShield connects to the [WAQI (World Air Quality Index)](https://aqicn.org/) API via server-side Vercel serverless routes (`/api/air-quality`, `/api/health`, `/api/search`). The `WAQI_TOKEN` is configured safely in server environment variables and is never exposed to client browsers.

When **Settings → Data Mode & API Integration → API mode** is selected (or active by default), AirShield fetches real AQI, PM2.5, PM10, NO₂, SO₂, CO, O₃, temperature, humidity, and wind readings for the current city/district and merges them into the live operating picture.

Key endpoints:
- `/api/air-quality?location=Delhi&state=Delhi` — Live station AQI and meteorological payload.
- `/api/health` — API service connectivity and token configuration diagnostic.
- `/api/search?q=Delhi` — Live WAQI station search for Indian cities.

Get a free token in under a minute — no approval wait, no credit card:
https://aqicn.org/data-platform/token

## Deploying

Because this is a static site, deployment is just "upload the files":

### GitHub Pages
1. Upload the contents of this folder (`index.html`, `css/`, `js/`) to your repository,
   preserving the folder structure.
2. Commit to `main`.
3. In your repo's **Settings → Pages**, make sure the source is set to the `main`
   branch, root folder.
4. Your site will be live at `https://<username>.github.io/<repo>/`.

### Any other static host (Netlify, Vercel, S3, Cloudflare Pages, etc.)
Drag-and-drop or upload this whole folder as-is. There is no build command — the
"build output" is this folder.

## Notes on the data

All environmental data is **simulated/demo by default**, clearly labeled in the UI
("DEMO MODE" banner, demo-data chips throughout). Only the optional WAQI API mode
pulls real readings, and only for the currently selected city. This project is a
prototype/demo and is not intended for real-world air-quality decision-making.


## Live AQI deployment checklist
1. In Vercel, set `WAQI_TOKEN` for the Production environment.
2. Redeploy after saving the variable.
3. Open `/api/health` and confirm `tokenConfigured: true`.
4. Test `/api/air-quality?location=Delhi&state=Delhi`.
5. The dashboard defaults to live API mode; it does not silently label demo readings as live.
