# Ethan's 6th birthday RSVP mini-site: design

Approved by Edkis in the project thread on 2026-11-06.

## Goal

One mobile-first page in Hebrew (RTL) that parents open from a WhatsApp link. It shows the party details, collects RSVPs into Edkis's Google Sheet, links to PayBox for a cash gift, and shows how to get there.

## Event facts

- Ethan turns 6.
- Tuesday 17.11.2026, 17:00.
- אהבת ציון 7, פתח תקווה.
- Sports activity run by an operator: parachute, Blazepod, sack race, walking buckets, balls, ropes, hoops, balance games, scooters.
- PayBox: https://links.payboxapp.com/uVBBWkJYQ7b (may change later).
- Sheet: Edkis's private Google Sheet (link kept out of this public repo).

## Page sections (top to bottom)

1. Hero: photo of Ethan in the blue suit, big racing headline "איתן בן 6!", countdown "המרוץ מתחיל בעוד…".
2. Event details: date, weekday, time, address, "add to calendar" (Google Calendar link + .ics download).
3. What's waiting: small cards for the activity gear.
4. RSVP: child's name (required), allergies yes/no (required), allergy details (shown only when "yes"). Submit button "אני בא למרוץ!". Thank-you state with a checkered flag. Second photo sits beside this section.
5. Gift: big PayBox button.
6. Getting there: embedded Google Map (no API key) and Waze / Google Maps buttons.

## Look

Original racing style, no official Hot Wheels logo artwork. Orange (#FF6A00 range) and deep blue, an orange track strip with a loop motif between sections, flame accents and a checkered flag. Bold Hebrew display font (Google Fonts). Light page only; it's a party invite, not an app.

## Data flow

- Static site on GitHub Pages (public repo, `noindex` meta so it stays out of search).
- Google Apps Script bound to the sheet, deployed as a web app ("Anyone" access, runs as Edkis).
  - `doPost`: appends a row to the "אישורי הגעה" tab: timestamp, child name, allergies (כן/לא), allergy details.
  - `doGet`: returns JSON `{ paybox: <value of הגדרות!B1> }` so Edkis can change the PayBox link in the sheet.
- The page sends the RSVP with `fetch(..., { method: 'POST', mode: 'no-cors', body: URLSearchParams })`. The response is opaque, so a resolved fetch counts as success. On network failure the form shows an error and keeps the typed values.
- The page reads the PayBox link via `doGet` on load; the hard-coded link is the fallback when the call fails or the script URL isn't configured yet.
- The Apps Script URL lives in one constant in `config.js`. While it's empty the form runs in preview mode (no network call) so the page can be reviewed before the script is deployed.

## Error handling

- Required fields validated in the browser with Hebrew messages.
- Submit button disabled while sending to prevent double rows.
- Script side: trims input, caps lengths, uses a lock to avoid concurrent write collisions.

## Testing

- Playwright: load the page at phone width (390px) and desktop width, screenshot, check no horizontal scroll, check form validation and the allergy-details toggle, check the submit flow with the network call stubbed.
- Apps Script: tested by Edkis after deploy with one test RSVP, which they then delete.
