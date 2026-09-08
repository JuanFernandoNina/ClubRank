# ClubRank

Monorepo de la plataforma **ClubRank**: sistema multi-tenant para organizar clubes, gestionar eventos de evaluación, calcular rankings, y registrar incidentes y penalizaciones. API-first (próxima app nativa sobre la misma API).

## Stack

| Capa | Tecnología |
|------|-----------|
| Web | Next.js 16 (App Router) + Tailwind v4 |
| API | NestJS 12 + Prisma 6 (SQLite en dev) |
| Auth | JWT (bcryptjs) |

## Estructura

```
ClubRank/
├── apps/
│   ├── api/          # NestJS REST API (puerto 3001)
│   │   ├── prisma/   # Schema + SQLite DB
│   │   └── src/      # Módulos: auth, clubes, eventos, evaluaciones,
│   │                 #   incidentes, penalizaciones, director, reportes
│   └── web/          # Next.js web app (puerto 3000)
│       └── src/
│           ├── app/   # Rutas App Router
│           ├── components/ui.tsx
│           └── lib/   # api.ts (cliente HTTP), auth.ts (guard)
└── docs/             # Análisis de requerimientos y diagramas
```

## Requisitos

- Node.js ≥ 24
- npm ≥ 10

## Arranque rápido

```bash
# Instalar dependencias
npm install

# Preparar base de datos SQLite (dev)
npx prisma db push --skip-generate --schema=apps/api/prisma/schema.prisma

# Ejecutar en paralelo
npm run dev:api    # → http://localhost:3001/api
npm run dev:web    # → http://localhost:3000
```

## Producción (build)

```bash
npm run build   # build api + web
```

## Autenticación

| Rol | Acceso |
|-----|--------|
| **Admin** | CRUD clubes, miembros, eventos, criterios, accesos, cierre/reapertura, rankings, incidentes, penalizaciones |
| **Staff** | Evaluar eventos (solo principal del club), reportar incidentes, aplicar penalizaciones |
| **Director** | Ver resultados de su club |

## Decisiones de diseño consolidadas

- **Usuario global**: 1 cuenta → N asignaciones por evento/club
- **Staff no principal**: bloqueo 403 al evaluar (sin fallback)
- **Penalización**: descuenta tanto del evento como de la temporada
- **Cierre de evento**: bloqueado si hay clubes pendientes; el Staff principal define el puntaje oficial
- **Reapertura**: solo Admin con registro en auditoría
- **Notificaciones**: in-app únicamente
- **Fotos de incidentes**: fuera del MVP
- **Proyección**: solo Admin autenticado, sin link público
- **Excel (importación/exportación)**: plantilla exportable + validación al importar

## API principal (resumen)

Ver `docs/DiagramasDeSecuencia.md` para la lista completa.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/registro` | Crear organización + Admin |
| POST | `/auth/login` | Login Admin/Staff/Director |
| POST | `/auth/usuarios` | Crear Staff/Director (Admin) |
| GET/POST | `/organizaciones/:orgId/clubes` | CRUD clubes |
| GET/POST | `/organizaciones/:orgId/eventos` | CRUD eventos |
| POST | `/eventos/:id/criterios` | Agregar criterios |
| POST | `/eventos/:id/clubes` | Asignar clubes |
| POST | `/eventos/:id/generar-accesos` | Generar accesos staff/director |
| PATCH | `/eventos/:id/clubes/:clubId/principal` | Designar staff principal |
| GET | `/eventos/:id/pendientes` | Clubes sin evaluar |
| POST | `/eventos/:id/cerrar` / `reabrir` | Cerrar/reabrir evento |
| GET | `/eventos/:id/ranking` | Ranking del evento |
| GET | `/eventos/:id/clubes` | Clubes del evento (para evaluar) |
| POST | `/eventos/:id/evaluaciones` | Guardar evaluación |
| POST | `/eventos/:id/incidentes` | Reportar incidente |
| POST | `/eventos/:id/clubes/:clubId/penalizaciones` | Aplicar penalización |
| GET | `/director/resultados` | Resultados del Director |
