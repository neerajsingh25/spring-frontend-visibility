// Spring Frontend Visibility — audit data
//
// Each area mirrors a section of the Spring frontend guide (frontend-guide/src/App.jsx).
// For every area we capture:
//   - responsibility : what the guide says a frontend lead must own
//   - status         : "good" | "partial" | "gap"  (state in manthan-os-monorepo)
//   - evidence       : grounded observations from the repo (file/dependency signals)
//   - actionables    : concrete, ownable next steps with a severity
//
// Severity: "high" (correctness/security/compliance), "med" (quality/perf), "low" (polish).
//
// Findings gathered 2026-06-24 against SpringMoney/manthan-os-monorepo
// (planner-portal Next 15, client-portal Next 16, mobile-app Expo SDK 54).

export const meta = {
  repo: "Spring-money/manthan-os-monorepo",
  apps: [
    "planner-portal (Next.js 15 App Router)",
    "client-portal (Next.js 16 App Router)",
    "mobile-app (Expo SDK 54 / React Native)",
  ],
  generated: "2026-06-24",
};

// ── GUIDE ─────────────────────────────────────────────────────────────────
// The 10 frontend-guide areas, audited against the monorepo. Read-only
// "where do we stand" visibility. Grouped under a single Guide section.
export const guideAreas = [
  {
    id: "architecture",
    label: "Architecture",
    color: "#f5a623",
    responsibility:
      "Choose and enforce rendering strategy (SSR / CSR / ISR / RSC / Edge) per surface, keep server-only work off the client bundle.",
    status: "good",
    evidence: [
      "Both web apps on App Router (Next 15 / 16) — RSC-capable by default.",
      "ISR is the documented strategy for /api/tenant-config (CONTEXT.md → ISR term).",
      "Next API routes proxy Frappe so tokens stay server-side (CLAUDE.md API pattern).",
      "`revalidate` appears widely across the apps.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Document the rendering decision per route",
        detail:
          "App Router defaults to RSC, but there is no single place that states which routes are static/ISR/dynamic. Add a short rendering map (or per-route comment) so SSR vs CSR vs ISR is an intentional choice, not an accident of where a `use client` or `fetch` landed.",
      },
      {
        severity: "med",
        title: "Audit the 'use client' boundary",
        detail:
          "Verify heavy data-fetching and secret-touching logic lives in server components, and only interactive leaves are `use client`. Spot-check that no Frappe token or server util is pulled into a client component bundle.",
      },
      {
        severity: "low",
        title: "Pin the tenant-config revalidation contract",
        detail:
          "CONTEXT.md says ISR with ≥1h revalidate or on-demand webhook on config save. Confirm the on-demand revalidation webhook actually exists so branding/flag changes don't wait an hour.",
      },
    ],
  },
  {
    id: "state",
    label: "State Management",
    color: "#e74c3c",
    responsibility:
      "Pick a predictable state model, normalize shared entities, and keep server-cache vs client-state cleanly separated.",
    status: "good",
    evidence: [
      "TanStack Query v5 is the server-cache layer across all three apps.",
      "@manthan/shared-hooks centralizes React Query key factories (CLAUDE.md).",
      "No Redux/Zustand/Jotai — server state via Query, local state via hooks.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Define query-key + cache-time conventions in one doc",
        detail:
          "Key factories exist in shared-hooks, but staleTime/gcTime and invalidation rules per domain (client, portfolio, accounts) should be written down so cache behavior is consistent across planner/client/mobile.",
      },
      {
        severity: "low",
        title: "Consider normalized selectors for high-churn entities",
        detail:
          "Client/holdings data appears in multiple surfaces. Where the same entity is edited in several places, ensure a single source of truth in the cache to avoid stale duplicates after mutations.",
      },
    ],
  },
  {
    id: "apis",
    label: "Back End APIs",
    color: "#8b4513",
    responsibility:
      "Consistent REST conventions, error shapes, pagination strategy, and a hard line between authentication and authorization.",
    status: "partial",
    evidence: [
      "REST via Next API routes proxying Frappe; `snake_to_camel` normalization at the boundary (CONTEXT.md).",
      "Feature-gated API routes via `requireFeature` (CLAUDE.md) — server-side authorization exists.",
      "No `useInfiniteQuery` anywhere in source — long lists are not using cursor pagination.",
    ],
    actionables: [
      {
        severity: "high",
        title: "Standardize an error envelope across API routes",
        detail:
          "The guide calls for one consistent error shape ({ code, message, statusCode }). Confirm every Next API route maps Frappe errors into a single envelope so the client can branch on `code`, not on string matching.",
      },
      {
        severity: "med",
        title: "Adopt cursor pagination for mutating lists",
        detail:
          "Zero `useInfiniteQuery` usage means lists are likely offset-paginated or fully loaded. Feeds/lists that change under the user (tasks, transactions, leads) should move to cursor pagination to avoid skipped/duplicated rows.",
      },
      {
        severity: "med",
        title: "Re-verify authz on every sensitive mutation",
        detail:
          "`requireFeature` gates features, but feature ≠ permission. Confirm role/ownership checks run server-side on every write (a valid session proves identity, not authority) — never trust a client-sent role.",
      },
    ],
  },
  {
    id: "realtime",
    label: "Real-time Updates",
    color: "#27ae60",
    responsibility:
      "Match the transport (polling / long-poll / SSE / WebSocket) to the latency need; don't burn bandwidth polling for low-latency features.",
    status: "partial",
    evidence: [
      "No realtime libraries (socket.io / ws / eventsource / pusher) in any package.json.",
      "Widespread `setInterval` usage suggests short-polling where push would fit.",
      "AI Meeting-to-Action / Advice Copilot (CONTEXT.md) will stream LLM output — a natural SSE case.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Stream agent output over SSE, not polling",
        detail:
          "The agentic AI arc drafts MoM/tasks/advice. Streaming partial results via Server-Sent Events gives a responsive draft-review UX without holding connections open or hammering the API on an interval.",
      },
      {
        severity: "low",
        title: "Inventory and justify each polling loop",
        detail:
          "List every `setInterval`-based poll, its frequency, and why polling (vs SSE/webhook) is acceptable. Kill or back off any sub-30s poll that returns empty most of the time.",
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    color: "#00b894",
    responsibility:
      "Own bundle size (splitting, tree-shaking), debounce/throttle hot paths, cache/memoize, and hold Core Web Vitals (LCP/INP/CLS) targets.",
    status: "partial",
    evidence: [
      "Code splitting present (React.lazy / next/dynamic used across apps).",
      "web-vitals referenced in ~39 source files — some measurement exists.",
      "No bundle-budget gate in CI; no documented LCP/INP/CLS targets per tenant.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Add a bundle-size budget to CI",
        detail:
          "Wire @next/bundle-analyzer (or size-limit) into the build and fail PRs that blow a per-route JS budget. A multi-tenant app accretes vendor weight fast; catch it at PR time, not in prod.",
      },
      {
        severity: "med",
        title: "Make Core Web Vitals a tracked metric, not ad-hoc",
        detail:
          "web-vitals is referenced but there is no dashboard or target. Pipe LCP/INP/CLS to one sink and set the guide's targets (LCP<2.5s, INP<200ms, CLS<0.1) as alerting thresholds.",
      },
      {
        severity: "low",
        title: "Audit lodash / heavy imports for tree-shaking",
        detail:
          "Confirm named ESM imports (e.g. lodash-es) rather than default imports, so the bundler can drop unused code. One source-map-explorer pass per app before a release.",
      },
    ],
  },
  {
    id: "networking",
    label: "Networking Techniques",
    color: "#9b59b6",
    responsibility:
      "Batch requests, retry with backoff+jitter, optimistic updates, and defend against race conditions / out-of-order responses.",
    status: "good",
    evidence: [
      "AbortController is used broadly (cancels stale in-flight requests).",
      "TanStack Query gives dedup, retry, and out-of-order protection for free.",
      "Optimistic-update primitives (onMutate/onError/onSettled) available via Query.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Centralize retry/backoff policy in one Query client config",
        detail:
          "Set retry count, exponential backoff + jitter, and Retry-After handling once on the shared QueryClient rather than per-hook, so behavior is uniform and 429s are respected.",
      },
      {
        severity: "low",
        title: "Standardize optimistic-update rollback helper",
        detail:
          "Where mutations update the UI ahead of the server (likes, task toggles, edits), provide a shared snapshot/rollback helper so every optimistic path reconciles with server truth the same way.",
      },
    ],
  },
  {
    id: "security-web",
    label: "Security · Web",
    color: "#e74c3c",
    responsibility:
      "For the Next.js portals: enforce a verified server-side session, authorize every API route, ship a Content-Security-Policy, and keep auth state / PII out of JS-readable storage.",
    status: "gap",
    evidence: [
      "Auth gate is a static boolean cookie — planner-portal/middleware.ts only checks `loggedInSuccessful === 'true'`, with no signed or verified session behind it.",
      "POST /api/create-session mints an authenticated session from just an email in the request body — no password, no OTP, no environment guard.",
      "Middleware exempts /api/* and routes like app/api/accounts/route.ts forward to Frappe with a shared FRAPPE_AUTH_TOKEN and no per-user check — GET returns all clients.",
      "No Content-Security-Policy or security headers in either next.config.ts; both portals build with `ignoreBuildErrors` + `ignoreDuringBuilds`.",
      "userInfo / userEmail / loggedInSuccessful are written to localStorage (storageHelper web) — JS-readable and XSS-exfiltratable.",
      "Positives: 0 real dangerouslySetInnerHTML and 0 eval/new Function in app source (the earlier '61 files' figure was counting node_modules), and the web session cookies are httpOnly. The gap is auth design, not raw XSS sinks.",
    ],
    actionables: [
      {
        severity: "high",
        title: "Lock down /api/create-session and the OTP bypass",
        detail:
          "create-session trusts a client-supplied email and sets session cookies. Require a verified credential/OTP exchange server-side or delete the endpoint, and remove the '010101' bypass in login/page.tsx (it leans on a public NEXT_PUBLIC_ENVIRONMENT flag). See Actionables → Security · Web for the full plan.",
      },
      {
        severity: "high",
        title: "Authenticate + authorize every API route",
        detail:
          "Stop exempting /api/* in middleware. Verify the session, resolve the user, and enforce role/ownership before forwarding to Frappe. /api/accounts returning all clients on an unauthenticated GET is the first to fix.",
      },
      {
        severity: "high",
        title: "Replace the boolean session gate with a verified session",
        detail:
          "loggedInSuccessful='true' proves nothing. Move to a signed httpOnly session (or validate the Frappe sid server-side) and treat any client-set auth flag as untrusted.",
      },
      {
        severity: "med",
        title: "Ship a CSP + security headers and re-enable build checks",
        detail:
          "Add a nonce-based CSP (Report-Only → enforce) plus HSTS / frame-ancestors / X-Content-Type-Options via next.config headers(), and remove ignoreBuildErrors / ignoreDuringBuilds so type and lint regressions stop shipping silently.",
      },
    ],
  },
  {
    id: "security-mobile",
    label: "Security · Mobile",
    color: "#c0392b",
    responsibility:
      "For the Expo app: never ship long-lived API credentials in the bundle, talk to a BFF instead of Frappe directly, and persist nothing sensitive in AsyncStorage.",
    status: "gap",
    evidence: [
      "EXPO_PUBLIC_FRAPPE_TOKEN is referenced 174 times — a Frappe API token baked into the shipped JS bundle and extractable from the app binary.",
      "Mobile calls Frappe directly (app/api/mf/frappeClient.ts) with that shared token; there is no server / BFF layer, so the token is the only thing between device and Frappe.",
      "frappeClient.ts itself notes the token 'would move behind a BFF' on a real deployment — currently it does not.",
      "AsyncStorage holds flow state (e.g. fipConsentDetails_*) and the reset-password flow stashes the email client-side; it is unencrypted, so confirm no tokens/PII land there.",
    ],
    actionables: [
      {
        severity: "high",
        title: "Get the Frappe token out of the mobile bundle",
        detail:
          "EXPO_PUBLIC_* values ship to every device. Route mobile traffic through a BFF / server proxy that holds the token server-side and issues short-lived per-user sessions, exactly as the frappeClient.ts comment anticipates. See Actionables → Security · Mobile.",
      },
      {
        severity: "med",
        title: "Audit AsyncStorage for sensitive data",
        detail:
          "AsyncStorage is not encrypted. Keep tokens/PII out of it; for anything sensitive use expo-secure-store (Keychain / Keystore). Today it holds consent + flow state — verify nothing more.",
      },
      {
        severity: "med",
        title: "Add secret scanning so no EXPO_PUBLIC token is committed",
        detail:
          "Gate CI on a secret scan so an EXPO_PUBLIC_*_TOKEN or FRAPPE_AUTH_TOKEN can never re-enter the bundle once the BFF lands.",
      },
    ],
  },
  {
    id: "ux",
    label: "User Experience",
    color: "#3498db",
    responsibility:
      "Handle all five async states (loading / error / success / empty / offline) and use virtualization for long lists.",
    status: "partial",
    evidence: [
      "Skeleton components and ErrorBoundary patterns are present across the apps.",
      "No `useInfiniteQuery` and no list virtualization detected — long lists likely render all nodes.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Guarantee the empty + offline states, not just loading/error",
        detail:
          "Skeletons and error boundaries exist; verify every async list also has a real empty state (with a call to action) and an offline affordance, per the guide's five-state rule.",
      },
      {
        severity: "med",
        title: "Virtualize long lists",
        detail:
          "With no virtualization in place, large holdings/transaction lists accumulate thousands of DOM nodes. Adopt a virtual list (e.g. TanStack Virtual) for any list that can exceed a few hundred rows.",
      },
    ],
  },
  {
    id: "i18n",
    label: "i18n & Accessibility",
    color: "#e91e63",
    responsibility:
      "Locale-aware formatting, no hardcoded strings, RTL readiness — and (for this platform) WCAG 2.1 AA conformance across all tenants.",
    status: "gap",
    evidence: [
      "No i18n framework (i18next / react-intl / next-intl) and zero `useTranslation` usage — strings are hardcoded.",
      "aria-* attributes appear widely, but the Contrast Gate described in CONTEXT.md is NOT yet implemented (0 contrast checks in packages/design-tokens).",
      "CONTEXT.md commits to WCAG 2.1 AA across all tenants, ending in an IAAP external audit.",
    ],
    actionables: [
      {
        severity: "high",
        title: "Implement the Contrast Gate the docs already promise",
        detail:
          "CONTEXT.md specifies a Contrast Gate at the palette-generation boundary (getTenantConfigById / CI) rejecting palettes failing 4.5:1 text / 3:1 non-text. It does not exist yet. Without it a newly onboarded tenant can ship a non-conformant palette — directly undermining the all-tenant WCAG AA commitment.",
      },
      {
        severity: "med",
        title: "Introduce an i18n framework before strings calcify",
        detail:
          "An Indian multi-tenant fintech with zero translation infrastructure will pay dearly to retrofit. Adopt translation keys and Intl.NumberFormat for INR formatting now, even if only one locale ships initially.",
      },
      {
        severity: "med",
        title: "Mirror the IAAP manual method in CI, not just a scanner",
        detail:
          "Automated scanners catch ~30-40% of failures (CONTEXT.md). Pair axe/lint with a keyboard-only + screen-reader checklist on key flows so the internal process matches how the external auditor will actually test.",
      },
    ],
  },
  {
    id: "patterns",
    label: "Common Patterns",
    color: "#f1c40f",
    responsibility:
      "Apply reducer/Flux for complex state, event sourcing for auditable history, and offline-first where the network is unreliable.",
    status: "good",
    evidence: [
      "AI Advice Audit doctype (CONTEXT.md) is event-sourcing-flavored: stores inputs, model version, rationale, advisor edits for SEBI record-keeping.",
      "Feature-flag + reducer-style config drives tenant behavior cleanly.",
      "Mobile-app navigation has an explicit pop-not-push convention (ADR 0002) — disciplined state of the nav stack.",
    ],
    actionables: [
      {
        severity: "med",
        title: "Treat the AI Advice Audit as an append-only event log",
        detail:
          "For SEBI defensibility, ensure audit records are immutable and versioned (never updated in place) so the full decision history of any advice draft can be replayed.",
      },
      {
        severity: "low",
        title: "Define an offline strategy for the mobile client",
        detail:
          "The mobile app fetches Frappe directly. Decide per surface: cache-first vs network-first, and queue writes for Background Sync where a client may be mid-form on a flaky connection.",
      },
    ],
  },
];

// Back-compat alias — older imports referenced `sections`.
export const sections = guideAreas;

// ── ACTIONABLES ─────────────────────────────────────────────────────────────
// Forward-looking initiatives — things we can actually build next, each with a
// goal, the rationale, and ordered steps. Distinct from the per-area
// `actionables` above (which are audit findings); these are owned projects.
export const actionables = [
  {
    id: "security-web",
    label: "Security · Web",
    color: "#ef4444",
    effort: "High",
    impact: "Critical",
    goal:
      "Close the authentication and authorization holes in planner-portal and client-portal: a forgeable boolean session gate, a session-minting endpoint that trusts a client email, and API routes that forward to Frappe with a shared token and no per-user check. These are exploitable today, not future risks.",
    why: [
      "POST /api/create-session (planner-portal/app/api/create-session/route.ts) mints an authenticated session from just an email in the request body — no password, no OTP, no environment guard. Anyone who can reach the URL can log in as any advisor.",
      "Auth is gated on a static boolean cookie: middleware.ts only checks loggedInSuccessful === 'true'. It proves nothing — there is no signed/verified session behind it, and the client also writes the same flag to localStorage (storageHelper).",
      "API routes are unprotected: middleware.ts exempts /api/* entirely, and routes like app/api/accounts/route.ts forward to Frappe with a shared FRAPPE_AUTH_TOKEN and zero per-user checks — GET returns all clients. Broken access control across both portals.",
      "No Content-Security-Policy or security headers exist in either next.config.ts, and both portals build with ignoreBuildErrors + ignoreDuringBuilds, so type/lint-level regressions ship silently.",
      "Worth keeping: there are 0 real dangerouslySetInnerHTML and 0 eval/new Function in app source (the earlier '61 files' figure was counting node_modules), and the web session cookies are httpOnly. The gap is auth design, not raw XSS sinks.",
    ],
    steps: [
      {
        severity: "high",
        title: "Lock down /api/create-session and the OTP bypass",
        detail:
          "create-session must never trust a client-supplied email. Require a verified Frappe credential/OTP exchange server-side before setting cookies, or delete the endpoint. Remove the '010101' bypass in login/page.tsx — it relies on a public NEXT_PUBLIC_ENVIRONMENT flag and an unguarded endpoint, so it is effectively live in prod.",
      },
      {
        severity: "high",
        title: "Authenticate and authorize every API route",
        detail:
          "Stop exempting /api/* in middleware. Add a server-side guard (verify the session, resolve the user, enforce role/ownership) on each route before it forwards to Frappe. /api/accounts returning all clients on an unauthenticated GET is the canonical bug to fix first.",
      },
      {
        severity: "high",
        title: "Replace the boolean session gate with a verified session",
        detail:
          "loggedInSuccessful='true' carries no proof. Move to a signed, httpOnly session token (or validate the Frappe sid server-side) and check that in middleware. Treat any client-set auth flag as untrusted.",
      },
      {
        severity: "med",
        title: "Ship a Content-Security-Policy and security headers",
        detail:
          "Add a nonce-based CSP plus HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy via next.config headers() or middleware. Start CSP in Report-Only, then enforce. This is the backstop if any injection slips in later.",
      },
      {
        severity: "med",
        title: "Stop disabling type and lint checks at build",
        detail:
          "Remove ignoreBuildErrors and ignoreDuringBuilds from both next.config.ts. They let a whole class of correctness and security issues (unchecked inputs, wrong types on auth paths) reach production unflagged. Fix the backlog behind a one-time burn-down.",
      },
      {
        severity: "med",
        title: "Move auth state and PII out of localStorage",
        detail:
          "userInfo / userEmail / loggedInSuccessful in localStorage (storageHelper web) are JS-readable and XSS-exfiltratable, and let the client fake 'logged in' UI. Keep identity in httpOnly cookies; localStorage should hold only non-sensitive UI state.",
      },
      {
        severity: "low",
        title: "Add a SAST + dependency gate to CI",
        detail:
          "Run a SAST pass (e.g. semgrep) over the API + auth surface and a dependency audit on every PR, blocking, so the fixes above do not silently regress.",
      },
    ],
  },
  {
    id: "security-mobile",
    label: "Security · Mobile",
    color: "#c0392b",
    effort: "High",
    impact: "Critical",
    goal:
      "Get the Frappe API token out of the Expo bundle and put a server layer between the mobile app and Frappe, so a decompiled app no longer yields a broad-privilege credential.",
    why: [
      "The mobile app embeds EXPO_PUBLIC_FRAPPE_TOKEN (174 references) and calls Frappe directly (app/api/mf/frappeClient.ts). EXPO_PUBLIC_* values are baked into the shipped JS bundle and extractable from the app binary — a single broad-privilege token leaks to every device.",
      "There is no BFF / server route layer on mobile: the shared token is the only thing between the device and Frappe, and it is the same token for every user, so there is no per-user authorization.",
      "frappeClient.ts already anticipates this ('On a real deployment these would move behind a BFF; for now they mirror the existing direct-Frappe calls').",
      "AsyncStorage (used for fipConsentDetails_*, reset-password email, etc.) is unencrypted at rest, so anything sensitive placed there is readable on a compromised device.",
    ],
    steps: [
      {
        severity: "high",
        title: "Route mobile through a BFF and kill the embedded token",
        detail:
          "Stand up a server proxy that holds the Frappe token server-side and exposes only the endpoints the app needs. The app authenticates the user and receives a short-lived per-user session; EXPO_PUBLIC_FRAPPE_TOKEN is deleted entirely.",
      },
      {
        severity: "high",
        title: "Issue short-lived, per-user sessions",
        detail:
          "Replace the single shared token with per-user tokens that expire and can be revoked, so authorization is scoped to the signed-in user instead of one omnipotent credential shared by every install.",
      },
      {
        severity: "med",
        title: "Audit AsyncStorage; use SecureStore for anything sensitive",
        detail:
          "AsyncStorage is not encrypted. Keep tokens/PII out of it and move any sensitive material (session tokens, consent identifiers) to expo-secure-store (Keychain / Keystore).",
      },
      {
        severity: "low",
        title: "Add secret scanning so no EXPO_PUBLIC token is committed",
        detail:
          "Gate CI on a secret scan so an EXPO_PUBLIC_*_TOKEN or FRAPPE_AUTH_TOKEN can never re-enter the bundle once the BFF lands.",
      },
    ],
  },
  {
    id: "internationalization",
    label: "Internationalization",
    color: "#e91e63",
    effort: "Medium",
    impact: "High",
    goal:
      "Stand up a translation layer plus locale-aware formatting so the platform can ship in multiple Indian locales without retrofitting hardcoded strings later.",
    why: [
      "Zero translation infrastructure today — no i18next / react-intl / next-intl, and strings are hardcoded across all three apps (see Guide → i18n & Accessibility).",
      "An Indian multi-tenant fintech will face Hindi + regional-language demand early; partners and regulators increasingly expect vernacular UX.",
      "Retrofitting i18n after thousands of strings calcify is dramatically more expensive than adopting keys while the surface area is still small.",
      "Currency/date formatting is currently ad-hoc; Intl.* gives correct INR grouping (lakh/crore) and locale dates for free.",
    ],
    steps: [
      {
        severity: "high",
        title: "Pick the framework per platform",
        detail:
          "next-intl for the two Next.js App Router apps (planner-portal, client-portal); i18next/expo-localization for the Expo mobile app. Standardize on one message-catalog format (ICU MessageFormat) so copy is portable across all three.",
      },
      {
        severity: "high",
        title: "Wrap each app in a locale provider + thread locale through routing",
        detail:
          "Add the provider at the app shell, resolve the active locale from tenant config / Accept-Language / a user setting, and make it part of the route (e.g. /[locale]/...) so SSR renders the right language.",
      },
      {
        severity: "med",
        title: "Extract hardcoded strings into namespaced catalogs",
        detail:
          "Start with a single en-IN catalog and migrate strings domain by domain (auth, dashboard, portfolio). Namespacing keeps catalogs reviewable and lets translators work per area.",
      },
      {
        severity: "med",
        title: "Replace ad-hoc formatting with Intl.NumberFormat / Intl.DateTimeFormat",
        detail:
          "Centralize money/number/date formatting in shared helpers using Intl with the en-IN locale (INR symbol, lakh/crore grouping). Removes scattered toLocaleString / manual string concatenation.",
      },
      {
        severity: "low",
        title: "Add a lint/CI gate against new hardcoded JSX strings",
        detail:
          "Wire eslint-plugin-i18next (or react/jsx-no-literals) so new untranslated literals fail PR review, preventing regression once the catalogs exist.",
      },
      {
        severity: "low",
        title: "RTL-readiness pass",
        detail:
          "Switch to logical CSS properties (margin-inline, padding-inline) and `dir` propagation so a future RTL locale doesn't require a layout rewrite.",
      },
    ],
  },
  {
    id: "theme-mode",
    label: "Light / Dark Mode UI",
    color: "#6c5ce7",
    effort: "Medium",
    impact: "Medium",
    goal:
      "Ship a token-driven theme system supporting light, dark, and system modes — layered on top of the existing tenant palette — with a user toggle and a no-flash persisted preference.",
    why: [
      "Tenant palettes already flow through packages/design-tokens, so a theme mode is a natural extension of infrastructure that exists rather than a greenfield system.",
      "The Contrast Gate the docs promise (Guide → i18n & Accessibility) must validate BOTH light and dark palettes for WCAG AA — building dark mode forces that gate to be real.",
      "Doing theming via semantic tokens eliminates the hardcoded hex colors scattered across components, which is also what makes per-tenant palettes safe.",
      "Dark mode is now a baseline user expectation, especially for finance dashboards people read for long sessions.",
    ],
    steps: [
      {
        severity: "high",
        title: "Define semantic color tokens with light + dark values",
        detail:
          "In packages/design-tokens, introduce role-based tokens (bg, surface, text, muted, border, accent) each carrying a light and a dark value, derived from the tenant palette. Components reference roles, never raw hex.",
      },
      {
        severity: "high",
        title: "Run both palettes through the Contrast Gate",
        detail:
          "Extend the promised Contrast Gate to check the generated light AND dark token sets against 4.5:1 (text) / 3:1 (non-text). A tenant palette that only passes in light mode must fail CI.",
      },
      {
        severity: "med",
        title: "Add a ThemeProvider that emits CSS variables on :root",
        detail:
          "Expose mode = light | dark | system and write the active token set as CSS custom properties. Components style against var(--bg) etc., so a mode switch is a single attribute flip with no re-render storms.",
      },
      {
        severity: "med",
        title: "Persist preference with no flash of wrong theme",
        detail:
          "Store the choice in a cookie (readable during SSR) and default to prefers-color-scheme. Set the initial theme attribute before hydration so the page never flashes the wrong palette.",
      },
      {
        severity: "med",
        title: "Migrate hardcoded component colors to semantic tokens",
        detail:
          "Sweep the apps for inline hex / fixed greys and replace with token references. This is the bulk of the work and the prerequisite for the toggle actually theming everything.",
      },
      {
        severity: "low",
        title: "Add the toggle control to the app shell",
        detail:
          "A small light/dark/system control in the header or settings, wired to the ThemeProvider. Last step — only meaningful once tokens and persistence are in place.",
      },
    ],
  },
];
