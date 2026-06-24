# Spring Frontend Visibility

A frontend engineering scorecard that maps every responsibility in the **Spring frontend guide**
to concrete, evidence-based actionables for the **`Spring-money/manthan-os-monorepo`**
(planner-portal · client-portal · mobile-app).

It is a single-page dashboard. For each of the guide's ten areas it shows:

- **Lead responsibility** — what the guide says a frontend lead must own.
- **What's in the repo today** — grounded observations (dependency + source signals).
- **Status** — `On Track` / `Partial` / `Gap`.
- **Actionables** — ranked High / Medium / Low.

## Areas covered

Architecture · State Management · Back End APIs · Real-time Updates · Performance ·
Networking · Security · User Experience · i18n & Accessibility · Common Patterns

## Headline gaps (high severity)

- **Security** — `dangerouslySetInnerHTML` in ~61 source files with **zero** sanitization; no Content-Security-Policy.
- **i18n & Accessibility** — the **Contrast Gate** that `CONTEXT.md` promises is not implemented; no i18n framework despite a multi-tenant Indian fintech.
- **APIs** — no standardized error envelope; re-verify authz on every mutation.

Full detail and the rest of the actionables live in [`src/data.js`](src/data.js).

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Deploy (GitHub Pages)

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds with Vite and publishes `dist/` to GitHub Pages.

One-time setup on the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The Vite `base` is set to `./` (relative), so the build works at
`https://<org>.github.io/<repo>/` without hardcoding the repo name.

## How findings were gathered

Signals were collected on 2026-06-24 by scanning the monorepo (dependency manifests,
`CONTEXT.md`/`CLAUDE.md`, and source greps for patterns like `dangerouslySetInnerHTML`,
`useInfiniteQuery`, `web-vitals`, CSP headers, i18n usage, and the documented Contrast Gate).
They are directional — confirm against the live codebase before committing engineering time.
