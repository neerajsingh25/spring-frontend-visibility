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

export const sections = [
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
    id: "security",
    label: "Security",
    color: "#e74c3c",
    responsibility:
      "Defend against XSS/CSRF, lock down CORS, ship a Content-Security-Policy, and keep tokens out of JS-readable storage.",
    status: "gap",
    evidence: [
      "`dangerouslySetInnerHTML` in ~61 source files, but DOMPurify/sanitize in 0 — unsanitized HTML injection surface.",
      "No Content-Security-Policy configured in any next.config.",
      "Tokens are server-side for web (good), but localStorage is used widely — needs an audit for anything sensitive.",
    ],
    actionables: [
      {
        severity: "high",
        title: "Sanitize every dangerouslySetInnerHTML",
        detail:
          "61 files inject raw HTML with zero sanitization. Route all of them through DOMPurify (or remove the raw injection). This is the highest-leverage XSS fix in the repo — a single stored-XSS in a fintech client portal is a serious incident.",
      },
      {
        severity: "high",
        title: "Ship a Content-Security-Policy",
        detail:
          "No CSP exists. Add a nonce-based CSP via Next headers/middleware, starting in Report-Only mode to find violations, then enforce. CSP is the backstop that neutralizes an injected script even if sanitization is missed.",
      },
      {
        severity: "med",
        title: "Audit localStorage for sensitive data",
        detail:
          "localStorage is JS-readable and XSS-exfiltratable. Confirm no tokens/PII live there (mobile reset-password flow flagged). Session material belongs in httpOnly cookies, not localStorage.",
      },
      {
        severity: "med",
        title: "Confirm CORS allow-lists, not wildcards",
        detail:
          "For any credentialed API surface, ensure Access-Control-Allow-Origin is an explicit tenant allow-list, never `*` with credentials.",
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
