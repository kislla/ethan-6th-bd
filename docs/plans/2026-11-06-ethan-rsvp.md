# Ethan's birthday RSVP site: implementation plan

> Executed inline in this thread (no subagents). Design: `docs/plans/2026-11-06-ethan-rsvp-design.md`.

**Goal:** A Hebrew, mobile-first, racing-themed invitation page that writes RSVPs into Edkis's Google Sheet.

**Architecture:** Static HTML/CSS/JS on GitHub Pages. A Google Apps Script web app bound to the sheet receives RSVPs (`doPost`) and serves the current PayBox link (`doGet`). All per-event values live in `config.js`.

**Tech stack:** Plain HTML/CSS/JS (no build step), Google Fonts (Rubik), Google Apps Script, Playwright for checks.

---

### Task 1: Photos

- Create `assets/ethan-hero.jpg` and `assets/ethan-pit.jpg`: portrait crops around Ethan from the two uploads, 2x size for phones, JPEG q≈82.
- Create `assets/og.jpg` (1200×630) for the WhatsApp link preview.
- Verify: each file under ~200 KB; look at each crop.

### Task 2: Config

- Create `config.js` with `SCRIPT_URL` (empty until deployed), `PAYBOX_URL` fallback, event date/time/address, calendar end time.

### Task 3: Page

- Create `index.html` (sections: hero + countdown, details + add-to-calendar, activity cards, RSVP form, PayBox, map + Waze/Google Maps, footer), `styles.css`, `app.js`.
- `<html lang="he" dir="rtl">`, `noindex`, Open Graph tags, inline SVG favicon.
- Form: name required, allergies yes/no required, details shown only for yes. Disabled button while sending. Success state with the child's name and "אישור לילד נוסף". Error state keeps input.
- Preview mode when `SCRIPT_URL` is empty: simulated success, no network.

### Task 4: Checks (`tests/check.mjs`)

- Playwright at 390×844 and 1280×900: no horizontal overflow, all sections present, countdown text present.
- Submit empty form: validation message shown, no request.
- Choose "כן": details field appears. Choose "לא": hidden.
- With `SCRIPT_URL` pointed at a stubbed route: submit sends `name`, `allergies`, `details` and shows success.
- Save phone screenshots for review.
- Run: `node tests/check.mjs` → expect `ALL CHECKS PASSED`.

### Task 5: Apps Script

- Create `apps-script/Code.gs`: `doPost` (lock, sanitize, formula-injection guard, append to tab "אישורי הגעה", auto-create headers), `doGet` (JSON with PayBox link from tab "הגדרות" B1, auto-created with the current link).
- Create `apps-script/SETUP.md` (Hebrew): paste, deploy as web app (Execute as: me, Access: Anyone), copy URL to Claude.

### Task 6: Publish

- Push to Edkis's repo, enable GitHub Pages (main, root), fill absolute `og:image` URL, set `SCRIPT_URL` once deployed, re-run checks against the live URL.
