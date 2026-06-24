import { useState, useEffect, useRef } from "react";

const CHECKPOINTS = {
  arrival: [
    { id: "meeting",    label: "Meeting",               sublabel: "Accueil personnalisé",            icon: "🤝", color: "#002157" },
    { id: "paf",        label: "Passport Control (PAF)", sublabel: "Contrôle passeport",             icon: "🛂", color: "#1A3A6B" },
    { id: "baggage",    label: "Baggage Claim",          sublabel: "Récupération des bagages",       icon: "🧳", color: "#1A3A6B", hasBagCount: true },
    { id: "driver",     label: "Driver",                 sublabel: "Rencontre avec le chauffeur",    icon: "🚗", color: "#2A4A7B" },
    { id: "goodbye",    label: "End of Service",         sublabel: "Fin de prestation",              icon: "👋", color: "#E2001A" },
  ],
  departure: [
    { id: "meeting",    label: "Meeting",               sublabel: "Accueil personnalisé",            icon: "🤝", color: "#002157" },
    { id: "paf",        label: "Passport Control (PAF)", sublabel: "Contrôle passeport",             icon: "🛂", color: "#1A3A6B" },
    { id: "pif",        label: "Security Control (PIF)", sublabel: "Contrôle sûreté",                icon: "🔍", color: "#1A3A6B" },
    { id: "baggage",    label: "Check-In Baggage",       sublabel: "Enregistrement des bagages",     icon: "🧳", color: "#1A3A6B", hasBagCount: true },
    { id: "lounge_in",  label: "Lounge Entry",           sublabel: "Accès au salon",                 icon: "🛋️", color: "#6B2737" },
    { id: "lounge_out", label: "Lounge Exit",            sublabel: "Sortie du salon",                icon: "🚪", color: "#6B2737" },
    { id: "boarding",   label: "Boarding",               sublabel: "Accompagnement à l'embarquement",icon: "✈️", color: "#002157" },
    { id: "goodbye",    label: "End of Service",         sublabel: "Fin de prestation",              icon: "👋", color: "#E2001A" },
  ],
  connection: [
    { id: "meeting",    label: "Meeting",               sublabel: "Accueil personnalisé",            icon: "🤝", color: "#002157" },
    { id: "paf",        label: "Passport Control (PAF)", sublabel: "Contrôle passeport",             icon: "🛂", color: "#1A3A6B" },
    { id: "pif",        label: "Security Control (PIF)", sublabel: "Contrôle sûreté",                icon: "🔍", color: "#1A3A6B" },
    { id: "lounge_in",  label: "Lounge Entry",           sublabel: "Accès au salon",                 icon: "🛋️", color: "#6B2737" },
    { id: "lounge_out", label: "Lounge Exit",            sublabel: "Sortie du salon",                icon: "🚪", color: "#6B2737" },
    { id: "boarding",   label: "Boarding",               sublabel: "Accompagnement à l'embarquement",icon: "✈️", color: "#002157" },
    { id: "goodbye",    label: "End of Service",         sublabel: "Fin de prestation",              icon: "👋", color: "#E2001A" },
  ],
};

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
  const [missionComment, setMissionComment] = useState("");
  const [baggageCount, setBaggageCount] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [agentName, setAgentName] = useState("");
  const [editingAgent, setEditingAgent] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    setAppUrl(window.location.href);
    try { const a = localStorage.getItem("af_agent_name"); if (a) setAgentName(a); } catch {}
  }, []);

  useEffect(() => {
    if (screen === "qr" && appUrl && qrRef.current) {
      qrRef.current.innerHTML = "";
      const size = Math.min(window.innerWidth - 80, 260);
      if (window.QRCode) {
        new window.QRCode(qrRef.current, { text: appUrl, width: size, height: size, colorDark: "#002157", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.H });
      } else {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.onload = () => { new window.QRCode(qrRef.current, { text: appUrl, width: size, height: size, colorDark: "#002157", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.H }); };
        document.head.appendChild(script);
      }
    }
  }, [screen, appUrl]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) setSessions(JSON.parse(s)); } catch {} }, []);

  function saveSessions(upd) { setSessions(upd); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(upd)); } catch {} }

  function startMission() {
    if (!form.passengerName.trim()) return;
    setMission({ id: Date.now(), ...form, startedAt: new Date().toISOString() });
    setLogs([]); setAdpBlocked(null); setAdpComment(""); setMissionComment(""); setBaggageCount("");
    setScreen("mission");
  }

  function stamp(cp) {
    if (logs.find(l => l.id === cp.id)) return;
    setLogs(prev => [...prev, { id: cp.id, label: cp.label, icon: cp.icon, timestamp: new Date().toISOString() }]);
  }

  function endMission() {
    const session = { ...mission, endedAt: new Date().toISOString(), logs, adpBlocked, adpComment, agentName, missionComment, baggageCount };
    saveSessions([session, ...sessions]);
    setSelectedSession(session);
    setScreen("report");
  }

  function generateReport(s) {
    const typeLabel = MISSION_TYPES.find(t => t.id === s.missionType)?.label || s.missionType;
    const dur = s.endedAt ? formatDuration(new Date(s.endedAt) - new Date(s.startedAt)) : "-";
    let txt = "TASK REPORT — AIR FRANCE CONCIERGERIE\n";
    txt += "==========================================\n";
    txt += "Agent      : " + (s.agentName || "N/A") + "\n";
    txt += "Date       : " + formatDate(s.startedAt) + "\n";
    txt += "Passager   : " + s.passengerName + "\n";
    txt += "Vol        : " + (s.flightNumber || "N/A") + "\n";
    txt += "Type       : " + typeLabel + "\n";
    txt += "Durée      : " + dur + "\n";
    txt += "==========================================\n\nCHECKPOINTS :\n\n";
    s.logs.forEach((l, i) => {
      txt += (i + 1) + ". " + l.icon + "  " + l.label;
      if (l.id === "baggage" && s.baggageCount) txt += " — " + s.baggageCount + " bagage(s)";
      txt += "\n   → " + formatTime(l.timestamp) + "\n\n";
    });
    if (s.missionComment) { txt += "\nCOMMENTAIRE\n" + s.missionComment + "\n"; }
    if (s.adpBlocked === true) { txt += "\nINCIDENT ADP — BLOCAGE : OUI\n"; if (s.adpComment) txt += "Détails : " + s.adpComment + "\n"; }
    else if (s.adpBlocked === false) { txt += "\nIncident ADP : Aucun blocage\n"; }
    txt += "==========================================\n";
    txt += "Fin de mission : " + (s.endedAt ? formatTime(s.endedAt) : "-") + "\n";
    return txt;
  }

  function copyReport(s) {
    navigator.clipboard.writeText(generateReport(s)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  const AF_NAVY = "#002157";
  const AF_RED = "#E2001A";

  // HOME
  if (screen === "home") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <div style={S.afLogo}><span style={{ fontSize: 20, color: "#fff" }}>✈</span></div>
          <div style={{ flex: 1 }}>
            <div style={S.navTitle}>Air France</div>
            <div style={S.navSub}>Conciergerie · CDG</div>
          </div>
          <img src="https://www-fr.static-af.com/assets/components/43.3.0/af/logo/brand-logo.svg" alt="AF" style={{ height: 20, filter: "brightness(0) invert(1)", opacity: 0.9 }} onError={e => { e.target.style.display = "none"; }} />
        </div>
      </div>

      <div style={S.banner}>
        <img src="https://www-fr.static-af.com/assets/components/43.3.0/af/logo/brand-logo.svg" alt="Air France" style={{ height: 28, filter: "brightness(0) invert(1)", marginBottom: 4 }} onError={e => { e.target.style.display = "none"; }} />
        <div style={S.bannerTitle}>Conciergerie</div>
        <div style={S.bannerSub}>Paris · Charles de Gaulle</div>
      </div>

      <div style={S.clockWrap}>
        <div style={S.clockTime}>{formatTime(now)}</div>
        <div style={S.clockDate}>{formatDate(now)}</div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>
          <span style={{ fontSize: 18 }}>📋</span> Task Report
          <div style={{ marginLeft: "auto" }}>
            {editingAgent ? (
              <input autoFocus style={S.agentInputCard} placeholder="Votre nom" value={agentName}
                onChange={e => setAgentName(e.target.value.toUpperCase())}
                onBlur={() => { setEditingAgent(false); try { localStorage.setItem("af_agent_name", agentName); } catch {} }}
                onKeyDown={e => { if (e.key === "Enter") { setEditingAgent(false); try { localStorage.setItem("af_agent_name", agentName); } catch {} }}} />
            ) : (
              <div style={S.agentChipCard} onClick={() => setEditingAgent(true)}>
                <span>👤</span><span style={{ color: AF_NAVY, fontSize: 12, fontWeight: 700 }}>{agentName || "Mon nom"}</span>
              </div>
            )}
          </div>
        </div>

        <label style={S.label}>Nom du passager</label>
        <input style={S.input} placeholder="Ex : J. COOPER" value={form.passengerName}
          onChange={e => setForm(f => ({ ...f, passengerName: e.target.value.toUpperCase() }))} />

        <label style={S.label}>Numéro de vol</label>
        <input style={S.input} placeholder="Ex : AF1234" value={form.flightNumber}
          onChange={e => setForm(f => ({ ...f, flightNumber: e.target.value.toUpperCase() }))} />

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

  // QR
  if (screen === "qr") return (
    <div style={S.shell}>
      <div style={S.navBar}>
        <div style={S.afStripe} />
        <div style={S.navInner}>
          <button style={S.backBtn} onClick={() => setScreen("home")}>←</button>
          <div style={S.afLogo}><span style={{ fontSize: 20, color: "#fff" }}>✈</span></div>
          <div>
            <div style={S.navTitle}>Partager l'app</div>
            <div style={S.navSub}>QR Code · Raccourci</div>
          </div>
        </div>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={S.qrCard}>
          <div style={S.qrTitle}>📲 Scanne ce QR Code !</div>
          <div style={S.qrBox}>
            {appUrl
              ? <div ref={qrRef} style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />
              : <div style={{ textAlign: "center", padding: 20 }}><div style={{ fontSize: 48, marginBottom: 8 }}>🔲</div><div style={{ fontSize: 13, color: "#7A8AAA" }}>QR Code disponible une fois l'app déployée</div></div>
            }
          </div>
          {appUrl && (
            <div style={S.qrUrlBox}>
              <div style={S.qrUrlLabel}>URL de l'app</div>
              <div style={S.qrUrl}>{appUrl}</div>
            </div>
          )}
          <button style={S.primaryBtn} onClick={() => { navigator.clipboard.writeText(appUrl).catch(() => {}); }}>🔗 Copier le lien</button>
        </div>

        <div style={S.qrStepsCard}>
          <div style={S.qrStepsTitle}>🍎 Ajouter sur l'écran d'accueil iOS</div>
          {[["1","Ouvre le lien dans Safari (pas Chrome)"],["2","Appuie sur l'icône Partager ↑ en bas"],["3","Appuie sur « Sur l'écran d'accueil »"],["4","Nomme l'app « AF Conciergerie » → Ajouter"]].map(([n, txt]) => (
            <div key={n} style={S.qrStep}><div style={S.qrStepNum}>{n}</div><div style={S.qrStepTxt}>{txt}</div></div>
          ))}
        </div>

        <div style={S.qrStepsCard}>
          <div style={S.qrStepsTitle}>🤖 Ajouter sur l'écran d'accueil Android</div>
          {[["1","Ouvre le lien dans Chrome"],["2","Appuie sur les 3 points ⋮ en haut à droite"],["3","Appuie sur « Ajouter à l'écran d'accueil »"],["4","Confirme → l'icône apparaît comme une vraie app"]].map(([n, txt]) => (
            <div key={n} style={S.qrStep}><div style={S.qrStepNum}>{n}</div><div style={S.qrStepTxt}>{txt}</div></div>
          ))}
        </div>

        <button style={S.ghostBtn} onClick={() => setScreen("home")}>← Retour</button>
      </div>
    </div>
  );

  // MISSION
  if (screen === "mission") {
    const cps = CHECKPOINTS[mission.missionType] || CHECKPOINTS.departure;
    return (
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
          <div style={{ ...S.progFill, width: Math.round(logs.length / cps.length * 100) + "%" }} />
        </div>
        <div style={S.progLabel}>{logs.length} / {cps.length} étapes</div>

        <div style={{ padding: "4px 16px 16px" }}>
          {cps.map(cp => {
            const done = logs.find(l => l.id === cp.id);
            return (
              <div key={cp.id}>
                <button onClick={() => stamp(cp)} style={{
                  ...S.cpBtn,
                  background: done ? cp.color : "#fff",
                  color: done ? "#fff" : "#002157",
                  border: done ? "2px solid " + cp.color : "2px solid #DDE3EC",
                  boxShadow: done ? "0 2px 8px rgba(0,33,87,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>{cp.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cp.label}</div>
                    <div style={{ fontSize: 12, marginTop: 1, fontStyle: "italic", color: done ? "rgba(255,255,255,0.7)" : "#7A8AAA" }}>{cp.sublabel}</div>
                    {done && <div style={{ fontSize: 13, marginTop: 3, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{formatTime(done.timestamp)}</div>}
                  </div>
                  {cp.hasBagCount ? (
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 }}>
                      <input type="number" min="0" max="99" placeholder="0" value={baggageCount} onChange={e => setBaggageCount(e.target.value)}
                        style={{ width: 40, textAlign: "center", padding: "4px 2px", borderRadius: 8, border: "1.5px solid", fontSize: 15, fontWeight: 700, outline: "none", color: done ? "#fff" : "#002157", borderColor: done ? "rgba(255,255,255,0.4)" : "#DDE3EC", background: done ? "rgba(255,255,255,0.15)" : "#F4F6FB" }} />
                      <div style={{ fontSize: 10, fontWeight: 600, color: done ? "rgba(255,255,255,0.7)" : "#7A8AAA" }}>bag.</div>
                    </div>
                  ) : (
                    done ? <div style={S.cpBadgeDone}>✓</div> : <div style={S.cpBadgePending}>TAP</div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #DDE3EC", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#002157" }}>Commentaire</div>
            </div>
            <textarea style={S.commentTextarea} placeholder="Ajouter une note sur la mission (optionnel)..." value={missionComment} onChange={e => setMissionComment(e.target.value)} rows={3} />
          </div>
        </div>

        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ ...S.adpCard, borderColor: adpBlocked === true ? "#E2001A" : adpBlocked === false ? "#059669" : "#DDE3EC", background: adpBlocked === true ? "#FFF5F5" : adpBlocked === false ? "#F0FDF4" : "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#002157" }}>BLOCAGE PAR ADP</div>
            </div>
            <div style={{ fontSize: 13, color: "#7A8AAA", marginBottom: 14 }}>Un agent ADP a refusé ou compliqué l'accès ?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdpBlocked(true)} style={{ ...S.adpBtn, ...(adpBlocked === true ? { background: "#E2001A", color: "#fff", border: "1.5px solid #E2001A" } : {}) }}>OUI — BLOCAGE</button>
              <button onClick={() => { setAdpBlocked(false); setAdpComment(""); }} style={{ ...S.adpBtn, ...(adpBlocked === false ? { background: "#059669", color: "#fff", border: "1.5px solid #059669" } : {}) }}>✓ NON — RAS</button>
            </div>
            {adpBlocked === true && (
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#C0392B", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Détails de l'incident</label>
                <textarea style={S.commentTextarea} placeholder="Nom agent, lieu, heure, motif…" value={adpComment} onChange={e => setAdpComment(e.target.value)} rows={4} />
              </div>
            )}
            {adpBlocked === false && <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "#059669", textAlign: "center" }}>✓ Aucun incident à signaler</div>}
          </div>
        </div>

        <div style={{ padding: "0 16px 40px" }}>
          <button style={S.endBtn} onClick={endMission}>Terminer · Générer le rapport</button>
        </div>
      </div>
    );
  }

  // REPORT
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
            {[["Agent", s.agentName || "N/A"], ["Date", formatDate(s.startedAt)], ["Type", typeLabel], ["Vol", s.flightNumber || "N/A"], ["Durée", dur]].map(([k, v]) => (
              <div key={k} style={S.metaRow}>
                <span style={S.metaKey}>{k}</span>
                <span style={S.metaVal}>{v}</span>
              </div>
            ))}
          </div>
          <div style={S.timelineCard}>
            {s.logs.map((log, i) => (
              <div key={i} style={{ ...S.tlRow, borderBottom: i < s.logs.length - 1 ? "1px solid #EEF1F7" : "none" }}>
                <div style={{ fontSize: 20, width: 32, textAlign: "center", flexShrink: 0 }}>{log.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#002157" }}>{log.label}{log.id === "baggage" && s.baggageCount ? " — " + s.baggageCount + " bagage(s)" : ""}</div>
                  <div style={{ fontSize: 14, color: "#E2001A", fontWeight: 700, marginTop: 2 }}>{formatTime(log.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
          {s.missionComment ? (
            <div style={{ background: "#F8F9FF", border: "1.5px solid #DDE3EC", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#002157", marginBottom: 6 }}>📝 Commentaire</div>
              <div style={{ fontSize: 14, color: "#002157", lineHeight: 1.5 }}>{s.missionComment}</div>
            </div>
          ) : null}
          {s.adpBlocked === true && (
            <div style={{ background: "#FFF0F0", border: "2px solid #E2001A", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#E2001A", marginBottom: 6 }}>⚠️ BLOCAGE ADP signalé</div>
              <div style={{ fontSize: 14, color: "#002157", lineHeight: 1.5 }}>{s.adpComment || "Aucun commentaire saisi"}</div>
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

  // HISTORY
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
          <div key={s.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,33,87,0.07)", cursor: "pointer" }} onClick={() => { setSelectedSession(s); setScreen("report"); }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#002157" }}>{s.passengerName}</span>
              <span style={{ fontWeight: 700, color: "#E2001A", fontSize: 14 }}>{s.flightNumber || "—"}</span>
            </div>
            <div style={{ fontSize: 12, color: "#7A8AAA", textTransform: "capitalize" }}>
              {formatDate(s.startedAt)} · {MISSION_TYPES.find(t => t.id === s.missionType)?.label} · {s.logs.length} étapes
            </div>
          </div>
        ))}
        <button style={{ ...S.ghostBtn, color: "#E2001A", borderColor: "#F5C6CB", marginTop: 24 }} onClick={() => { saveSessions([]); setScreen("home"); }}>
          Effacer l'historique
        </button>
      </div>
    </div>
  );
}

const AF_NAVY = "#002157";
const AF_RED  = "#E2001A";
const AF_GOLD = "#C8A951";

const S = {
  shell:      { fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F4F6FB", paddingBottom: 40 },
  navBar:     { background: AF_NAVY, position: "sticky", top: 0, zIndex: 10 },
  afStripe:   { height: 4, background: AF_RED },
  navInner:   { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" },
  afLogo:     { width: 40, height: 40, background: AF_RED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navTitle:   { color: "#fff", fontWeight: 700, fontSize: 16 },
  navSub:     { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 1 },
  backBtn:    { background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: "pointer", flexShrink: 0 },
  liveChip:   { marginLeft: "auto", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 13, fontWeight: 600 },
  banner:     { background: "linear-gradient(135deg, #002157 0%, #003580 60%, #1A3A6B 100%)", padding: "24px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderBottom: "4px solid #E2001A" },
  bannerTitle:{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" },
  bannerSub:  { color: "#C8A951", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" },
  clockWrap:  { textAlign: "center", padding: "20px 16px 16px" },
  clockTime:  { fontSize: 52, fontWeight: 700, color: AF_NAVY, letterSpacing: -2, fontVariantNumeric: "tabular-nums" },
  clockDate:  { fontSize: 14, color: "#5A6A8A", marginTop: 4, textTransform: "capitalize" },
  card:       { margin: "0 16px", background: "#fff", borderRadius: 18, padding: "20px 20px 24px", boxShadow: "0 4px 20px rgba(0,33,87,0.10)" },
  cardTitle:  { fontSize: 17, fontWeight: 700, color: AF_NAVY, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 },
  label:      { display: "block", fontSize: 11, fontWeight: 700, color: "#7A8AAA", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input:      { width: "100%", padding: "13px 14px", borderRadius: 10, border: "1.5px solid #DDE3EC", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 18, color: AF_NAVY, background: "#FAFBFD" },
  seg:        { display: "flex", gap: 8, marginBottom: 24 },
  segBtn:     { flex: 1, padding: "11px 4px", borderRadius: 9, border: "1.5px solid #DDE3EC", background: "#FAFBFD", fontSize: 13, fontWeight: 600, color: "#7A8AAA", cursor: "pointer" },
  segBtnOn:   { background: AF_NAVY, color: "#fff", border: "1.5px solid #002157" },
  primaryBtn: { width: "100%", padding: "15px", background: AF_NAVY, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  ghostBtn:   { display: "block", width: "100%", padding: "13px", background: "transparent", color: AF_NAVY, border: "1.5px solid #DDE3EC", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center", marginTop: 12 },
  endBtn:     { width: "100%", padding: "15px", background: AF_RED, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  progTrack:  { height: 3, background: "#DDE3EC" },
  progFill:   { height: 3, background: "linear-gradient(90deg, #002157, #E2001A)", transition: "width 0.4s ease" },
  progLabel:  { textAlign: "right", fontSize: 11, color: "#7A8AAA", padding: "6px 16px 8px", fontWeight: 600 },
  cpBtn:      { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", borderRadius: 14, marginBottom: 10, cursor: "pointer", textAlign: "left", transition: "all 0.18s", boxSizing: "border-box" },
  cpBadgeDone:{ background: "rgba(255,255,255,0.25)", borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  cpBadgePending: { fontSize: 10, fontWeight: 800, color: "#AAB4CC", letterSpacing: 0.5 },
  metaCard:   { background: "#fff", borderRadius: 14, padding: "4px 16px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  metaRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #EEF1F7" },
  metaKey:    { color: "#7A8AAA", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal:    { color: AF_NAVY, fontWeight: 600, fontSize: 14, textTransform: "capitalize" },
  timelineCard: { background: "#fff", borderRadius: 14, padding: "4px 16px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  tlRow:      { display: "flex", gap: 14, alignItems: "center", padding: "13px 0" },
  adpCard:    { background: "#fff", borderRadius: 16, border: "2px solid #DDE3EC", padding: "16px", transition: "all 0.2s" },
  adpBtn:     { flex: 1, padding: "12px 8px", borderRadius: 10, border: "1.5px solid #DDE3EC", background: "#FAFBFD", fontSize: 14, fontWeight: 700, color: "#7A8AAA", cursor: "pointer" },
  commentTextarea: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #DDE3EC", fontSize: 14, outline: "none", boxSizing: "border-box", color: AF_NAVY, background: "#FAFBFD", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 },
  agentChipCard: { display: "flex", alignItems: "center", gap: 5, background: "#F4F6FB", borderRadius: 20, padding: "5px 10px", cursor: "pointer", border: "1.5px solid #DDE3EC" },
  agentInputCard: { background: "#F4F6FB", border: "1.5px solid #DDE3EC", borderRadius: 20, padding: "5px 10px", color: AF_NAVY, fontSize: 12, fontWeight: 700, width: 90, outline: "none" },
  qrCard:     { background: "#fff", borderRadius: 18, padding: "24px 20px", width: "100%", boxSizing: "border-box", boxShadow: "0 4px 20px rgba(0,33,87,0.10)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  qrTitle:    { fontWeight: 700, fontSize: 17, color: AF_NAVY, textAlign: "center" },
  qrBox:      { background: "#F4F6FB", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, width: "100%", boxSizing: "border-box" },
  qrUrlBox:   { background: "#F4F6FB", borderRadius: 10, padding: "10px 14px", width: "100%", boxSizing: "border-box" },
  qrUrlLabel: { fontSize: 10, fontWeight: 700, color: "#7A8AAA", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  qrUrl:      { fontSize: 12, color: AF_NAVY, fontWeight: 600, wordBreak: "break-all" },
  qrStepsCard:{ background: "#fff", borderRadius: 16, padding: "18px", width: "100%", boxSizing: "border-box", boxShadow: "0 2px 10px rgba(0,33,87,0.07)" },
  qrStepsTitle:{ fontWeight: 700, fontSize: 14, color: AF_NAVY, marginBottom: 14 },
  qrStep:     { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  qrStepNum:  { background: AF_NAVY, color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  qrStepTxt:  { fontSize: 13, color: "#5A6A8A", lineHeight: 1.5, paddingTop: 3 },
};
