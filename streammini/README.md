# Viora

A YouTube-style video-sharing web app — capstone project (working title: StreamMini, which is
still the folder and code name). Frontend-first: React + TypeScript + Vite +
Tailwind CSS, built against an in-browser mock API that mirrors the backend team's API contract.

## Getting started

```bash
npm install
cp .env.example .env   # mock API is on by default — no backend needed
npm run dev            # http://localhost:5173
```

| Command                | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the dev server (hot reload)   |
| `npm run build`        | Type-check and build for production |
| `npm run lint`         | Find bugs with oxlint               |
| `npm run format`       | Auto-format all files with Prettier |
| `npm run format:check` | Report formatting problems only     |

Demo accounts (mock API only): `admin@streammini.dev` / `admin123` (admin) and
`ada@streammini.dev` / `password1` (regular user). Every channel account (for example
`beats@streammini.dev`) also uses `password1`.

## Design system

All colours and text sizes are **design tokens** defined once in `src/index.css` (`@theme`).
Components use token names such as `bg-surface` or `text-fg-muted` — never raw Tailwind colours
like `bg-neutral-900` — so the whole look can be changed from one file.

### Colour palette

Dark theme with a single violet accent. Every text/background pair meets **WCAG AA** (at least
4.5:1 contrast for normal text).

| Token          | Hex       | Use                                           | Contrast           |
| -------------- | --------- | --------------------------------------------- | ------------------ |
| `canvas`       | `#0b0b10` | Page background                               | —                  |
| `surface`      | `#15151d` | Cards, panels, inputs                         | —                  |
| `elevated`     | `#1f1f2a` | Menus, modals, hover states                   | —                  |
| `line`         | `#2c2c3a` | Borders and dividers                          | —                  |
| `fg`           | `#f4f4f6` | Main text                                     | 17.9:1 on canvas   |
| `fg-muted`     | `#a8a8b4` | Secondary text                                | 8.3:1 on canvas    |
| `fg-subtle`    | `#8b8b98` | Hints, timestamps                             | 5.8:1 on canvas    |
| `accent`       | `#6d4aff` | **Primary action only** (Play, Sign in, Save) | 5.2:1 (white text) |
| `accent-hover` | `#5b3ae8` | Accent hover state (darker keeps contrast)    | 6.5:1 (white text) |
| `accent-text`  | `#a78bfa` | Accent used as text (links, logo)             | 7.2:1 on canvas    |
| `danger`       | `#f87171` | Errors, destructive actions                   | 7.1:1 on canvas    |
| `success`      | `#4ade80` | Confirmations                                 | 11.3:1 on canvas   |
| `warning`      | `#fbbf24` | Warnings                                      | 11.8:1 on canvas   |

**Rules**

- One accent per screen area: only the most important action gets `bg-accent`.
- Status colours (`danger`, `success`, `warning`) signal meaning, never decoration.
- Surfaces get lighter as they rise: `canvas` → `surface` → `elevated`.

### Typography

Font: **Inter** (variable), bundled with the app via `@fontsource-variable/inter`.

| Token     | Size | Line height | Use                           |
| --------- | ---- | ----------- | ----------------------------- |
| `hero`    | 48px | 1.05        | Hero banner title             |
| `heading` | 30px | 36px        | Page headings                 |
| `title`   | 20px | 28px        | Card and section titles, logo |
| `body`    | 16px | 24px        | Paragraphs, synopsis          |
| `small`   | 14px | 20px        | Metadata, nav links, helpers  |
| `caption` | 12px | 16px        | Badges, timestamps            |

Usage: `className="text-heading font-bold"`.
