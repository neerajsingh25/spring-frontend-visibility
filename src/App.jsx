import { useState, useMemo } from "react";
import { guideAreas, repos, meta } from "./data.js";

const STATUS = {
  good: { label: "On Track", color: "#27ae60", icon: "✓" },
  partial: { label: "Partial", color: "#f5a623", icon: "◑" },
  gap: { label: "Gap", color: "#e74c3c", icon: "✕" },
};

const SEVERITY = {
  high: { label: "High", color: "#e74c3c" },
  med: { label: "Medium", color: "#f5a623" },
  low: { label: "Low", color: "#3498db" },
};

const sevOrder = (s) => ["high", "med", "low"].indexOf(s);

// ── Small presentational atoms ──────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.color + "1f",
        border: `1px solid ${s.color}55`,
        borderRadius: 20,
        padding: "2px 9px",
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function Tag({ label, value, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: "#c9d1d9",
        background: "#11151f",
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: "3px 11px",
      }}
    >
      <span style={{ color: "#8b949e", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{ color }}>{value}</span>
    </span>
  );
}

function RepoChip({ color, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color,
        background: color + "18",
        border: `1px solid ${color}44`,
        borderRadius: 6,
        padding: "3px 9px",
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }}
      />
      {children}
    </span>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  // active is { kind: "guide" | "action", id }
  const [active, setActive] = useState({
    kind: "action",
    id: repos[0].actionables[0].id,
  });

  // Repo accordions open by default; guide collapsed (least priority).
  const [openRepos, setOpenRepos] = useState(() =>
    Object.fromEntries(repos.map((r) => [r.id, true]))
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const toggleRepo = (id) => setOpenRepos((o) => ({ ...o, [id]: !o[id] }));

  const allActionables = useMemo(
    () => repos.flatMap((r) => r.actionables.map((a) => ({ ...a, repo: r.id }))),
    []
  );

  const current =
    active.kind === "guide"
      ? guideAreas.find((s) => s.id === active.id)
      : allActionables.find((a) => a.id === active.id);

  const currentRepo =
    active.kind === "action" ? repos.find((r) => r.id === current?.repo) : null;

  const score = useMemo(() => {
    const totalInitiatives = allActionables.length;
    const totalSteps = allActionables.reduce((n, a) => n + a.steps.length, 0);
    const high = allActionables.reduce(
      (n, a) => n + a.steps.filter((s) => s.severity === "high").length,
      0
    );
    const critical = allActionables.filter((a) => a.impact === "Critical").length;
    return { totalInitiatives, totalSteps, high, critical };
  }, [allActionables]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 272,
          background: "linear-gradient(180deg, #11151f 0%, #0d1118 100%)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "18px 16px 12px" }} className="anim-fade-in">
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: "linear-gradient(135deg,#34d399,#1675F4)",
                boxShadow: "0 0 12px #1675F488",
              }}
            />
            {meta.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, lineHeight: 1.4 }}>
            {meta.subtitle}
          </div>
        </div>

        {/* Score strip */}
        <div
          style={{
            margin: "4px 16px 14px",
            padding: "11px 12px",
            background: "#0b0e14",
            border: "1px solid var(--border)",
            borderRadius: 10,
            display: "flex",
            gap: 8,
          }}
          className="anim-fade-up"
        >
          <ScorePill n={score.totalInitiatives} label="Initiatives" color="#4f9bff" />
          <ScorePill n={score.critical} label="Critical" color="#e74c3c" />
          <ScorePill n={score.high} label="High steps" color="#f5a623" />
        </div>

        {/* ── Actionables, by repository (PRIMARY) ── */}
        <SectionTitle>Actionables · by repository</SectionTitle>
        {repos.map((repo, ri) => (
          <div key={repo.id} style={{ marginBottom: 2 }}>
            <RepoHeader
              repo={repo}
              open={openRepos[repo.id]}
              onClick={() => toggleRepo(repo.id)}
            />
            {openRepos[repo.id] &&
              repo.actionables.map((a, i) => {
                const isActive = active.kind === "action" && active.id === a.id;
                return (
                  <NavItem
                    key={a.id}
                    isActive={isActive}
                    accent={a.color}
                    onClick={() => setActive({ kind: "action", id: a.id })}
                    style={{ animationDelay: `${i * 35}ms` }}
                    right={
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: a.impact === "Critical" ? "#e74c3c" : a.color,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {a.impact}
                      </span>
                    }
                  >
                    {a.label}
                  </NavItem>
                );
              })}
          </div>
        ))}

        {/* ── Guide (LEAST PRIORITY) ── */}
        <div style={{ marginTop: 18, opacity: 0.78 }}>
          <button
            onClick={() => setGuideOpen((g) => !g)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              textAlign: "left",
              padding: "10px 16px",
              marginTop: 6,
              background: "transparent",
              border: "none",
              borderTop: "1px solid var(--border-soft)",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-faint)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            <span className={`chev${guideOpen ? " open" : ""}`} style={{ fontSize: 9 }}>
              ▶
            </span>
            <span>Reference · Frontend Guide</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-faint)",
                background: "#0b0e14",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0 6px",
              }}
            >
              {guideAreas.length}
            </span>
          </button>
          {guideOpen &&
            guideAreas.map((s, i) => {
              const st = STATUS[s.status];
              const isActive = active.kind === "guide" && active.id === s.id;
              return (
                <NavItem
                  key={s.id}
                  isActive={isActive}
                  accent={s.color}
                  dim
                  onClick={() => setActive({ kind: "guide", id: s.id })}
                  style={{ animationDelay: `${i * 25}ms` }}
                  right={<span style={{ color: st.color, fontSize: 12 }}>{st.icon}</span>}
                >
                  {s.label}
                </NavItem>
              );
            })}
        </div>

        <div
          style={{
            padding: "16px",
            marginTop: 10,
            fontSize: 10,
            color: "var(--text-faint)",
            lineHeight: 1.7,
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          {score.totalInitiatives} initiatives · {score.totalSteps} steps · {score.high} high-severity
          <br />
          {repos.length} repositories · {guideAreas.length} guide areas
          <br />
          {meta.org} · generated {meta.generated}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "30px 40px" }}>
        {/* key forces remount → re-runs entrance animation on navigation */}
        <div key={`${active.kind}:${active.id}`} className="anim-fade-up">
          {active.kind === "guide" ? (
            <GuideView section={current} />
          ) : (
            <ActionableView item={current} repo={currentRepo} />
          )}
        </div>
        <div style={{ height: 48 }} />
      </main>
    </div>
  );
}

// ── Views ───────────────────────────────────────────────────────────────────
function ActionableView({ item, repo }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: "var(--text-dim)",
          marginBottom: 10,
        }}
      >
        <RepoChip color={repo.color}>{repo.label}</RepoChip>
        <span style={{ color: "var(--text-faint)" }}>→ Actionable</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#f0f0f0", letterSpacing: -0.5 }}>
          {item.label}
        </h1>
        <Tag label="Effort" value={item.effort} color={item.color} />
        <Tag label="Impact" value={item.impact} color={item.impact === "Critical" ? "#e74c3c" : item.color} />
      </div>

      {/* Goal */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #1a2130 0%, #161b26 100%)",
          border: `1px solid ${item.color}33`,
          borderLeft: `4px solid ${item.color}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 24,
          fontSize: 15,
          color: "#c9d1d9",
          lineHeight: 1.65,
        }}
        className="anim-fade-up"
      >
        <span style={{ fontWeight: 700, color: item.color }}>Goal: </span>
        {item.goal}
      </div>

      <Panel title="Why now">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.85, color: "#c9d1d9", fontSize: 14 }}>
          {item.why.map((w, i) => (
            <li key={i} className="anim-fade-up" style={{ animationDelay: `${80 + i * 50}ms` }}>
              {w}
            </li>
          ))}
        </ul>
      </Panel>

      <SectionLabel>Steps ({item.steps.length})</SectionLabel>
      <StepList items={item.steps} />
    </>
  );
}

function GuideView({ section }) {
  return (
    <>
      <div style={{ fontSize: 12, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 8 }}>
        Reference · Frontend Guide → manthan-os-monorepo
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#f0f0f0" }}>{section.label}</h1>
        <Badge status={section.status} />
      </div>

      <div
        style={{
          background: "#161b26",
          border: `1px solid ${section.color}33`,
          borderLeft: `4px solid ${section.color}`,
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 22,
          fontSize: 15,
          color: "#c9d1d9",
          lineHeight: 1.6,
        }}
        className="anim-fade-up"
      >
        <span style={{ fontWeight: 700, color: section.color }}>Lead responsibility: </span>
        {section.responsibility}
      </div>

      <Panel title="What's in the repo today">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: "#c9d1d9", fontSize: 14 }}>
          {section.evidence.map((e, i) => (
            <li key={i} className="anim-fade-up" style={{ animationDelay: `${60 + i * 40}ms` }}>
              {e}
            </li>
          ))}
        </ul>
      </Panel>

      <SectionLabel>Findings ({section.actionables.length})</SectionLabel>
      <StepList items={section.actionables} />
    </>
  );
}

// Shared severity-card list, used by findings and actionable steps.
function StepList({ items }) {
  const sorted = items.slice().sort((a, b) => sevOrder(a.severity) - sevOrder(b.severity));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sorted.map((a, i) => {
        const sev = SEVERITY[a.severity];
        return (
          <div
            key={i}
            className="lift anim-fade-up"
            style={{
              background: "#141923",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${sev.color}`,
              borderRadius: 10,
              padding: "15px 18px",
              animationDelay: `${120 + i * 60}ms`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 8px 24px -12px ${sev.color}aa`;
              e.currentTarget.style.borderLeftColor = sev.color;
              e.currentTarget.style.background = "#171d28";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#141923";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span
                className="sev-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: sev.color,
                  color: sev.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: sev.color,
                  background: sev.color + "1f",
                  border: `1px solid ${sev.color}55`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {sev.label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>{a.title}</span>
            </div>
            <div style={{ fontSize: 14, color: "#c9d1d9", lineHeight: 1.65, paddingLeft: 18 }}>
              {a.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sidebar building blocks ─────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div
      style={{
        padding: "6px 16px 8px",
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-faint)",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function RepoHeader({ repo, open, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "calc(100% - 20px)",
        margin: "4px 10px",
        textAlign: "left",
        padding: "10px 11px",
        background: open ? repo.color + "14" : "transparent",
        border: `1px solid ${open ? repo.color + "3a" : "transparent"}`,
        borderRadius: 9,
        cursor: "pointer",
        transition: "background 0.18s ease, border-color 0.18s ease",
      }}
    >
      <span className={`chev${open ? " open" : ""}`} style={{ fontSize: 9, color: repo.color }}>
        ▶
      </span>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 3,
          background: repo.color,
          boxShadow: `0 0 10px ${repo.color}88`,
          flexShrink: 0,
        }}
      />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#e6edf3",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {repo.short}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{repo.label}</span>
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: repo.color,
          background: repo.color + "1c",
          borderRadius: 20,
          padding: "1px 8px",
        }}
      >
        {repo.actionables.length}
      </span>
    </button>
  );
}

function NavItem({ isActive, accent, onClick, right, children, dim, style }) {
  return (
    <button
      onClick={onClick}
      className="nav-item anim-slide-left"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: dim ? "8px 16px 8px 30px" : "9px 16px 9px 30px",
        background: isActive ? accent + "1a" : "transparent",
        border: "none",
        borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
        color: isActive ? "#e6edf3" : dim ? "var(--text-faint)" : "var(--text-dim)",
        cursor: "pointer",
        fontSize: dim ? 12 : 13,
        fontWeight: isActive ? 700 : 500,
        ...style,
      }}
    >
      <span
        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {children}
      </span>
      {right}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--text-dim)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        margin: "28px 0 12px",
      }}
    >
      {children}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
      }}
      className="anim-fade-up"
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ScorePill({ n, label, color }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{n}</div>
      <div
        style={{
          fontSize: 9,
          color: "var(--text-faint)",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginTop: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 2,
          marginTop: 5,
          borderRadius: 2,
          background: color,
          opacity: 0.7,
        }}
        className="bar-fill"
      />
    </div>
  );
}
