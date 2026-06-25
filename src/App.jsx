import { useState, useMemo } from "react";
import { guideAreas, actionables, meta } from "./data.js";

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
        background: "#161b22",
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

export default function App() {
  // active is { kind: "guide" | "action", id }
  const [active, setActive] = useState({ kind: "guide", id: guideAreas[0].id });
  // accordion open/closed state per nav group
  const [open, setOpen] = useState({ guide: true, action: true });
  const toggle = (group) => setOpen((o) => ({ ...o, [group]: !o[group] }));

  const current =
    active.kind === "guide"
      ? guideAreas.find((s) => s.id === active.id)
      : actionables.find((a) => a.id === active.id);

  const score = useMemo(() => {
    const counts = { good: 0, partial: 0, gap: 0 };
    guideAreas.forEach((s) => (counts[s.status] += 1));
    const totalActions = guideAreas.reduce((n, s) => n + s.actionables.length, 0);
    const high = guideAreas.reduce(
      (n, s) => n + s.actionables.filter((a) => a.severity === "high").length,
      0
    );
    return { ...counts, totalActions, high };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          background: "#161b22",
          borderRight: "1px solid #30363d",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "18px 16px 10px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0" }}>
            Spring Frontend Visibility
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 3, lineHeight: 1.4 }}>
            {meta.repo}
          </div>
        </div>

        <div
          style={{
            margin: "4px 16px 12px",
            padding: "10px 12px",
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: 8,
            display: "flex",
            gap: 10,
            fontSize: 11,
          }}
        >
          <ScorePill n={score.good} label="On track" color="#27ae60" />
          <ScorePill n={score.partial} label="Partial" color="#f5a623" />
          <ScorePill n={score.gap} label="Gaps" color="#e74c3c" />
        </div>

        {/* Guide section */}
        <NavHeader open={open.guide} count={guideAreas.length} onClick={() => toggle("guide")}>
          Guide
        </NavHeader>
        {open.guide &&
          guideAreas.map((s) => {
            const st = STATUS[s.status];
            const isActive = active.kind === "guide" && active.id === s.id;
            return (
              <NavItem
                key={s.id}
                isActive={isActive}
                accent={s.color}
                onClick={() => setActive({ kind: "guide", id: s.id })}
                right={<span style={{ color: st.color, fontSize: 13 }}>{st.icon}</span>}
              >
                {s.label}
              </NavItem>
            );
          })}

        {/* Actionables section */}
        <NavHeader open={open.action} count={actionables.length} onClick={() => toggle("action")}>
          Actionables
        </NavHeader>
        {open.action &&
          actionables.map((a) => {
            const isActive = active.kind === "action" && active.id === a.id;
            return (
              <NavItem
                key={a.id}
                isActive={isActive}
                accent={a.color}
                onClick={() => setActive({ kind: "action", id: a.id })}
                right={<span style={{ color: a.color, fontSize: 13 }}>→</span>}
              >
                {a.label}
              </NavItem>
            );
          })}

        <div
          style={{
            padding: "16px",
            marginTop: 8,
            fontSize: 10,
            color: "#6e7681",
            lineHeight: 1.6,
            borderTop: "1px solid #30363d",
          }}
        >
          {score.high} high-severity findings · {score.totalActions} total
          <br />
          {actionables.length} initiatives queued
          <br />
          Generated {meta.generated}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
        {active.kind === "guide" ? (
          <GuideView section={current} />
        ) : (
          <ActionableView item={current} />
        )}
        <div style={{ height: 40 }} />
      </main>
    </div>
  );
}

function GuideView({ section }) {
  return (
    <>
      <div
        style={{
          fontSize: 12,
          color: "#8b949e",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        Guide → manthan-os-monorepo
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#f0f0f0" }}>
          {section.label}
        </h1>
        <Badge status={section.status} />
      </div>

      {/* Responsibility */}
      <div
        style={{
          background: "#1e2433",
          border: `1px solid ${section.color}33`,
          borderLeft: `4px solid ${section.color}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 22,
          fontSize: 15,
          color: "#c9d1d9",
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontWeight: 700, color: section.color }}>
          Lead responsibility:{" "}
        </span>
        {section.responsibility}
      </div>

      {/* Evidence */}
      <Panel title="What's in the repo today">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: "#c9d1d9", fontSize: 14 }}>
          {section.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </Panel>

      <SectionLabel>Findings ({section.actionables.length})</SectionLabel>
      <StepList items={section.actionables} />
    </>
  );
}

function ActionableView({ item }) {
  return (
    <>
      <div
        style={{
          fontSize: 12,
          color: "#8b949e",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        Actionables → things we can build next
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#f0f0f0" }}>
          {item.label}
        </h1>
        <Tag label="Effort" value={item.effort} color={item.color} />
        <Tag label="Impact" value={item.impact} color={item.color} />
      </div>

      {/* Goal */}
      <div
        style={{
          background: "#1e2433",
          border: `1px solid ${item.color}33`,
          borderLeft: `4px solid ${item.color}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 22,
          fontSize: 15,
          color: "#c9d1d9",
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontWeight: 700, color: item.color }}>Goal: </span>
        {item.goal}
      </div>

      {/* Why */}
      <Panel title="Why now">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: "#c9d1d9", fontSize: 14 }}>
          {item.why.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </Panel>

      <SectionLabel>Steps ({item.steps.length})</SectionLabel>
      <StepList items={item.steps} />
    </>
  );
}

// Shared severity-card list, used by both findings and actionable steps.
function StepList({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items
        .slice()
        .sort(
          (a, b) =>
            ["high", "med", "low"].indexOf(a.severity) -
            ["high", "med", "low"].indexOf(b.severity)
        )
        .map((a, i) => {
          const sev = SEVERITY[a.severity];
          return (
            <div
              key={i}
              style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderLeft: `4px solid ${sev.color}`,
                borderRadius: 8,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
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
                <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>
                  {a.title}
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#c9d1d9", lineHeight: 1.6 }}>
                {a.detail}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function NavHeader({ children, open, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        textAlign: "left",
        padding: "14px 16px 8px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 10,
        fontWeight: 700,
        color: "#8b949e",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s ease",
          fontSize: 9,
        }}
      >
        ▶
      </span>
      <span>{children}</span>
      {count != null && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#6e7681",
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: 10,
            padding: "0 6px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NavItem({ isActive, accent, onClick, right, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        textAlign: "left",
        padding: "10px 16px",
        background: isActive ? "#21262d" : "transparent",
        border: "none",
        borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
        color: isActive ? "#e0e0e0" : "#8b949e",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span>{children}</span>
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
        color: "#8b949e",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        margin: "26px 0 12px",
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
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#8b949e",
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
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 9, color: "#8b949e", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
