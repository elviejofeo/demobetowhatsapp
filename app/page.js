"use client";
import { useState, useRef, useEffect } from "react";

const C = {
  navy: "#0E1B28",
  navy2: "#16293B",
  teal: "#2A8C86",
  amber: "#C8862B",
  cream: "#F4F1EA",
  line: "rgba(255,255,255,.10)",
};

export default function Page() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "¡Buen día! Le saluda Aura, asistente de CETEC. Con gusto le ayudo con información sobre nuestras cercas eléctricas y cámaras de seguridad. ¿En qué puedo apoyarle?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Permítame un momento, en seguida le atiendo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.navy,
        color: C.cream,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 14px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        *{box-sizing:border-box}
        .typing span{animation:blink 1.4s infinite both}
        .typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}
        @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
        @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .bubble{animation:fadein .25s ease both}
        input::placeholder{color:rgba(244,241,234,.4)}
        @media (prefers-reduced-motion:reduce){.bubble,.typing span{animation:none!important}}
      `}</style>

      <div style={{ width: "100%", maxWidth: 460, marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.amber, fontWeight: 600 }}>
          ORQUESTA SUPPLY · DEMO
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600 }}>
          Asistente de CETEC
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: C.navy2,
          borderRadius: 18,
          border: `1px solid ${C.line}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "76vh",
          minHeight: 480,
        }}
      >
        <div
          style={{
            background: C.navy,
            padding: "12px 16px",
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: C.teal,
              display: "grid",
              placeItems: "center",
              fontWeight: 600,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Aura · CETEC</div>
            <div style={{ fontSize: 11, color: C.teal }}>en línea · responde al instante</div>
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="bubble"
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                padding: "9px 13px",
                borderRadius: 14,
                background: m.role === "user" ? C.teal : C.navy,
                fontSize: 14,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                borderBottomRightRadius: m.role === "user" ? 4 : 14,
                borderBottomLeftRadius: m.role === "user" ? 14 : 4,
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div
              className="bubble typing"
              style={{
                alignSelf: "flex-start",
                padding: "11px 15px",
                borderRadius: 14,
                background: C.navy,
                borderBottomLeftRadius: 4,
              }}
            >
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          )}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escriba su mensaje…"
            style={{
              flex: 1,
              background: C.navy,
              border: `1px solid ${C.line}`,
              borderRadius: 22,
              padding: "11px 16px",
              color: C.cream,
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              background: C.teal,
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              color: "#fff",
              fontSize: 18,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 460,
          width: "100%",
          marginTop: 12,
          fontSize: 11,
          color: "rgba(244,241,234,.45)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Demo de muestra · Orquesta Supply. Pregúntele a Aura por costos, cómo funciona el cerco o el consumo de luz.
      </div>
    </div>
  );
}
