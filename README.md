# TechWave Radio

**[radio.techwaveacademy.com](https://radio.techwaveacademy.com)** — a 24×7
Hindi-RJ radio for everything tech & AI. One anchor voice narrates the latest
global technology and artificial-intelligence stories in natural Hinglish
(Devanagari Hindi, English tech terms kept inline), looping forever — a single
continuous stream of all things tech & AI, **Hindi first**.

Built on the [TechWave AI Pulse](https://ai.techwaveacademy.com) engine: the
same ranked, clustered, multi-source tech/AI feed, turned into on-air radio.

## How it works

1. **Content** — the build job pulls the live ranked feed from
   `ai.techwaveacademy.com/api/news` (good / bad / ugly clusters, already
   deduped, with Hindi titles).
2. **Script** — Groq writes a 2–3 sentence Hindi-RJ line per story
   (`api/shared/script.js`); a templated fallback from the story's own Hindi
   title keeps the station on air if the LLM is unavailable. Pre-written station
   idents and segues bridge the stories.
3. **Voice** — Azure Speech Neural TTS (`hi-IN-SwaraNeural`) renders each segment
   to a CBR MP3, cached in blob under `radio/audio/<hash>.mp3`. The clip name is
   a content hash, so unchanged stories are never re-synthesised.
4. **Program** — `api/shared/program.js` assembles the playlist manifest
   (`radio/program.json`): `ident → [segue] story → … → sign-off`.
5. **Player** — `public/` is a continuous, auto-advancing, looping web player
   (ON AIR indicator, now-playing console, up-next queue, read-the-story links).

## API

| Route | Purpose |
| --- | --- |
| `GET /api/playlist` | Current program manifest (builds once on a cold start). |
| `GET /api/audio/{id}` | Streams a cached MP3 segment from blob. |
| `GET\|POST /api/refresh?key=…` | Rebuilds the program from the latest feed (guarded by `REFRESH_KEY`). |

## Deploy

Azure Static Web App **`techwave-radio`** (Free, `lms-rg`).
`.github/workflows/deploy.yml` deploys `public/` + `api/` on push to `main`.
`.github/workflows/refresh.yml` rebuilds the program every 3 hours.

### Required repo secrets

| Secret | Purpose |
| --- | --- |
| `AZURE_SWA_DEPLOY_TOKEN` | Deployment token for the `techwave-radio` SWA |
| `REFRESH_KEY` | Shared secret guarding `/api/refresh` |

### Required SWA app settings

| Setting | Notes |
| --- | --- |
| `BLOB_CONN` | Azure Storage connection string (reuses the `feed` container, `radio/` prefix) |
| `SPEECH_KEY` / `SPEECH_REGION` | Azure Speech; region `centralindia` supports `hi-IN` voices |
| `GROQ_API_KEY` | LLM for the Hindi-RJ script writer (optional; falls back to templated lines) |
| `REFRESH_KEY` | Guards `/api/refresh` |
| `RADIO_VOICE` | Optional; default `hi-IN-SwaraNeural` |
| `NEWS_API` | Optional; default `https://ai.techwaveacademy.com/api/news` |
| `RADIO_STORIES` | Optional; stories per program (default 12) |
