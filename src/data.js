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
  org: "Spring-money",
  title: "Spring Frontend Visibility",
  subtitle: "Audit & actionables across the Spring frontend estate",
  generated: "2026-06-26",
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
      "POST /api/create-session sets valid auth cookies from just an email — no password, no OTP. The login UI only calls it behind a client-side non-prod check (NEXT_PUBLIC_ENVIRONMENT !== 'PROD'), but the route itself has no env/auth guard, so in prod it can still be hit directly (curl/Postman) to forge a session. The flag guards the button, not the endpoint.",
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

// ── ACTIONABLES, BY REPOSITORY ──────────────────────────────────────────────
// Forward-looking initiatives — things we can actually build next, each with a
// goal, the rationale, and ordered steps. Grouped per repository so each team
// sees the work that belongs to their codebase. Distinct from the per-area
// guide `actionables` above (which are read-only audit findings).
//
// money-lancer findings gathered 2026-06-26 against Spring-money/money-lancer
// (apps/web-portal = Distributor Portal Next 15, apps/mobile = Client App Expo SDK 54).

const manthanActionables = [
  {
    id: "security-web",
    label: "Security · Web",
    color: "#ef4444",
    effort: "High",
    impact: "Critical",
    goal:
      "Close the authentication and authorization holes in planner-portal and client-portal: a forgeable boolean session gate, a session-minting endpoint that trusts a client email, and API routes that forward to Frappe with a shared token and no per-user check. These are exploitable today, not future risks.",
    why: [
      "POST /api/create-session (planner-portal/app/api/create-session/route.ts) sets valid auth cookies from just an email in the body — no password, no OTP. The login UI only calls it behind a non-prod check (NEXT_PUBLIC_ENVIRONMENT !== 'PROD'), but that guard is client-side and the route itself has no env/auth guard: the route ships in every environment, so in prod it can still be hit directly (curl/Postman) to forge a session as any advisor. The flag protects the button, not the endpoint.",
      "Auth is gated on a static boolean cookie: middleware.ts only checks loggedInSuccessful === 'true' (and the matcher even excludes /api/*, so nothing inspects the call above). It proves nothing — there is no signed/verified session behind it, and the client also writes the same flag to localStorage (storageHelper).",
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

const moneyLancerActionables = [
  {
    id: "ml-security-web",
    label: "Security · Distributor Portal",
    color: "#ef4444",
    effort: "High",
    impact: "Critical",
    goal:
      "apps/web-portal ships a placeholder auth system: the session cookie is never validated, /api/auth/create-session mints a session from just a mobile number, middleware leaves every /api route open, and each route forwards to Frappe with one shared admin token while trusting a client_id query param. A distributor — or anyone with curl — can read any client's portfolio today.",
    why: [
      "POST /api/auth/create-session sets an httpOnly auth_session cookie from a `mobile` value in the request body — no OTP is verified at this endpoint. The session token is `crypto.randomBytes(32)` that is then thrown away; the route's own comment admits it: 'You might want to store this in a database with the user's mobile number'.",
      "GET /api/auth/check-session only checks that the cookie is present. Its comment says it plainly: 'In a real implementation, you would validate the session token against your database.' Any non-empty auth_session value is treated as authenticated.",
      "middleware.ts gates pages on the mere presence of the auth_session cookie, and its matcher explicitly excludes /api — so no API route is authenticated at the edge at all.",
      "Every route under app/api/* (e.g. clients/client-listNew, clients/getFamilyById, clients/sip-data) forwards to Frappe with the shared MONEY_LANCER_FRAPPE_AUTH_TOKEN and reads client_id / family id straight from the query string — a textbook IDOR: change the id, read another distributor's client.",
      "No Content-Security-Policy or security headers exist in next.config — a grep for headers()/CSP returns nothing.",
    ],
    steps: [
      {
        severity: "high",
        title: "Make the session real and actually validate it",
        detail:
          "Persist or sign the session token at create-session and verify it in BOTH check-session and middleware. Right now the token is random bytes that are never stored, so a forged or even empty auth_session cookie passes every check. This is the root of the whole gap.",
      },
      {
        severity: "high",
        title: "Gate create-session behind a verified OTP",
        detail:
          "create-session must not mint a session from an unauthenticated `mobile` in the body. Require the send-otp / verify-otp exchange to complete server-side first, and only then set the cookie. Until then the login is effectively 'type any phone number'.",
      },
      {
        severity: "high",
        title: "Authenticate and authorize every /api route",
        detail:
          "Remove the `api` exclusion from the middleware matcher (or add a per-route guard), resolve the distributor from a validated session, and scope each Frappe call to what that distributor owns before forwarding the admin-token request.",
      },
      {
        severity: "high",
        title: "Close the client_id / family-id IDOR",
        detail:
          "Routes that accept client_id or family id as a query param must verify the logged-in distributor is actually mapped to that client before calling Frappe. Identity (a session) is not authority (ownership) — enforce ownership server-side on every read and write.",
      },
      {
        severity: "med",
        title: "Ship a CSP and security headers",
        detail:
          "Add a nonce-based CSP plus HSTS, frame-ancestors, X-Content-Type-Options and Referrer-Policy via next.config headers(). Start CSP in Report-Only, then enforce. None of this exists today.",
      },
      {
        severity: "low",
        title: "Add a SAST + dependency gate to CI",
        detail:
          "Run semgrep over the auth + API surface and a dependency audit on every PR, blocking, so the fixes above cannot silently regress once shipped.",
      },
    ],
  },
  {
    id: "ml-security-mobile",
    label: "Security · Client App",
    color: "#c0392b",
    effort: "High",
    impact: "Critical",
    goal:
      "A live Frappe admin token is committed to apps/mobile/.env and shipped inside the Expo bundle. Rotate it, get it out of the bundle, and put a BFF between the Client App and Frappe so a decompiled app no longer yields a broad-privilege credential.",
    why: [
      "apps/mobile/.env contains a real, non-placeholder token: EXPO_PUBLIC_FRAPPE_AUTH_TOKEN=7234f1b05839725:86f3aaf3279193d. EXPO_PUBLIC_* values are baked into the shipped JS and extractable from the binary; the token is referenced ~31 times across api/.",
      "The app calls Frappe directly with that shared admin token — api/mf/frappeClient.ts sends `Authorization: token ${EXPO_PUBLIC_FRAPPE_AUTH_TOKEN}`. The file already anticipates the fix: 'On a real deployment these would move behind a BFF; for now they mirror the existing direct-Frappe calls.'",
      "client_id (from client-login, stored in AsyncStorage per ADR 0003) is the only per-user identity. Anyone holding the shared token plus a client_id can read that client — there is no per-user authorization on the device path.",
      "OTP can be skipped: app/(auth)/otp.tsx exposes a 'Skip OTP (UAT only)' path gated on the public EXPO_PUBLIC_ENVIRONMENT !== 'Production' flag — a client-side flag, not a server-side guard.",
    ],
    steps: [
      {
        severity: "high",
        title: "Rotate the leaked token now — it is in git history",
        detail:
          "Treat 7234f1b05839725:86f3aaf3279193d as compromised: revoke and reissue it in Frappe before any other work. Removing it from .env does not undo the commit history; the credential must be rotated.",
      },
      {
        severity: "high",
        title: "Stand up a BFF and delete EXPO_PUBLIC_FRAPPE_AUTH_TOKEN",
        detail:
          "Route mobile traffic through a server proxy that holds the Frappe token server-side and exposes only the endpoints the app needs. The app authenticates the user and receives a short-lived per-user session; the EXPO_PUBLIC token is deleted entirely — exactly the move frappeClient.ts already calls out.",
      },
      {
        severity: "high",
        title: "Issue short-lived, per-user sessions",
        detail:
          "Replace the single shared admin token with per-user tokens that expire and can be revoked, so authorization is scoped to the signed-in client instead of one omnipotent credential present on every install.",
      },
      {
        severity: "med",
        title: "Remove the OTP-skip path from production builds",
        detail:
          "Strip the 'Skip OTP (UAT only)' branch at build time rather than relying on a public EXPO_PUBLIC_ENVIRONMENT flag to hide it. A public flag guards the button, not the flow.",
      },
      {
        severity: "med",
        title: "Audit AsyncStorage; use SecureStore for anything sensitive",
        detail:
          "Storage is namespaced by client_id (ADR 0003) but AsyncStorage is unencrypted at rest. Keep tokens/PII out of it and move any sensitive material to expo-secure-store (Keychain / Keystore).",
      },
      {
        severity: "low",
        title: "Add secret scanning so no EXPO_PUBLIC token re-enters the bundle",
        detail:
          "Gate CI on a secret scan so an EXPO_PUBLIC_*_TOKEN or FRAPPE_AUTH_TOKEN can never be committed again once the BFF lands.",
      },
    ],
  },
  {
    id: "ml-internationalization",
    label: "Internationalization",
    color: "#e91e63",
    effort: "Medium",
    impact: "High",
    goal:
      "Stand up a translation layer plus locale-aware formatting across the Distributor Portal and Client App before hardcoded strings calcify and become expensive to retrofit.",
    why: [
      "Zero translation infrastructure today — no i18next / react-intl / next-intl and no useTranslation usage anywhere across apps/web-portal, apps/mobile, or packages.",
      "Money Lancer is an Indian MFD/advisor platform; Hindi and regional-language demand arrives early, and partners/regulators increasingly expect vernacular UX.",
      "Currency/number formatting is ad-hoc (formatINR / ceilAmount helpers scattered through the calculators and tables) rather than centralized on Intl.* — INR lakh/crore grouping should come from one place.",
      "Retrofitting i18n after thousands of strings exist is dramatically more expensive than adopting keys while the surface area is still small.",
    ],
    steps: [
      {
        severity: "high",
        title: "Pick the framework per platform",
        detail:
          "next-intl for apps/web-portal (App Router); i18next + expo-localization for apps/mobile. Standardize on one ICU MessageFormat catalog format so copy is portable across both apps.",
      },
      {
        severity: "high",
        title: "Wrap each app in a locale provider + thread locale through routing",
        detail:
          "Add the provider at the app shell, resolve the active locale (tenant config / device locale / user setting), and make it part of the route so the Distributor Portal SSRs the right language.",
      },
      {
        severity: "med",
        title: "Extract hardcoded strings into namespaced catalogs",
        detail:
          "Start with a single en-IN catalog and migrate domain by domain (auth, dashboard, portfolio, onboarding). Namespacing keeps catalogs reviewable and lets translators work per area.",
      },
      {
        severity: "med",
        title: "Centralize money/date formatting on Intl.*",
        detail:
          "Replace the scattered formatINR / ceilAmount / toLocaleString work with shared helpers using Intl.NumberFormat / Intl.DateTimeFormat at en-IN (INR symbol, lakh/crore grouping, locale dates).",
      },
      {
        severity: "low",
        title: "Add a lint/CI gate against new hardcoded JSX strings",
        detail:
          "Wire eslint-plugin-i18next (or jsx-no-literals) so new untranslated literals fail PR review once the catalogs exist.",
      },
    ],
  },
  {
    id: "ml-theme-mode",
    label: "Light / Dark Mode UI",
    color: "#6c5ce7",
    effort: "Medium",
    impact: "Medium",
    goal:
      "Ship a token-driven light / dark / system theme on top of the existing packages/design-tokens system, with a user toggle and a no-flash persisted preference.",
    why: [
      "packages/design-tokens already carries semantic roles (roles.ts, semantic.ts, getTheme.ts) and the brand tokens (#1675F4 / Manrope), so a theme mode is an extension of infrastructure that exists rather than a greenfield build.",
      "Components still reference raw hex in places; routing color through semantic roles is also what makes the per-tenant palette path safe.",
      "Dark mode is now a baseline expectation for finance dashboards people read for long sessions.",
      "If a Contrast Gate is ever added at the token boundary, building dark mode forces both palettes to be validated against WCAG AA, not just the light one.",
    ],
    steps: [
      {
        severity: "high",
        title: "Give every semantic role a light + dark value",
        detail:
          "In packages/design-tokens, extend the role tokens (bg, surface, text, muted, border, accent) to each carry a light and a dark value derived from the tenant palette. Components reference roles, never raw hex.",
      },
      {
        severity: "med",
        title: "Add a ThemeProvider that emits the active token set",
        detail:
          "Expose mode = light | dark | system and write the active roles as CSS variables on :root (web) / a theme context (mobile), so a mode switch is a single attribute flip with no re-render storms.",
      },
      {
        severity: "med",
        title: "Persist the preference with no flash of wrong theme",
        detail:
          "Store the choice in a cookie (readable during SSR) on web and AsyncStorage on mobile, default to prefers-color-scheme, and set the initial theme attribute before hydration so the page never flashes the wrong palette.",
      },
      {
        severity: "med",
        title: "Migrate hardcoded component colors to semantic tokens",
        detail:
          "Sweep both apps for inline hex / fixed greys and replace with token references. This is the bulk of the work and the prerequisite for the toggle actually theming everything.",
      },
      {
        severity: "low",
        title: "Add the toggle control to each app shell",
        detail:
          "A small light/dark/system control in the header or settings, wired to the ThemeProvider. Last step — only meaningful once tokens and persistence are in place.",
      },
    ],
  },
];

// Repositories are the top-level grouping for actionables. Each team sees the
// work that belongs to their codebase.
export const repos = [
  {
    id: "manthan",
    label: "manthan-os-monorepo",
    short: "Manthan OS",
    color: "#10b981",
    accent: "#34d399",
    description:
      "Spring's flagship multi-tenant advisory platform — planner & client portals plus the Expo mobile app.",
    apps: [
      "planner-portal (Next.js 15 App Router)",
      "client-portal (Next.js 16 App Router)",
      "mobile-app (Expo SDK 54 / React Native)",
    ],
    actionables: manthanActionables,
  },
  {
    id: "money-lancer",
    label: "money-lancer",
    short: "Money Lancer",
    color: "#1675F4",
    accent: "#4f9bff",
    description:
      "pnpm + Turborepo monorepo for the Money Lancer MFD product — Distributor Portal (web) and Client App (mobile), backed by Frappe.",
    apps: [
      "web-portal · Distributor Portal (Next.js 15 App Router)",
      "mobile · Client App (Expo SDK 54 / React Native)",
    ],
    actionables: moneyLancerActionables,
  },
];

// Flat, repo-tagged list — back-compat for anything iterating all initiatives.
export const actionables = repos.flatMap((r) =>
  r.actionables.map((a) => ({ ...a, repo: r.id, repoLabel: r.label }))
);
