"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Card, CardHeader, Button, inputCls, Spinner, Empty, Badge, PageHeader } from "@/components/ui";

interface Incidente {
  id: string;
  tipo: string;
  gravedad: "baja" | "media" | "alta";
  descripcion: string;
  estado: "abierto" | "en_revision" | "resuelto";
  createdAt: string;
  evento: { id: string; nombre: string };
  eventoClub: { club: { id: string; nombre: string } } | null;
  usuario: { id: string; nombre: string | null; username: string };
}
interface Evento {
  id: string;
  nombre: string;
}
interface Club {
  id: string;
  nombre: string;
}

const GRAVEDAD_TONE = { baja: "blue", media: "amber", alta: "red" } as const;
const ESTADO_TONE = { abierto: "red", en_revision: "amber", resuelto: "green" } as const;
const GRAVEDAD_LABEL = { baja: "Baja", media: "Media", alta: "Alta" } as const;
const ESTADO_LABEL = { abierto: "Abierto", en_revision: "En revisión", resuelto: "Resuelto" } as const;

export default function IncidentesPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [incidentes, setIncidentes] = useState<Incidente[] | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [filtros, setFiltros] = useState({ evento: "", club: "", estado: "", gravedad: "" });

  async function cargar() {
    const params = new URLSearchParams();
    if (filtros.evento) params.set("evento", filtros.evento);
    if (filtros.club) params.set("club", filtros.club);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.gravedad) params.set("gravedad", filtros.gravedad);
    const q = params.toString();
    const data = await apiClient.get<Incidente[]>(`/organizaciones/${sesion!.organizacionId}/incidentes${q ? `?${q}` : ""}`);
    setIncidentes(data);
  }

  useEffect(() => {
    if (sesion?.organizacionId) {
      apiClient.get<Evento[]>(`/organizaciones/${sesion.organizacionId}/eventos`).then(setEventos).catch(() => setEventos([]));
      apiClient.get<Club[]>(`/organizaciones/${sesion.organizacionId}/clubes`).then(setClubes).catch(() => setClubes([]));
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  async function cambiarEstado(i: Incidente, estado: Incidente["estado"]) {
    await apiClient.patch(`/incidentes/${i.id}`, { estado });
    cargar();
  }

  const selectCls = inputCls;

  if (cargando || !sesion || !incidentes) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Incidentes" subtitle="Reportes realizados por Staff durante los eventos" />

      <Card>
        <div className="flex flex-wrap gap-2 p-4">
          <select className={selectCls} value={filtros.evento} onChange={(e) => setFiltros({ ...filtros, evento: e.target.value })}>
            <option value="">Todos los eventos</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select className={selectCls} value={filtros.club} onChange={(e) => setFiltros({ ...filtros, club: e.target.value })}>
            <option value="">Todos los clubes</option>
            {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={selectCls} value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelto">Resuelto</option>
          </select>
          <select className={selectCls} value={filtros.gravedad} onChange={(e) => setFiltros({ ...filtros, gravedad: e.target.value })}>
            <option value="">Toda gravedad</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          <Button onClick={cargar}>Filtrar</Button>
        </div>
      </Card>

      <Card>
        <div className="divide-y divide-slate-100">
          {incidentes.map((i) => (
            <div key={i.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{i.tipo}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {i.evento.nombre}
                    {i.eventoClub ? ` · ${i.eventoClub.club.nombre}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={GRAVEDAD_TONE[i.gravedad]}>{GRAVEDAD_LABEL[i.gravedad]}</Badge>
                  <Badge tone={ESTADO_TONE[i.estado]}>{ESTADO_LABEL[i.estado]}</Badge>
                  {i.estado === "abierto" ? (
                    <Button variant="secondary" onClick={() => cambiarEstado(i, "en_revision")}>
                      Pasar a revisión
                    </Button>
                  ) : null}
                  {i.estado === "en_revision" ? (
                    <Button variant="secondary" onClick={() => cambiarEstado(i, "resuelto")}>
                      Resolver
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">{i.descripcion}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(i.createdAt).toLocaleString("es")} · reportado por {i.usuario.nombre ?? i.usuario.username}
              </p>
            </div>
          ))}
          {incidentes.length === 0 && <Empty>Sin incidentes con esos filtros.</Empty>}
        </div>
      </Card>
    </div>
  );
}