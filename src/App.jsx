import { useState, useEffect, useRef } from "react";

const CHECKPOINTS = [
  { id: "meeting",    label: "Meeting Passager",          icon: "🤝", color: "#002157" },
  { id: "paf",        label: "Contrôle Passeport (PAF)", icon: "🛂", color: "#1A3A6B" },
  { id: "pif",        label: "Contrôle Sécurité (PIF)",  icon: "🔍", color: "#1A3A6B" },
  { id: "lounge_in",  label: "Dépose au Lounge",          icon: "🛋️", color: "#6B2737" },
  { id: "lounge_out", label: "Récupération au Lounge",    icon: "🧳", color: "#6B2737" },
  { id: "boarding",   label: "Embarquement",              icon: "✈️", color: "#002157" },
  { id: "goodbye",    label: "Prise de Congés",           icon: "👋", color: "#E2001A" },
];

const MISSION_TYPES = [
  { id: "arrival",    label: "Arrivée" },
  { id: "departure",  label: "Départ" },
  { id: "connection", label: "Connexion" },
];

function formatTime(date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function formatDuration(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export default function App() {
  const STORAGE_KEY = "af_concierge_v2";
  const [screen, setScreen] = useState("home");
  const [mission, setMission] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [now, setNow] = useState(new Date());
  const [form, setForm] = useState({ passengerName: "", flightNumber: "", missionType: "departure" });
  const [copied, setCopied] = useState(false);
  const [adpBlocked, setAdpBlocked] = useState(null);
  const [adpComment, setAdpComment] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const qrRef = useRef(null);

  useEffect(() => { setAppUrl(window.location.href); }, []);

  useEffect(() => {
    if (screen === "qr" && appUrl && qrRef.current) {
      qrRef.current.innerHTML = "";
      const size = Math.min(window.innerWidth - 80, 260);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.onload = () => { new window.QRCode(qrRef.current, { text: appUrl, width: size, height: size, colorDark: "#002157", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.H }); };
      if (window.QRCode) { new window.QRCode(qrRef.current, { text: appUrl, width: size, height: size, colorDark: "#002157", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.H }); }
      else { document.head.appendChild(script); }
    }
  }, [screen, appUrl]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) setSessions(JSON.parse(s)); } catch {} }, []);

  function saveSessions(upd) { setSessions(upd); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(upd)); } catch {} }

  function startMission() {
    if (!form.passengerName.trim()) return;
    setMission({ id: Date.now(), ...form, startedAt: new Date().toISOString() });
    setLogs([]); setAdpBlocked(null); setAdpComment("");
    setScreen("mission");
  }

  function stamp(cp) {
    if (logs.find(l => l.id === cp.id)) return;
    setLogs(prev => [...prev, { id: cp.id, label: cp.label, icon: cp.icon, timestamp: new Date().toISOString() }]);
  }

  function endMission() {
    const session = { ...mission, endedAt: new Date().toISOString(), logs, adpBlocked, adpComment };
    saveSessions([session, ...sessions]);
    setSelectedSession(session);
    setScreen("report");
  }

  function generateReport(s) {
    const typeLabel = MISSION_TYPES.find(t => t.id === s.missionType)?.label || s.missionType;
    const dur = s.endedAt ? formatDuration(new Date(s.endedAt) - new Date(s.startedAt)) : "-";
    let txt = `TASK REPORT — AIR FRANCE CONCIERGERIE\n${"=".repeat(42)}\n`;
    txt += `Date       : ${formatDate(s.startedAt)}\nPassager   : ${s.passengerName}\nVol        : ${s.flightNumber || "N/A"}\nType       : ${typeLabel}\nDurée      : ${dur}\n${"=".repeat(42)}\n\nCHECKPOINTS :\n\n`;
    s.logs.forEach((l, i) => { txt += `${i + 1}. ${l.icon}  ${l.label}\n   → ${formatTime(l.timestamp)}\n\n`; });
    if (s.adpBlocked === true) { txt += `\n⚠️  INCIDENT ADP\nBlocage : OUI\n`; if (s.adpComment) txt += `Commentaire : ${s.adpComment}\n`; }
    else if (s.adpBlocked === false) { txt += `\nIncident ADP : Aucun blocage\n`; }
    txt += `${"=".repeat(42)}\nFin de mission : ${s.endedAt ? formatTime(s.endedAt) : "-"}\n`;
    return txt;
  }

  function copyReport(s) {
    navigator.clipboard.writeText(generateReport(s)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  // ── HOME ──────────────────────────────────────────
  if (screen === "home") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <div style={S.afLogo}><span style={S.afLogoPlane}>✈</span></div>
          <div>
            <div style={S.navTitle}>Air France</div>
            <div style={S.navSub}>Conciergerie · CDG</div>
          </div>
        </div>
      </div>
      <div style={S.banner}>
        <img src="https://www-fr.static-af.com/assets/components/43.3.0/af/logo/brand-logo.svg" alt="Air France" style={S.bannerLogo} onError={e => { e.target.style.display = "none"; }} />
        <div style={S.bannerTitle}>Conciergerie</div>
        <div style={S.bannerSub}>Paris · Charles de Gaulle</div>
      </div>
      <div style={S.clockWrap}>
        <div style={S.clockTime}>{formatTime(now)}</div>
        <div style={S.clockDate}>{formatDate(now)}</div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}><span style={S.cardTitleAccent}>📋</span> Task Report</div>
        <label style={S.label}>Nom du passager</label>
        <input style={S.input} placeholder="Ex : J. COOPER" value={form.passengerName} onChange={e => setForm(f => ({ ...f, passengerName: e.target.value.toUpperCase() }))} />
        <label style={S.label}>Numéro de vol</label>
        <input style={S.input} placeholder="Ex : AF1234" value={form.flightNumber} onChange={e => setForm(f => ({ ...f, flightNumber: e.target.value.toUpperCase() }))} />
        <label style={S.label}>Type de mission</label>
        <div style={S.seg}>
          {MISSION_TYPES.map(t => (
            <button key={t.id} onClick={() => setForm(f => ({ ...f, missionType: t.id }))}
              style={{ ...S.segBtn, ...(form.missionType === t.id ? S.segBtnOn : {}) }}>
              {t.label}
            </button>
          ))}
        </div>
        <button style={{ ...S.primaryBtn, opacity: form.passengerName.trim() ? 1 : 0.45 }} onClick={startMission}>
          Démarrer la mission
        </button>
      </div>
      {sessions.length > 0 && (
        <button style={S.ghostBtn} onClick={() => setScreen("history")}>
          Missions précédentes ({sessions.length})
        </button>
      )}
      <button style={{ ...S.ghostBtn, marginTop: 8, color: "#5A6A8A" }} onClick={() => setScreen("qr")}>
        📲 Partager l'app · QR Code
      </button>
    </div>
  );

  // ── QR CODE ──────────────────────────────────────
  if (screen === "qr") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <button style={S.backBtn} onClick={() => setScreen("home")}>←</button>
          <div style={S.afLogo}><span style={S.afLogoPlane}>✈</span></div>
          <div>
            <div style={S.navTitle}>Partager l'app</div>
            <div style={S.navSub}>QR Code · Scan tablette Android</div>
          </div>
        </div>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={S.qrCard}>
          <div style={S.qrTitle}>📲 Scanner pour ouvrir l'app</div>
          <div style={S.qrSub}>Tes collègues scannent ce QR code — aucune installation requise</div>
          <div style={S.qrBox}>
            {appUrl
              ? <div ref={qrRef} style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />
              : <div style={S.qrPlaceholder}><div style={{ fontSize: 48, marginBottom: 8 }}>🔲</div><div style={{ fontSize: 13, color: "#7A8AAA" }}>QR Code disponible une fois l'app déployée</div></div>
            }
          </div>
          {appUrl && (
            <div style={S.qrUrlBox}>
              <div style={S.qrUrlLabel}>URL de l'app</div>
              <div style={S.qrUrl}>{appUrl}</div>
            </div>
          )}
        </div>
        <div style={S.qrStepsCard}>
          <div style={S.qrStepsTitle}>💡 Comment partager à tes collègues</div>
          {[["1","Déploie l'app sur Vercel (gratuit)"],["2","Reviens ici — le QR s'affiche auto"],["3","Imprime ou affiche en salle de brief"],["4","Collègues scannent → Chrome Android"]].map(([n,txt]) => (
            <div key={n} style={S.qrStep}>
              <div style={S.qrStepNum}>{n}</div>
              <div style={S.qrStepTxt}>{txt}</div>
            </div>
          ))}
        </div>
        <button style={S.primaryBtn} onClick={() => { navigator.clipboard.writeText(appUrl).catch(()=>{}); }}>🔗 Copier le lien</button>
        <button style={S.ghostBtn} onClick={() => setScreen("home")}>← Retour</button>
      </div>
    </div>
  );

  // ── MISSION ──────────────────────────────────────
  if (screen === "mission") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <button style={S.backBtn} onClick={() => setScreen("home")}>←</button>
          <div style={{ flex: 1 }}>
            <div style={S.navTitle}>{mission.passengerName}</div>
            <div style={S.navSub}>{mission.flightNumber || "—"} · {MISSION_TYPES.find(t => t.id === mission.missionType)?.label}</div>
          </div>
          <div style={S.liveChip}>{formatTime(now)}</div>
        </div>
      </div>
      <div style={S.progTrack}>
        <div style={{ ...S.progFill, width: `${Math.round(logs.length / CHECKPOINTS.length * 100)}%` }} />
      </div>
      <div style={S.progLabel}>{logs.length} / {CHECKPOINTS.length} étapes</div>
      <div style={{ padding: "4px 16px 16px" }}>
        {CHECKPOINTS.map(cp => {
          const done = logs.find(l => l.id === cp.id);
          return (
            <button key={cp.id} onClick={() => stamp(cp)} style={{
              ...S.cpBtn,
              background: done ? cp.color : "#fff",
              color: done ? "#fff" : "#002157",
              border: done ? `2px solid ${cp.color}` : "2px solid #DDE3EC",
              boxShadow: done ? "0 2px 8px rgba(0,33,87,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <span style={S.cpIcon}>{cp.icon}</span>
              <div style={S.cpBody}>
                <div style={S.cpLabel}>{cp.label}</div>
                {done && <div style={{ ...S.cpTime, color: "rgba(255,255,255,0.85)" }}>{formatTime(done.timestamp)}</div>}
              </div>
              {done ? <div style={S.cpBadgeDone}>✓</div> : <div style={S.cpBadgePending}>TAP</div>}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ ...S.adpCard, borderColor: adpBlocked === true ? "#E2001A" : adpBlocked === false ? "#059669" : "#DDE3EC", background: adpBlocked === true ? "#FFF5F5" : adpBlocked === false ? "#F0FDF4" : "#fff" }}>
          <div style={S.adpHeader}><span style={S.adpIcon}>⚠️</span><div style={S.adpTitle}>Blocage agent ADP</div></div>
          <div style={S.adpSub}>Un agent ADP a refusé ou compliqué l'accès ?</div>
          <div style={S.adpBtns}>
            <button onClick={() => setAdpBlocked(true)} style={{ ...S.adpBtn, ...(adpBlocked === true ? S.adpBtnYes : {}) }}>✕ OUI — Blocage</button>
            <button onClick={() => { setAdpBlocked(false); setAdpComment(""); }} style={{ ...S.adpBtn, ...(adpBlocked === false ? S.adpBtnNo : {}) }}>✓ NON — RAS</button>
          </div>
          {adpBlocked === true && (
            <div style={S.adpCommentWrap}>
              <label style={{ ...S.label, color: "#C0392B", marginBottom: 6 }}>Détails de l'incident</label>
              <textarea style={S.adpTextarea} placeholder="Nom agent, lieu, heure, motif…" value={adpComment} onChange={e => setAdpComment(e.target.value)} rows={4} />
            </div>
          )}
          {adpBlocked === false && <div style={S.adpOkMsg}>✓ Aucun incident à signaler</div>}
        </div>
      </div>
      <div style={{ padding: "0 16px 40px" }}>
        <button style={S.endBtn} onClick={endMission}>Terminer · Générer le rapport</button>
      </div>
    </div>
  );

  // ── REPORT ──────────────────────────────────────
  if (screen === "report") {
    const s = selectedSession || { ...mission, logs, endedAt: new Date().toISOString() };
    const typeLabel = MISSION_TYPES.find(t => t.id === s.missionType)?.label || "";
    const dur = s.endedAt ? formatDuration(new Date(s.endedAt) - new Date(s.startedAt)) : "-";
    return (
      <div style={S.shell}>
        <div style={S.navBar}>
          <div style={S.afStripe} />
          <div style={S.navInner}>
            <button style={S.backBtn} onClick={() => setScreen(selectedSession ? "history" : "home")}>←</button>
            <div>
              <div style={S.navTitle}>Task Report</div>
              <div style={S.navSub}>{s.passengerName} · {s.flightNumber || "—"}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={S.metaCard}>
            {[["Date", formatDate(s.startedAt)], ["Type", typeLabel], ["Vol", s.flightNumber || "N/A"], ["Durée", dur]].map(([k, v]) => (
              <div key={k} style={S.metaRow}>
                <span style={S.metaKey}>{k}</span>
                <span style={S.metaVal}>{v}</span>
              </div>
            ))}
          </div>
          <div style={S.timelineCard}>
            {s.logs.map((log, i) => (
              <div key={i} style={{ ...S.tlRow, borderBottom: i < s.logs.length - 1 ? "1px solid #EEF1F7" : "none" }}>
                <div style={S.tlDot}>{log.icon}</div>
                <div style={S.tlContent}>
                  <div style={S.tlLabel}>{log.label}</div>
                  <div style={S.tlTime}>{formatTime(log.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
          {s.adpBlocked === true && (
            <div style={S.adpReportAlert}>
              <div style={S.adpReportTitle}>⚠️ Incident ADP signalé</div>
              {s.adpComment
                ? <div style={S.adpReportText}>{s.adpComment}</div>
                : <div style={{ ...S.adpReportText, fontStyle: "italic", opacity: 0.7 }}>Aucun commentaire saisi</div>}
            </div>
          )}
          <button style={{ ...S.primaryBtn, background: copied ? "#059669" : "#002157" }} onClick={() => copyReport(s)}>
            {copied ? "✓ Rapport copié !" : "📋 Copier le rapport"}
          </button>
          <button style={S.ghostBtn} onClick={() => { setMission(null); setLogs([]); setSelectedSession(null); setScreen("home"); }}>
            + Nouvelle mission
          </button>
        </div>
      </div>
    );
  }

  // ── HISTORY ──────────────────────────────────────
  if (screen === "history") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <button style={S.backBtn} onClick={() => setScreen("home")}>←</button>
          <div style={S.navTitle}>Missions précédentes</div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {sessions.map(s => (
          <div key={s.id} style={S.histCard} onClick={() => { setSelectedSession(s); setScreen("report"); }}>
            <div style={S.histTop}>
              <span style={S.histName}>{s.passengerName}</span>
              <span style={S.histFlight}>{s.flightNumber || "—"}</span>
            </div>
            <div style={S.histMeta}>
              {formatDate(s.startedAt)} · {MISSION_TYPES.find(t => t.id === s.missionType)?.label} · {s.logs.length} étapes
            </div>
          </div>
        ))}
        <button style={{ ...S.ghostBtn, color: "#E2001A", borderColor: "#F5C6CB", marginTop: 24 }}
          onClick={() => { saveSessions([]); setScreen("home"); }}>
          Effacer l'historique
        </button>
      </div>
    </div>
  );
}

const AF_NAVY  = "#002157";
const AF_RED   = "#E2001A";
const AF_GOLD  = "#C8A951";

const S = {
  shell: { fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F4F6FB", paddingBottom: 40 },
  navBar: { background: AF_NAVY, position: "sticky", top: 0, zIndex: 10 },
  afStripe: { height: 4, background: `linear-gradient(90deg, ${AF_RED} 0%, ${AF_RED} 40%, ${AF_GOLD} 100%)` },
  navInner: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" },
  afLogo: { width: 40, height: 40, background: AF_RED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  afLogoPlane: { fontSize: 20, color: "#fff" },
  navTitle: { color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: 0.2 },
  navSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 1 },
  backBtn: { background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  liveChip: { marginLeft: "auto", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  banner: { background: `linear-gradient(135deg, ${AF_NAVY} 0%, #003580 60%, #1A3A6B 100%)`, padding: "24px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderBottom: `4px solid ${AF_RED}` },
  bannerLogo: { height: 28, filter: "brightness(0) invert(1)", marginBottom: 4 },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" },
  bannerSub: { color: AF_GOLD, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" },
  clockWrap: { textAlign: "center", padding: "20px 16px 16px" },
  clockTime: { fontSize: 52, fontWeight: 700, color: AF_NAVY, letterSpacing: -2, fontVariantNumeric: "tabular-nums" },
  clockDate: { fontSize: 14, color: "#5A6A8A", marginTop: 4, textTransform: "capitalize" },
  card: { margin: "0 16px", background: "#fff", borderRadius: 18, padding: "20px 20px 24px", boxShadow: "0 4px 20px rgba(0,33,87,0.10)" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: AF_NAVY, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 },
  cardTitleAccent: { fontSize: 18 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#7A8AAA", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 10, border: "1.5px solid #DDE3EC", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 18, color: AF_NAVY, background: "#FAFBFD" },
  seg: { display: "flex", gap: 8, marginBottom: 24 },
  segBtn: { flex: 1, padding: "11px 4px", borderRadius: 9, border: "1.5px solid #DDE3EC", background: "#FAFBFD", fontSize: 13, fontWeight: 600, color: "#7A8AAA", cursor: "pointer" },
  segBtnOn: { background: AF_NAVY, color: "#fff", border: `1.5px solid ${AF_NAVY}` },
  primaryBtn: { width: "100%", padding: "15px", background: AF_NAVY, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 },
  ghostBtn: { display: "block", width: "100%", padding: "13px", background: "transparent", color: AF_NAVY, border: "1.5px solid #DDE3EC", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center", marginTop: 12 },
  endBtn: { width: "100%", padding: "15px", background: AF_RED, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  progTrack: { height: 3, background: "#DDE3EC" },
  progFill: { height: 3, background: `linear-gradient(90deg, ${AF_NAVY}, ${AF_RED})`, transition: "width 0.4s ease" },
  progLabel: { textAlign: "right", fontSize: 11, color: "#7A8AAA", padding: "6px 16px 8px", fontWeight: 600 },
  cpBtn: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", borderRadius: 14, marginBottom: 10, cursor: "pointer", textAlign: "left", transition: "all 0.18s", boxSizing: "border-box" },
  cpIcon: { fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" },
  cpBody: { flex: 1 },
  cpLabel: { fontWeight: 600, fontSize: 15, lineHeight: 1.3 },
  cpTime: { fontSize: 13, marginTop: 3, fontVariantNumeric: "tabular-nums", fontWeight: 600 },
  cpBadgeDone: { background: "rgba(255,255,255,0.25)", borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  cpBadgePending: { fontSize: 10, fontWeight: 800, color: "#AAB4CC", letterSpacing: 0.5 },
  metaCard: { background: "#fff", borderRadius: 14, padding: "4px 16px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  metaRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #EEF1F7" },
  metaKey: { color: "#7A8AAA", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { color: AF_NAVY, fontWeight: 600, fontSize: 14, textTransform: "capitalize" },
  timelineCard: { background: "#fff", borderRadius: 14, padding: "4px 16px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  tlRow: { display: "flex", gap: 14, alignItems: "center", padding: "13px 0" },
  tlDot: { fontSize: 20, width: 32, textAlign: "center", flexShrink: 0 },
  tlContent: { flex: 1 },
  tlLabel: { fontWeight: 600, fontSize: 14, color: AF_NAVY },
  tlTime: { fontSize: 14, color: AF_RED, fontWeight: 700, marginTop: 2, fontVariantNumeric: "tabular-nums" },
  histCard: { background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,33,87,0.07)", cursor: "pointer" },
  histTop: { display: "flex", justifyContent: "space-between", marginBottom: 5 },
  histName: { fontWeight: 700, fontSize: 15, color: AF_NAVY },
  histFlight: { fontWeight: 700, color: AF_RED, fontSize: 14 },
  histMeta: { fontSize: 12, color: "#7A8AAA", textTransform: "capitalize" },
  adpCard: { background: "#fff", borderRadius: 16, border: "2px solid #DDE3EC", padding: "16px", transition: "all 0.2s" },
  adpHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  adpIcon: { fontSize: 20 },
  adpTitle: { fontWeight: 700, fontSize: 15, color: AF_NAVY },
  adpSub: { fontSize: 13, color: "#7A8AAA", marginBottom: 14 },
  adpBtns: { display: "flex", gap: 10 },
  adpBtn: { flex: 1, padding: "12px 8px", borderRadius: 10, border: "1.5px solid #DDE3EC", background: "#FAFBFD", fontSize: 14, fontWeight: 700, color: "#7A8AAA", cursor: "pointer" },
  adpBtnYes: { background: AF_RED, color: "#fff", border: `1.5px solid ${AF_RED}` },
  adpBtnNo: { background: "#059669", color: "#fff", border: "1.5px solid #059669" },
  adpCommentWrap: { marginTop: 14 },
  adpTextarea: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #FACACA", fontSize: 14, outline: "none", boxSizing: "border-box", color: AF_NAVY, background: "#fff", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 },
  adpOkMsg: { marginTop: 12, fontSize: 14, fontWeight: 600, color: "#059669", textAlign: "center" },
  adpReportAlert: { background: "#FFF0F0", border: "2px solid #E2001A", borderRadius: 14, padding: "14px 16px", marginBottom: 14 },
  adpReportTitle: { fontWeight: 700, fontSize: 14, color: AF_RED, marginBottom: 6 },
  adpReportText: { fontSize: 14, color: AF_NAVY, lineHeight: 1.5 },
  qrCard: { background: "#fff", borderRadius: 18, padding: "24px 20px", width: "100%", boxSizing: "border-box", boxShadow: "0 4px 20px rgba(0,33,87,0.10)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  qrTitle: { fontWeight: 700, fontSize: 17, color: AF_NAVY, textAlign: "center" },
  qrSub: { fontSize: 13, color: "#7A8AAA", textAlign: "center", lineHeight: 1.5 },
  qrBox: { background: "#F4F6FB", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, width: "100%", boxSizing: "border-box" },
  qrPlaceholder: { textAlign: "center", padding: 20 },
  qrUrlBox: { background: "#F4F6FB", borderRadius: 10, padding: "10px 14px", width: "100%", boxSizing: "border-box" },
  qrUrlLabel: { fontSize: 10, fontWeight: 700, color: "#7A8AAA", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  qrUrl: { fontSize: 12, color: AF_NAVY, fontWeight: 600, wordBreak: "break-all" },
  qrStepsCard: { background: "#fff", borderRadius: 16, padding: "18px", width: "100%", boxSizing: "border-box", boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  qrStepsTitle: { fontWeight: 700, fontSize: 14, color: AF_NAVY, marginBottom: 14 },
  qrStep: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  qrStepNum: { background: AF_NAVY, color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  qrStepTxt: { fontSize: 13, color: "#5A6A8A", lineHeight: 1.5, paddingTop: 3 },
};
