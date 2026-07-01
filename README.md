# Beto · Demo Asistente CETEC — Orquesta Supply

Demo de atención con IA para CETEC. Chat estilo WhatsApp, tono formal, cotización
real de cercas y cámaras. La llamada a Claude corre en un backend protegido
(`/api/chat`), así la API key NUNCA se expone en el navegador.

## Subir a GitHub (repo nuevo y vacío)

Desde la carpeta del proyecto, en terminal:

```bash
git init
git add .
git commit -m "Demo Beto CETEC"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## Desplegar en Vercel

1. Vercel → New Project → importa el repo.
2. **Settings → Environment Variables**, agrega DOS variables (Production):
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic (la real, con saldo).
   - `DEMO_EXPIRES_AT` = fecha/hora ISO de expiración.
     Ej: `2026-06-30T18:00:00-06:00` (30 jun 6pm hora Monterrey).
3. Deploy. La URL de producción es la que le mandas a CETEC.

## Importante (seguridad)

- La API key SOLO va en las variables de Vercel. Nunca en el código ni en GitHub.
- Ponle límite de gasto a la key en console.anthropic.com (Billing → Usage limits).
- Después del demo: borra el deployment o quita la variable `ANTHROPIC_API_KEY`
  (sin key, Beto deja de responder). El candado `DEMO_EXPIRES_AT` lo apaga solo
  al llegar la fecha.

## Precios configurados (de CETEC)

- Cerca: paquete base 10 m = $6,499 · metro adicional = $190
- Kit 4 cámaras WiFi PTZ = $11,999

El cálculo de la cotización lo hace el servidor (preciso), Claude solo conversa.
