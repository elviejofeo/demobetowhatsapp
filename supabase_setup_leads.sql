-- ============================================================
-- Orquesta Supply · Leads capturados por Aura (CETEC)
-- Tabla NUEVA en el mismo proyecto orquesta-diagnosticos.
-- SQL Editor → New query → pega y corre.
-- ============================================================

create table if not exists public.cetec_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nombre       text,
  telefono     text,
  interes      text,              -- 'cerca' | 'camaras'
  metros       int,
  superficie   text,              -- barda | malla | azotea
  desnivel     boolean default false,
  municipio    text,
  precio       int,               -- estimado calculado
  pregunto_precio boolean default false,
  mensajes     int default 0,
  fuera_horario boolean default false,
  resumen      text,
  estado       text not null default 'Nuevo'  -- Nuevo|Contactado|Cotizado|Cerrado|Perdido
);

alter table public.cetec_leads enable row level security;

-- El asistente (server) inserta; el panel lee y actualiza estado.
-- Para el demo usamos la publishable key (anon) con permisos abiertos.
create policy "leads_insert" on public.cetec_leads
  for insert to anon with check (true);
create policy "leads_select" on public.cetec_leads
  for select to anon using (true);
create policy "leads_update" on public.cetec_leads
  for update to anon using (true) with check (true);
