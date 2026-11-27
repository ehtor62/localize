# Nearby prototype

A single-page browser prototype that lists places of interest around your current position and shows them on a radar. It tests how often a mobile app would need to download place lists and details as you move, and how that should change with your speed.

Places come from Wikipedia: every article with coordinates counts as a place. The app calls the public Wikipedia API directly from the browser, with no API key or server of its own.

- **Language:** the Wikipedia edition follows the browser language, so a `de-CH` phone uses de.wikipedia.org. Anything that isn't a plain language code falls back to English. The info line shows which edition is in use. Smaller editions can have far fewer places; in central Basel German Wikipedia has about three times as many as English.
- **Categories:** the grey line under a name is Wikipedia's coordinate type (for example `landmark`, `edu`, `river`). Many articles have none.

## Running it

Open `index.html` in a browser. No build step or server is needed.

- **Start GPS** uses the browser's geolocation (`watchPosition`, high accuracy).
- **Demo walk** simulates movement starting in Basel at 5 km/h heading north. While it runs you can turn ±30° and set the speed to 5, 18 or 50 km/h.

Starting either source stops the other and resets all state: position, history, fetched list, counters, and mode back to idle.

## Deploying

The site is hosted on Vercel at **https://localize-pi.vercel.app**. GPS in mobile browsers only works over HTTPS, so test on a phone through this address rather than a local file.

The GitHub repo is connected to the Vercel project `localize`:

- **Push to `master`** to deploy to production. The live URL updates about a minute after the push.
- **Push to any other branch** to get a preview deployment with its own URL. Preview URLs require a Vercel login.

There is no build step. Vercel serves `index.html`, `style.css` and `app.js` as they are.

## Show / Close flow

The app has three modes, shown in the status line at the top:

| Mode | Status text | Meaning |
|---|---|---|
| `idle` | Offline · idle | Nothing downloaded yet. |
| `online` | Online | The list follows you and is re-downloaded as needed. |
| `closed` | Offline · list from HH:MM | The last downloaded list is kept, with no new downloads. |

### Show

**Show** switches to `online`. It requires a position; without one it shows "Start GPS or the demo walk first."

While online, each position update triggers a list download if any of these is true:

1. Nothing has been downloaded yet.
2. You are at least `D` (refetch distance) from the centre of the last download.
3. The visible radius plus margin no longer fits inside the downloaded area.

Each download covers a circle of radius `R + margin + D` around the current position. That leaves room to move `D` metres before a refetch while the list stays complete. Only one list download runs at a time; position updates during a download don't start another.

Wikipedia limits each list download to a 10 km radius and 500 places:

- If `R + margin + D` is over 10 km (only possible with edited settings), the download covers 10 km.
- If 500 places come back, only the area up to the farthest of them is complete, and the info line says "list capped at 500 places".

In both cases the app refetches only after you've moved `D` metres, never on every position update.

Opening a place in the list while online counts one **detail download**: the article's introduction, as plain text, with a link to the full article. Each place's details are downloaded only once and then cached until you restart GPS or the demo walk.

### When a download fails

Downloads time out after 15 seconds.

- **List download fails:** the note says "List download failed (…). Tap Show to retry." The app leaves online mode, keeping the previous list in `closed` mode if there was one, and doesn't retry by itself.
- **Detail download fails:** the detail panel says so. Tap the place to close it and tap again to retry.

### Close

**Close** only acts in `online` mode. It switches to `closed` and stops all downloads. The list and radar keep updating from the last downloaded area as you move.

- If you leave the area covered by the last download, the note says "Outside the downloaded area. Press Show to update."
- Opening a place shows its details only if they were downloaded while online. Otherwise the panel says the details weren't downloaded.

Press **Show** again to go back online. The next update downloads a fresh list if needed.

### List and radar

- A place appears when it comes within `R` and stays until it is more than `R + margin` away. This keeps places from flickering at the edge.
- The list shows the 40 nearest places, sorted by distance, each with an arrow pointing towards it.
- On the radar the solid rings are at ⅓, ⅔ and all of `R`, and the dashed ring marks `R + margin`.
- With **Heading up** checked, the radar and arrows rotate to your direction of travel. Before a heading is known, north is up and the info line says "north up".

## Profile settings

Each travel profile has three values:

| Setting | Field | Meaning |
|---|---|---|
| `R` | Radius m | Places within this distance are shown. |
| `D` | Refetch m | Distance moved from the last download centre before a new download. |
| `p` | Margin % | Margin as a percentage of `D`, so `margin = D × p / 100`. Used for the hide threshold and the coverage check. |

Defaults:

| Profile | R | D | p | Margin |
|---|---|---|---|---|
| Walk | 200 m | 250 m | 10 % | 25 m |
| Bike | 500 m | 600 m | 10 % | 60 m |
| Car | 1500 m | 2000 m | 10 % | 200 m |

The three number fields always show and edit the **active** profile's values. Edits apply immediately, which can trigger a download if online, and last until the page is reloaded. They are not saved.

### Auto vs locked

- **Auto** (default): the profile follows your speed.
- **Walk / Bike / Car**: picking one locks that profile and turns automatic switching off. Press **Auto** to unlock.

The info line shows the active profile, whether it is auto or locked, the current speed, and the list and detail download counters.

### How auto selection works

- Speed and heading come from the position history of the last 45 seconds. Speed is calculated once that history spans at least 8 seconds. Heading is updated only when you have moved more than 8 m in that window.
- Target profile by speed: below 7 km/h is **walk**, below 30 km/h is **bike**, and anything faster is **car**.
- The target must hold continuously before the profile switches:
  - **30 seconds** to move to a faster profile (walk → bike → car).
  - **3 minutes** to move to a slower one, so a short stop at traffic lights doesn't drop you back to walk.
