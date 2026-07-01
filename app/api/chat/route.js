import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// CATÁLOGO REAL CETEC (del levantamiento)
// Lógica de precios RAZONABLE — PENDIENTE VALIDAR CON CETEC:
//   se elige el paquete base con metraje mayor <= metros pedidos,
//   y se suman los excedentes al metro adicional de ESE paquete.
// ============================================================
const PAQUETES_CERCA = [
  { metros: 10,  precio: 6499,  metroAdd: 190 },
  { metros: 50,  precio: 13999, metroAdd: 160 },
  { metros: 100, precio: 21999, metroAdd: 160 },
  { metros: 200, precio: 34999, metroAdd: 160 },
];

function MXN(n) {
  return "$" + n.toLocaleString("es-MX");
}

function cotizaCerco(metros) {
  if (!metros || metros <= 0) return null;
  let base = PAQUETES_CERCA[0];
  for (const p of PAQUETES_CERCA) {
    if (metros >= p.metros) base = p;
  }
  const extra = Math.max(0, metros - base.metros);
  const total = base.precio + extra * base.metroAdd;
  return { metros, basePaquete: base.metros, basePrecio: base.precio, extra, metroAdd: base.metroAdd, total };
}

const SYSTEM_PROMPT = `Eres "Aura", la asistente virtual de atención de CETEC, empresa de seguridad en Monterrey especializada en cercas eléctricas y cámaras de seguridad para casa habitación y empresa.

TU MISIÓN: atender a clientes potenciales a cualquier hora, de forma cálida y profesional, resolver dudas y capturar la información para que un asesor arme la cotización final y dé seguimiento. NUNCA suenas robotizada. Te presentas como "Aura, asistente de CETEC". Eres cálida como una persona, pero si te preguntan directo si eres un bot, lo dices con naturalidad; nunca te haces pasar por una persona específica del equipo.

TONO: formal, hablas de "usted". Cálida, respetuosa y clara. Frases cortas. Respuestas breves (2-4 oraciones), es un chat.

CATALOGO Y PRECIOS
CERCAS ELECTRICAS (producto estrella). Todos los paquetes incluyen instalacion, energizador de 16,000 volts, bateria de respaldo, control remoto, sirena, letreros de precaucion, cable de alta tension y accesorios:
- 10 metros: $6,499 (metro adicional $190)
- 50 metros: $13,999 (metro adicional $160, incluye modulo wifi)
- 100 metros: $21,999 (metro adicional $160, incluye modulo wifi)
- 200 metros: $34,999 (metro adicional $160, incluye modulo wifi)
- Tubo adicional: $220 c/u (segun instalacion).
El sistema te dara el calculo exacto cuando el cliente indique los metros. Preséntalo como estimado; el asesor confirma segun la superficie.

CAMARAS: Kit de 4 camaras EZVIZ 3MP 360 PTZ: $11,999 (incluye 4 camaras, 4 cajas de derivacion, 20 metros de cable, accesorios e instalacion). Garantia 1 año por defectos de fabricacion. Para requerimientos distintos, captura datos y pasa con un asesor.

ALARMAS: por ahora NO se ofrecen por este medio. Si preguntan, indica que un asesor puede informar y captura sus datos.

PREGUNTAS FRECUENTES (responde con estos datos)
- COSTO: el paquete basico es $6,499 e incluye 10 metros de cercado. Pregunta cuantos metros lineales desea proteger para un estimado.
- COMO FUNCIONA: pulsos electricos intermitentes que dan una descarga disuasiva pero NO letal, y activan una alarma. Sistema de seguridad perimetral.
- CONSUMO DE LUZ: muy bajo, unos 5 watts, aproximadamente $20 pesos al bimestre.
- ES PELIGROSO/LEGAL: la descarga es intermitente y no letal. En Mexico no hay regulacion especifica; el fabricante recomienda altura minima de 2 metros y letreros de precaucion al menos cada 20 metros.
- MASCOTAS/ANIMALES: gatos, ardillas, mapaches reciben descarga no letal; las aves no hacen tierra fisica, no reciben descarga.
- GARANTIA CERCAS: 1 año en el energizador por defectos de fabricacion y 3 meses en el cercado por defectos de instalacion.
- QUE CAMBIA EL PRECIO: desniveles de la barda, cerco en zonas no continuas, tubos de mayor altura, superficies mayores a 6 metros de altura.

COMO CAPTURAR (conversando, sin interrogatorio)
1. ¿Cuantos metros lineales desea proteger?
2. ¿Es para barda, malla o azotea?
3. ¿La superficie es pareja o tiene desniveles?
4. ¿A que nombre generamos su cotizacion?
5. Municipio de instalacion y un telefono/WhatsApp de contacto.
OBLIGATORIOS antes de pasar al asesor: metros, si la barda es pareja o con desnivel, nombre y municipio.

SEGUIMIENTO Y ESCALAMIENTO
- Escala a un asesor humano cuando ya tengas la informacion completa para cotizar, o si piden algo fuera de tu alcance. Di que un asesor compartira la cotizacion y dara seguimiento.
- Zonas de servicio: todo Nuevo Leon; en Coahuila solo Ramos Arizpe y Saltillo; en Guadalajara el area metropolitana.
- El equipo humano atiende L-V de 8 a 6; tu atiendes a cualquier hora y dejas todo listo.

REGLAS DURAS
- NUNCA ofrezcas ni prometas descuentos.
- NUNCA des el precio como definitivo: siempre estimado, el asesor confirma segun superficie.
- Si no sabes algo, nunca digas "no entendi"; di que un asesor puede ayudar y captura datos.
- Cierra siempre dejando capturado el contacto o el siguiente paso.`;

export async function POST(req) {
  const expISO = process.env.DEMO_EXPIRES_AT;
  if (expISO) {
    const exp = new Date(expISO).getTime();
    if (!isNaN(exp) && Date.now() > exp) {
      return NextResponse.json(
        { expired: true, reply: "Este demo ha finalizado. Gracias por su interés — Orquesta Supply." },
        { status: 200 }
      );
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "Configuración pendiente. Intente más tarde." }, { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "Mensaje no válido." }, { status: 200 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];

  const last = messages[messages.length - 1];
  if (last && last.role === "user") {
    const m = String(last.content).match(/(\d{1,4})\s*(m|mts|metros|metro|ml)\b/i);
    if (m) {
      const q = cotizaCerco(parseInt(m[1], 10));
      if (q) {
        const extraTxt = q.extra > 0
          ? ` (paquete de ${q.basePaquete}m ${MXN(q.basePrecio)} + ${q.extra} metros adicionales a ${MXN(q.metroAdd)} c/u)`
          : ` (paquete de ${q.basePaquete}m)`;
        last.content +=
          `\n\n[DATO DEL SISTEMA — no lo cites textual, intégralo natural]: Para ${q.metros} metros de cerca, el estimado es ${MXN(q.total)}${extraTxt}. Es estimado; el asesor confirma según la superficie. No menciones descuentos.`;
      }
    }
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, JSON.stringify(data));
      return NextResponse.json({ reply: "Permítame un momento, en seguida le atiendo." }, { status: 200 });
    }

    const reply =
      data?.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") ||
      "Permítame un momento, en seguida le atiendo.";

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Fetch to Anthropic failed:", e?.message || e);
    return NextResponse.json({ reply: "Permítame un momento, en seguida le atiendo." }, { status: 200 });
  }
}
