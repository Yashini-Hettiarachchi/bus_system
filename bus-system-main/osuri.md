# Osuri Integration and PWA Changes

This document summarizes the changes made to turn Osuri into a PWA, make it work offline, and integrate it into the BusSync app under the same Vercel project.

## Osuri PWA changes

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/public/sw.js`
- Added a service worker for offline support.
- Cached the app shell, manifest, and offline fallback page.
- Added navigation handling so the app can load cached pages when offline.
- Added runtime caching for local requests.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/public/offline.html`
- Added a simple offline fallback screen for users without network access.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/public/manifest.json`
- Updated the app name and colors so the installed PWA shows Osuri branding.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/main.jsx`
- Registered the service worker in the active entry file.
- Kept the app usable even if service worker registration fails.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/App.jsx`
- Moved the router to use `/osuri` as the base path for subpath hosting.
- Kept the app routes aligned with the deployed Osuri URL.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/App.js`
- Removed the old duplicate entry file after moving to `App.jsx`.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/vite.config.mjs`
- Added a Vite build config for deployment.
- Set the base path to `/osuri/`.
- Configured JSX handling for the existing source structure.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/index.html`
- Added a Vite-compatible HTML entry point.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/package.json`
- Added Vite build scripts.
- Added the Vite build dependencies needed for deployment.
- Fixed the `lucide-react` version so the build resolves correctly.

## BusSync integration changes

### `bus-system-main/src/App.jsx`
- Added an Osuri tab to the BusSync UI.
- Added a link to open the Osuri dashboard from the main app.
- Kept the Osuri URL configurable through `VITE_OSURI_APP_URL`.
- Later simplified the tab UI to a dropdown so all tabs are available in one selector.

### `bus-system-main/src/App.css`
- Added styles for the Osuri integration section.
- Added styles for the tab dropdown.

### `bus-system-main/public/sw.js`
- Upgraded the main PWA service worker to cache the app shell and runtime API responses.
- This allows BusSync to behave better offline.

### `bus-system-main/vercel.json`
- Added routing support for `/osuri` so Osuri can be hosted from the same Vercel project.
- Kept the main BusSync routing intact.

### `bus-system-main/public/osuri/`
- Published the built Osuri assets into the main app so Vercel can serve Osuri from the same domain.

## Admin view changes

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/App.jsx`
- Removed the Passenger View route from the admin app.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/components/Layout.jsx`
- Removed Passenger View from the admin navigation.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/pages/Dashboard.jsx`
- Removed the Passenger View quick action from the dashboard.

## Result

- BusSync stays the main entry point.
- Osuri is available under `/osuri` on the same deployed Vercel project.
- Osuri can work offline after the first online load because of service worker caching.
- The admin site no longer shows Passenger View.

## Latest reliability fixes (2026-06-08)

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/services/api.js`
- Added one shared API base constant so all calls use the same backend URL.
- Added `buildMediaUrl()` so image/video URLs are built safely from relative paths.
- Added `updateAd()` to support edit/update without deleting records first.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/pages/Advertisements.jsx`
- Upload now requires a file only for new ads (not mandatory for metadata-only edit).
- Edit flow now uses update API instead of delete + re-upload.
- Added automatic refresh every 5 seconds so new/changed ads appear quickly.
- Media preview URLs now use `buildMediaUrl()` for consistent rendering.

### `Osuri/bus_ad_model/bus_ad_model/bus-backend/main.py`
- Added `PUT /admin/ads/{ad_id}` endpoint to update ad metadata and optionally replace media file.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/public/sw.js`
- Changed API handling from stale-first cache to network-first for fresher dashboard and ads data.
- Added `/control_simulation` to network-first list.
- Bumped cache names to force clients to pick up the new strategy.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/pages/Dashboard.jsx`
- Added automatic refresh every 5 seconds so totals and live status stay updated.

### `Osuri/bus_ad_model/bus_ad_model/bus-frontend/src/components/AdOverlay.jsx`
- Switched overlay media URL creation to `buildMediaUrl()` to avoid localhost-only rendering.

## Important production note

- Upload/view in Vercel still needs a public backend URL.
- If `VITE_TRANSITADS_API_URL` is not set in Vercel, the frontend falls back to localhost (`127.0.0.1`) which cannot be reached by public users.
