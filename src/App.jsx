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
