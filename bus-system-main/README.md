# BusSync

BusSync is a React website with:

- Add to Home install popup support
- PWA basics (manifest and service worker)
- Sri Lanka daily headlines loaded from API

## Local setup

1. Install dependencies

	npm install

2. Add your API key

	- Create or update .env
	- Set CURRENTS_API_KEY with your Currents key (preferred)
	- Optional fallback: set GNEWS_API_KEY
	- Optional fallback: set NEWSDATA_API_KEY

3. Run development server

	npm run dev

## Build

npm run build

## Vercel environment variable

Set these in your Vercel project:

- CURRENTS_API_KEY (preferred)
- GNEWS_API_KEY (optional fallback)
- NEWSDATA_API_KEY (optional fallback)

Then redeploy to see live headlines in production.

## Passenger Feedback Game

The app includes:

- A mini bus road game to keep users engaged while traveling
- A quick traveler feedback form
- Local response saving in browser storage
- One-click Excel export (`.xlsx`)
- Optional direct Google Sheet sync (no custom backend)

### Google Sheet integration (no backend)

1. Create a Google Sheet.
2. Open Extensions -> Apps Script.
3. Paste a script like below and deploy as a Web App with access `Anyone`.
4. Copy the `/exec` URL and paste it in the app field `Google Apps Script URL`.

```javascript
function doPost(e) {
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
	var payload = JSON.parse(e.postData.contents || '{}');
	sheet.appendRow([
		new Date(),
		payload.nickname || '',
		payload.route || '',
		payload.comfort || '',
		payload.speed || '',
		payload.fun || '',
		payload.overallRating || '',
		payload.favoriteFeature || '',
		payload.suggestion || '',
		payload.language || '',
		payload.gameScore || '',
		payload.bestScore || ''
	]);

	return ContentService
		.createTextOutput(JSON.stringify({ ok: true }))
		.setMimeType(ContentService.MimeType.JSON);
}
```
