"use client";
import React, { useState, useMemo, useEffect } from "react";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lee leads reales desde Supabase (REST, sin librería)
async function fetchLeads() {
  const res = await fetch(`${SB_URL}/rest/v1/cetec_leads?select=*&order=created_at.desc`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error("No se pudieron leer los leads");
  return res.json();
}

// Actualiza el estado de un lead en Supabase
async function updateEstadoRemoto(id, estado) {
  await fetch(`${SB_URL}/rest/v1/cetec_leads?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ estado }),
  });
}

// Normaliza un registro de Supabase al formato que usa el panel
function normaliza(r) {
  return {
    id: r.id,
    nombre: r.nombre || "Cliente",
    tel: r.telefono || null,
    interes: r.interes || "cerca",
    metros: r.metros ?? null,
    superficie: r.superficie || null,
    desnivel: !!r.desnivel,
    municipio: r.municipio || null,
    precio: r.precio ?? null,
    estado: r.estado || "Nuevo",
    hora: new Date(r.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    mensajes: r.mensajes || 0,
    pregunto_precio: !!r.pregunto_precio,
    fueraHorario: !!r.fuera_horario,
    resumen: r.resumen || "",
  };
}


// ============================================================
// ORQUESTA SUPPLY · Panel de Leads CETEC
// Identidad: blanco + verde + azul. Dashboard, score de potencial,
// gestión de estados (embudo), detalle de lead con contexto de Aura.
// Datos de ejemplo realistas para demostración.
// ============================================================

const C = {
  bg: "#FFFFFF",
  ink: "#0F2A3F",       // azul tinta (texto principal)
  azul: "#1E6FB8",      // azul Orquesta
  azulSoft: "#EAF3FB",
  verde: "#1FA97A",     // verde Orquesta
  verdeSoft: "#E7F7F0",
  ambar: "#D98A1F",
  rojo: "#D65745",
  gris: "#6B7C8A",
  linea: "#E4EBF1",
  panel: "#F7FAFC",
};

const ESTADOS = ["Nuevo", "Contactado", "Cotizado", "Cerrado", "Perdido"];
const ESTADO_COLOR = {
  Nuevo: C.azul,
  Contactado: C.ambar,
  Cotizado: "#7A5AC0",
  Cerrado: C.verde,
  Perdido: C.rojo,
};

// --- Datos de ejemplo (realistas al giro de CETEC) ---
const SEED = [
  { id: 1, nombre: "María Fernanda Ríos", tel: "81 1234 5678", interes: "cerca", metros: 45, superficie: "barda", desnivel: false, municipio: "San Nicolás", precio: 13999, estado: "Nuevo", hora: "02:14 a.m.", fueraHorario: true, mensajes: 9, pregunto_precio: true, resumen: "Cerca de 45m sobre barda pareja para casa. Pidió cotización de madrugada." },
  { id: 2, nombre: "Jorge Treviño", tel: "81 8765 4321", interes: "cerca", metros: 120, superficie: "malla", desnivel: true, municipio: "Apodaca", precio: 25199, estado: "Contactado", hora: "11:40 p.m.", fueraHorario: true, mensajes: 14, pregunto_precio: true, resumen: "Nave industrial, 120m con desniveles. Cliente empresa, alta intención." },
  { id: 3, nombre: "Laura Cantú", tel: "81 2233 4455", interes: "camaras", metros: null, superficie: null, desnivel: false, municipio: "Monterrey", precio: 11999, estado: "Cotizado", hora: "09:05 p.m.", fueraHorario: true, mensajes: 7, pregunto_precio: true, resumen: "Kit de 4 cámaras para consultorio. Ya se le envió cotización." },
  { id: 4, nombre: "Anónimo", tel: null, interes: "cerca", metros: null, superficie: null, desnivel: false, municipio: null, precio: null, estado: "Nuevo", hora: "03:47 a.m.", fueraHorario: true, mensajes: 2, pregunto_precio: false, resumen: "Preguntó '¿cuánto cuesta?' y no dejó datos. Bajo interés por ahora." },
  { id: 5, nombre: "Roberto Salinas", tel: "81 9988 7766", interes: "cerca", metros: 10, superficie: "barda", desnivel: false, municipio: "Guadalupe", precio: 6499, estado: "Cerrado", hora: "06:20 p.m.", fueraHorario: false, mensajes: 11, pregunto_precio: true, resumen: "Paquete básico 10m casa habitación. Venta cerrada, instalación agendada." },
  { id: 6, nombre: "Patricia Guzmán", tel: "81 4455 6677", interes: "cerca", metros: 200, superficie: "barda", desnivel: false, municipio: "Santiago", precio: 34999, estado: "Contactado", hora: "10:12 p.m.", fueraHorario: true, mensajes: 12, pregunto_precio: true, resumen: "Residencia grande 200m. Muy interesada, pidió visita." },
  { id: 7, nombre: "Curioso WhatsApp", tel: null, interes: "cerca", metros: null, superficie: null, desnivel: false, municipio: "Saltillo", precio: null, estado: "Perdido", hora: "01:33 a.m.", fueraHorario: true, mensajes: 3, pregunto_precio: true, resumen: "Preguntó precio, se le informó zona de servicio. No respondió más." },
];

// Score de potencial: pondera la INTENCIÓN real, no el canal.
// El teléfono llega solo por WhatsApp, así que pesa poco. Lo que revela
// interés genuino: dar metros, definir superficie/zona, preguntar precio.
function scoreLead(l) {
  const factores = [];
  let s = 0;
  if (l.metros) { s += 30; factores.push("Indicó metros"); }
  if (l.superficie) { s += 20; factores.push("Definió superficie"); }
  if (l.pregunto_precio) { s += 15; factores.push("Preguntó precio"); }
  if (l.municipio) { s += 15; factores.push("Definió municipio"); }
  if (l.mensajes >= 8) { s += 12; factores.push("Conversación sostenida"); }
  if (l.tel) { s += 8; factores.push("Dejó contacto"); }
  return { score: Math.min(s, 100), factores };
}
function getScore(l) { return scoreLead(l).score; }

function scoreColor(s) {
  if (s >= 70) return C.verde;
  if (s >= 40) return C.ambar;
  return C.rojo;
}
function scoreLabel(s) {
  if (s >= 70) return "Alto";
  if (s >= 40) return "Medio";
  return "Bajo";
}

const MXN = (n) => (n ? "$" + n.toLocaleString("es-MX") : "—");

export default function App() {
  const [leads, setLeads] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [filtro, setFiltro] = useState("Todos");

  async function cargar() {
    try {
      const data = await fetchLeads();
      setLeads(data.map(normaliza));
      setError(null);
    } catch (e) {
      setError("No se pudieron cargar los leads. Verifica la conexión.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000); // refresca cada 15s
    return () => clearInterval(t);
  }, []);

  const metrics = useMemo(() => {
    const total = leads.length;
    const sinContactar = leads.filter((l) => l.estado === "Nuevo").length;
    const potenciales = leads.filter((l) => getScore(l) >= 70).length;
    const cerrados = leads.filter((l) => l.estado === "Cerrado").length;
    const fueraHorario = leads.filter((l) => l.fueraHorario).length;
    const cotizacionesActivas = leads
      .filter((l) => ["Contactado", "Cotizado"].includes(l.estado) && l.precio)
      .reduce((a, l) => a + l.precio, 0);
    return { total, sinContactar, potenciales, cerrados, fueraHorario, cotizacionesActivas };
  }, [leads]);

  const visibles = filtro === "Todos" ? leads : leads.filter((l) => l.estado === filtro);

  function avanzar(id) {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const i = ESTADOS.indexOf(l.estado);
        const next = i < 3 ? ESTADOS[i + 1] : l.estado;
        updateEstadoRemoto(id, next); // persiste en Supabase
        return { ...l, estado: next };
      })
    );
  }
  function setEstado(id, estado) {
    updateEstadoRemoto(id, estado); // persiste en Supabase
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap');
        *{box-sizing:border-box}
        .card{transition:transform .12s ease, box-shadow .12s ease}
        .card:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(15,42,63,.08)}
        .btn{cursor:pointer;border:none;font-family:inherit;transition:filter .12s}
        .btn:hover{filter:brightness(1.06)}
        .barfill{transition:width .5s ease}
        @media(max-width:720px){.grid4{grid-template-columns:1fr 1fr!important}.leadrow{flex-direction:column;align-items:flex-start!important;gap:10px!important}}
      `}</style>

      {/* Encabezado */}
      <div style={{ borderBottom: `1px solid ${C.linea}`, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.azul}, ${C.verde})` }} />
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.azul, fontWeight: 700 }}>ORQUESTA SUPPLY</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Panel de leads · CETEC</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.gris }}>Atención de Aura · 24/7</div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px 60px" }}>
        {/* Métricas */}
        <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
          <Metric label="Leads totales" value={metrics.total} sub="captados por Aura" color={C.azul} />
          <Metric label="Potencial alto" value={metrics.potenciales} sub="listos para asesor" color={C.verde} />
          <Metric label="Atendidos fuera de horario" value={metrics.fueraHorario} sub="que se habrían perdido" color={C.azul} />
          <Metric label="En cotización activa" value={MXN(metrics.cotizacionesActivas)} sub="clientes en negociación" color={C.ink} small />
        </div>

        {/* Resumen de valor: recordatorio de por qué Aura importa */}
        <div style={{ background: C.verdeSoft, border: `1px solid #C9EBDD`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13.5, color: C.ink }}>
          <b>Mientras el equipo estuvo cerrado,</b> Aura atendió {metrics.fueraHorario} contactos fuera de horario y dejó {metrics.potenciales} listos para que un asesor los retome. Sin ella, esos clientes se habrían quedado sin respuesta.
        </div>

        {/* Embudo resumen */}
        <div className="card" style={{ background: C.panel, border: `1px solid ${C.linea}`, borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gris, marginBottom: 12 }}>EMBUDO DE VENTAS</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ESTADOS.filter((e) => e !== "Perdido").map((e) => {
              const n = leads.filter((l) => l.estado === e).length;
              return (
                <div key={e} style={{ flex: 1, minWidth: 90, background: C.bg, border: `1px solid ${C.linea}`, borderRadius: 10, padding: "10px 12px", borderTop: `3px solid ${ESTADO_COLOR[e]}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>{n}</div>
                  <div style={{ fontSize: 12, color: C.gris }}>{e}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {["Todos", ...ESTADOS].map((f) => (
            <button key={f} className="btn" onClick={() => setFiltro(f)}
              style={{ background: filtro === f ? C.azul : C.bg, color: filtro === f ? "#fff" : C.gris, border: `1px solid ${filtro === f ? C.azul : C.linea}`, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
              {f}
            </button>
          ))}
        </div>

        {/* Lista de leads */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cargando && (
            <div style={{ textAlign: "center", padding: 40, color: C.gris, fontSize: 14 }}>Cargando leads…</div>
          )}
          {error && !cargando && (
            <div style={{ textAlign: "center", padding: 30, color: C.rojo, fontSize: 14, background: "#FDECEA", borderRadius: 12 }}>{error}</div>
          )}
          {!cargando && !error && visibles.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.gris, background: C.panel, borderRadius: 14, border: `1px dashed ${C.linea}` }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Aún no hay leads</div>
              En cuanto Aura atienda a un cliente y capture sus datos, aparecerá aquí automáticamente.
            </div>
          )}
          {!cargando && visibles.map((l) => {
            const s = getScore(l);
            return (
              <div key={l.id} className="card leadrow" style={{ background: C.bg, border: `1px solid ${C.linea}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                {/* Score circular */}
                <div style={{ flexShrink: 0, textAlign: "center", width: 64 }}>
                  <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto" }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke={C.linea} strokeWidth="6" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke={scoreColor(s)} strokeWidth="6"
                        strokeDasharray={`${(s / 100) * 150.8} 150.8`} strokeLinecap="round" transform="rotate(-90 28 28)" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700 }}>{s}</div>
                  </div>
                  <div style={{ fontSize: 10, color: scoreColor(s), fontWeight: 700, marginTop: 2 }}>{scoreLabel(s)}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{l.nombre}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: l.interes === "camaras" ? C.azul : C.verde, padding: "2px 8px", borderRadius: 10 }}>
                      {l.interes === "camaras" ? "CÁMARAS" : "CERCA"}
                    </span>
                    <span style={{ fontSize: 11, color: C.gris }}>· {l.hora}</span>
                    {l.fueraHorario && (
                      <span title="Llegó fuera de horario — atendido por Aura" style={{ fontSize: 10, fontWeight: 700, color: C.azul, background: C.azulSoft, padding: "2px 7px", borderRadius: 8 }}>
                        🌙 fuera de horario
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: C.gris, margin: "4px 0 6px" }}>{l.resumen}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: C.ink }}>
                    {l.metros ? <span>📏 {l.metros} m {l.desnivel ? "(desnivel)" : "(pareja)"}</span> : null}
                    {l.municipio ? <span>📍 {l.municipio}</span> : null}
                    {l.precio ? <span style={{ color: C.verde, fontWeight: 600 }}>≈ {MXN(l.precio)}</span> : null}
                    {l.tel ? <span>📞 {l.tel}</span> : <span style={{ color: C.rojo }}>sin contacto</span>}
                  </div>
                </div>

                {/* Estado + acciones */}
                <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLOR[l.estado], background: C.panel, border: `1px solid ${C.linea}`, padding: "3px 10px", borderRadius: 8 }}>{l.estado}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["Nuevo", "Contactado", "Cotizado"].includes(l.estado) && (
                      <button className="btn" onClick={() => avanzar(l.id)} style={{ background: C.verde, color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>
                        {l.estado === "Nuevo" ? "Marcar contactado" : l.estado === "Contactado" ? "Marcar cotizado" : "Marcar cerrado"}
                      </button>
                    )}
                    <button className="btn" onClick={() => setSel(l)} style={{ background: C.azulSoft, color: C.azul, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>Ver</button>
                    {l.tel && (
                      <a href={`https://wa.me/52${l.tel.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="btn" style={{ background: C.verde, color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
                        Contactar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle */}
      {sel && <Detalle lead={sel} score={getScore(sel)} factores={scoreLead(sel).factores} onClose={() => setSel(null)} onEstado={(e) => { setEstado(sel.id, e); setSel({ ...sel, estado: e }); }} />}
    </div>
  );
}

function Metric({ label, value, sub, color, small, alert }) {
  return (
    <div className="card" style={{ background: "#FFF", border: `1px solid ${alert ? "#F3D9A6" : C.linea}`, borderRadius: 14, padding: "14px 16px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: C.gris, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: small ? 20 : 28, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: C.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.gris, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Detalle({ lead, score, factores, onClose, onEstado }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,42,63,.4)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, maxWidth: 460, width: "100%", overflow: "hidden", boxShadow: "0 20px 60px rgba(15,42,63,.3)" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.azul}, ${C.verde})`, padding: "20px 22px", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: .85, fontWeight: 600 }}>DETALLE DEL LEAD</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700 }}>{lead.nombre}</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>Potencial {scoreLabel(score)} · {score}/100</div>
        </div>
        <div style={{ padding: 22 }}>
          <Row k="Interés" v={lead.interes === "camaras" ? "Cámaras de seguridad" : "Cerca eléctrica"} />
          {lead.metros ? <Row k="Metros" v={`${lead.metros} m · ${lead.desnivel ? "con desnivel" : "barda pareja"}`} /> : null}
          {lead.municipio ? <Row k="Municipio" v={lead.municipio} /> : null}
          {lead.precio ? <Row k="Estimado" v={MXN(lead.precio)} hi /> : null}
          <Row k="Contacto" v={lead.tel || "No proporcionado"} />
          <Row k="Mensajes" v={`${lead.mensajes} · llegó ${lead.hora}`} />
          <div style={{ background: C.panel, borderRadius: 10, padding: 12, margin: "10px 0", fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
            <b style={{ color: C.azul }}>Contexto de Aura:</b> {lead.resumen}
          </div>

          {factores && factores.length > 0 && (
            <div style={{ margin: "10px 0" }}>
              <div style={{ fontSize: 11, color: C.gris, fontWeight: 600, marginBottom: 6 }}>POR QUÉ ES POTENCIAL {scoreLabel(score).toUpperCase()}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {factores.map((f) => (
                  <span key={f} style={{ fontSize: 11.5, background: C.verdeSoft, color: "#137A57", border: "1px solid #C9EBDD", padding: "3px 9px", borderRadius: 8 }}>✓ {f}</span>
                ))}
              </div>
            </div>
          )}

          {lead.tel && (
            <a href={`https://wa.me/52${lead.tel.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="btn" style={{ display: "block", textAlign: "center", background: C.verde, color: "#fff", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600, textDecoration: "none", marginTop: 6 }}>
              Contactar por WhatsApp
            </a>
          )}
          <div style={{ fontSize: 11, color: C.gris, fontWeight: 600, margin: "14px 0 8px" }}>MOVER A</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ESTADOS.map((e) => (
              <button key={e} className="btn" onClick={() => onEstado(e)}
                style={{ background: lead.estado === e ? ESTADO_COLOR[e] : "#fff", color: lead.estado === e ? "#fff" : C.gris, border: `1px solid ${lead.estado === e ? ESTADO_COLOR[e] : C.linea}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
                {e}
              </button>
            ))}
          </div>
          <button className="btn" onClick={onClose} style={{ width: "100%", marginTop: 16, background: C.ink, color: "#fff", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600 }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, hi }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.linea}`, fontSize: 13 }}>
      <span style={{ color: C.gris }}>{k}</span>
      <span style={{ fontWeight: 600, color: hi ? C.verde : C.ink }}>{v}</span>
    </div>
  );
}
