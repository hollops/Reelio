# Reelio

**Viora** — a mini streaming platform for uploading, managing and watching videos.

> **This repository holds two applications on two branches.** They are deployed
> separately and share no files, so whichever branch you are looking at shows only
> half the project.

## Where everything lives

| Branch | Contains | Stack | Deployed to |
| --- | --- | --- | --- |
| [`main`](../../tree/main) | `streammini/` — the web app | React · TypeScript · Vite · Tailwind | *(not yet deployed)* |
| [`backend`](../../tree/backend) | `src/` — the REST API | Node · Express · MongoDB · Cloudinary | [viora-94kb.onrender.com](https://viora-94kb.onrender.com) |

`main` and `backend` descend from the same first commit but were built in parallel
and were never merged. That is deliberate: each deployment platform reads the one
branch it needs, and neither has to ignore the other's files.

**API documentation:** [viora-94kb.onrender.com/api-docs](https://viora-94kb.onrender.com/api-docs)
(Swagger UI — every endpoint, with a "Try it out" button).

> The API is on Render's free tier and **sleeps after about 15 minutes of
> inactivity**. The first request after that takes roughly 20–30 seconds while it
> wakes up; everything after it is fast. Worth opening the link a minute before a
> demo.

## Running the frontend

```bash
git checkout main
cd streammini
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

**It works with no backend running.** `VITE_USE_MOCK_API=true` (the default) serves
an in-browser mock API with 20 seeded videos, so every screen is usable offline.
To run against the real API instead:

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://viora-94kb.onrender.com/api
```

Other scripts: `npm test` (72 unit tests), `npm run build`, `npm run lint`.

## Running the API

```bash
git checkout backend
npm install
npm run dev
```

Needs `MONGO_URI`, `JWT_SECRET`, the three `CLOUDINARY_*` keys and
`RESET_PASSWORD_URL`. See `render.yaml` for the full list.

## What the app does

Sign up and sign in · browse and search a video catalogue · watch with a custom
player (resume where you stopped, keyboard shortcuts, Up next autoplay) · comment
and like · save to Watch later · watch history · upload your own videos · an admin
area for moderating the catalogue.

Dark and light themes, keyboard navigable throughout, and checked against WCAG AA
contrast.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | the frontend — current and working |
| `frontend` | where frontend work happens; merged into `main` |
| `backend` | the API — current and working; what Render deploys |
| `backend-fixes` | API work awaiting review and merge into `backend` |
| `develop` | unused |
