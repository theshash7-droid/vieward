# VieWard — ICU Patient Monitoring

*Every Bed. Every Beat.*

A real-time ICU ward monitoring dashboard with separate **Admin Console**
and **Nurse Station** logins, Adult/Neonatal bed modes, live vitals, IV
fluid/flow-rate tracking, and alarm classification — designed to receive
live sensor data pushed from ESP32 bedside nodes over Wi-Fi.

## What's in this build

- **Two login portals** — `/login/admin` (full ward oversight, alarms,
  activity log) and `/login/nurse` (bed admission + monitoring).
- **Adult / Neonatal mode**, chosen per bed at admission — the vitals
  shown, their normal ranges, and the extra incubator readings (air
  temp, humidity) all switch accordingly. Reference ranges are cited in
  `src/data/vitalRanges.js`.
- **Stable / Warning / Critical / Signal Issue** status per bed,
  computed client-side from live vitals against those ranges — nothing
  the sensor node sends is trusted as "the patient is fine," the app
  decides that itself.
- **Light and dark themes**, toggle in the top bar, persisted per device.
- **Real-time data** via Firebase Realtime Database. If no Firebase
  project is configured, the app runs a built-in simulation instead —
  fully demoable with zero setup.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. With no `.env` file, you're in demo
simulation mode — a few beds are pre-populated with fake patients and
fake-but-live vitals so you can see the whole product immediately.

**Demo logins:**
- Admin — ID `admin`, password `flowguard2026`
- Nurse — ID `nurse01`, password `ward2026`

## Connecting real ESP32 sensor data

1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Realtime Database** (not Firestore) — start it in test mode
   for initial bring-up, then lock it down (see Security notes below).
3. Project Settings → General → scroll to "Your apps" → add a Web app →
   copy the config values into a `.env` file in this project (copy
   `.env.example` to `.env` first).
4. Restart `npm run dev` (or redeploy). The app now reads/writes that
   database instead of simulating — it also auto-creates the `beds/`
   structure the first time it connects, so there's nothing to
   manually set up in the Firebase console.
5. Open `esp32/vieward_bed_node.ino` in Arduino IDE. Install the
   **"Firebase ESP Client" by mobizt** library (Library Manager). Fill
   in your Wi-Fi credentials, the same Firebase database URL, and which
   `BED_ID` this physical node is mounted on (`bed01`, `bed02`, …).
   Replace the placeholder `readSensors()` function with your actual
   sensor reads (MAX30102 for HR/SpO2, a thermistor/DS18B20 for temp, a
   flow sensor for the IV line pump).
6. Upload. Within a couple of seconds of it connecting, that bed's card
   updates live on screen — on the Admin console, the Nurse station,
   and on every device anyone has the site open on, simultaneously.

Each bed's Firebase record looks like this — sensors only ever write
`vitals`, `iv`, and `lastUpdate`; everything else (`patient`, `mode`,
prescribed rates) is written by nurses/admins through the app itself,
so the two never collide:

```
beds/
  bed01/
    mode: "adult"
    patient: { name, mrn, age, sex, ... }
    ivPrescribedRate: 80
    ivVolumeOrdered: 500
    vitals: { hr, spo2, temp, rr }       <- pushed by the ESP32 node
    iv: { rate, volumeInfused }          <- pushed by the ESP32 node
    lastUpdate: 1755400000000            <- pushed by the ESP32 node
```

If a bed's `lastUpdate` goes stale for more than 8 seconds while it's
occupied, VieWard shows **Signal Issue** instead of silently freezing
on the last good number — deliberately, since a monitor that looks
fine while actually disconnected is worse than one that says so.

## Deploying — and fixing the Vercel build failure

The Vercel build failing on **node_modules** almost always means
`node_modules` got committed to the git repo at some point — it's huge,
platform-specific, and Vercel needs to install its own copy anyway, so
a committed one breaks the build. This project ships with a `.gitignore`
that excludes it; if your existing repo already has it tracked, remove
it from git history:

```bash
git rm -r --cached node_modules
git add .gitignore
git commit -m "Stop tracking node_modules"
```

Then push this project to your existing repo:

```bash
# from inside this project folder
git init                                   # skip if the repo is already initialized
git remote add origin <your-existing-repo-url>   # skip if already set
git add .
git commit -m "Rebuild VieWard: admin/nurse portals, adult/neonatal mode, live ESP32 data"
git push origin main
```

In Vercel project settings, confirm:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** add the same `VITE_FIREBASE_*` values from
  your `.env` (Vercel → Project → Settings → Environment Variables) —
  otherwise the deployed site runs in demo simulation mode, not live data.

`vercel.json` in this project already adds the rewrite rule so that
refreshing `/admin` or `/nurse` directly doesn't 404 (a common gotcha
with client-side routing on Vercel).

## Security notes before this touches a real patient

This build is a strong, working prototype — genuinely useful to demo to
hospital staff — but a few things are intentionally simplified and
should be hardened before any real clinical use:

- **Login is currently hardcoded demo credentials**, not real
  authentication. Replace with Firebase Authentication (or your
  hospital's identity provider) so each login is a real, auditable
  account, and PINs aren't sitting in the source code.
- **Realtime Database rules** — once real, lock read/write access to
  authenticated staff and to specific bed paths, rather than the open
  "test mode" rules Firebase starts new projects with.
- **ESP32 auth** — the sketch uses a database secret for the fastest
  path to a working demo. Firebase's newer, more secure option is a
  short-lived auth token per device; worth moving to before deployment.
- **Audit log persistence** — the activity log currently lives in the
  browser session only. For a real ward, that history should be
  written to the database (or a proper backend) so it survives a
  refresh and can't be edited by whoever's logged in.
