# Análisis de Requerimientos — ClubRank

## 1. Introducción

### 1.1 Propósito

Este documento describe el análisis de requerimientos del sistema **ClubRank**: una plataforma para organizar clubes/organizaciones, gestionar sus eventos (campamentos, reuniones, etc.) y evaluar el desempeño de los clubes participantes mediante criterios ponderados, generando rankings por evento y por temporada. Incluye además el registro de incidentes ocurridos durante los eventos y un sistema de penalizaciones aplicables por el Staff según motivos definidos por el Admin.

### 1.2 Alcance

El sistema es **multiorganizacional**: cualquier organización (inicialmente pensado para el Club de Conquistadores de la iglesia Adventista, pero de uso general) puede registrarse, crear su propia estructura de clubes, miembros y eventos, de forma completamente aislada de las demás organizaciones.

El sistema será **aplicación web responsive** (PC, tablet y celular) con **backend API REST**. El diseño será **API-first**: la web consume la misma API que usará la futura app móvil nativa (Android/iOS), para no reescribir la lógica de negocio.

### 1.3 Definiciones y siglas

| Término | Definición |
|---|---|
| Organización | Entidad raíz del sistema (ej. una iglesia, institución o federación) que agrupa clubes. |
| Club | Grupo/equipo perteneciente a una organización, con sus propios miembros. |
| Evento | Actividad (campamento, reunión, etc.) donde participan uno o más clubes y son evaluados. Tiene un puntaje máximo definido por el Admin. |
| Criterio | Categoría de evaluación definida por el admin para un evento, con un peso porcentual. |
| Staff | Usuario que evalúa a los clubes en un evento. |
| Staff principal | El Staff designado como evaluador oficial de un club específico dentro de un evento; su calificación es la que determina el puntaje del club en ese evento. |
| Director | Usuario que representa a un club y puede ver sus propios resultados. |
| Incidente | Reporte de una situación ocurrida durante un evento (accidente, salud, disciplina, logística, etc.), registrado por el Staff. |
| Motivo de penalización | Categoría predefinida por el Admin (ej. "campamento no limpio") con un valor fijo de puntos a descontar. |
| Penalización | Aplicación de un motivo de penalización a un club, realizada por un Staff, que descuenta puntos del puntaje del evento donde ocurrió y, por tanto, del total de temporada del club. |
| Notificación in-app | Aviso dentro de la web (campanita/listado) para incidente grave o nuevo resultado. Sin email ni push en MVP. |
| Auditoría | Registro de quién evaluó, reportó, penalizó, cerró/reabrió o anuló, y cuándo. |
| RF | Requerimiento Funcional. |
| RNF | Requerimiento No Funcional. |

---

## 2. Actores del sistema

| Actor | Descripción |
|---|---|
| **Admin** | Crea y administra su organización: clubes, miembros, eventos (incluyendo su puntaje máximo), criterios de evaluación, motivos de penalización, accesos de staff/director, staff principal por club, incidentes, reportes y resultados. Tiene control total sobre los datos de su organización. |
| **Staff** | Usuario creado por el admin, asignado a un evento específico. Evalúa a los clubes participantes de ese evento mediante puntajes por criterio y comentarios, puede reportar incidentes y aplicar penalizaciones (según catálogo del Admin). Si es designado "principal" de un club, su calificación es la que cuenta para el puntaje oficial del club en ese evento. |
| **Director** | Usuario creado por el admin, asociado a un club específico. Consulta los eventos en los que participó su club y los resultados obtenidos. No tiene permisos de evaluación bajo ninguna circunstancia. |

> Los tres actores comparten la misma pantalla de inicio de sesión (usuario y contraseña); el sistema determina el rol y redirige al panel correspondiente. Solo el Admin puede auto-registrarse (crear cuenta); Staff y Director son creados exclusivamente por el Admin.

### 2.1 Diagrama de casos de uso (por actor)

```
                    ADMIN
   ┌───────────────────────────────────────────┐
   │ Crear cuenta / organización                │
   │ Gestionar clubes y miembros                │
   │ Importar miembros por Excel                │
   │ Crear y gestionar eventos (con puntaje máx) │
   │ Definir criterios y pesos                  │
   │ Asignar clubes a eventos                   │
   │ Designar staff principal por club           │
   │ Generar accesos masivos (staff/director)   │
   │ Definir motivos de penalización            │
   │ Ver y gestionar incidentes reportados       │
   │ Ver reportes (resultados, incidentes,       │
   │   penalizaciones, actividad de staff)       │
   │ Cerrar evaluaciones de un evento            │
   │ Ver ranking (evento y temporada, filtrable) │
   │ Proyectar "Mostrar resultado" (pantalla     │
   │   pública, evento o temporada)              │
   │ Exportar resultados (PDF/Excel)             │
   │ Editar/eliminar cualquier dato              │
   └───────────────────────────────────────────┘

                    STAFF
   ┌───────────────────────────────────────────┐
   │ Iniciar sesión                              │
   │ Ver clubes participantes del evento         │
   │ Evaluar clubes (puntaje + comentario)       │
   │ Editar sus propias evaluaciones             │
   │   (mientras el evento no esté cerrado)      │
   │ Reportar incidentes                         │
   │ Aplicar penalizaciones (del catálogo)       │
   └───────────────────────────────────────────┘

                   DIRECTOR
   ┌───────────────────────────────────────────┐
   │ Iniciar sesión                              │
   │ Ver su club y sus miembros                  │
   │ Ver eventos donde participó su club         │
   │ Ver resultados/puntajes de su club          │
   └───────────────────────────────────────────┘
```

---

## 3. Requerimientos Funcionales (RF)

### 3.1 Autenticación y cuentas

| ID | Requerimiento |
|---|---|
| RF-01 | El sistema debe permitir que un usuario nuevo cree una cuenta de Admin (auto-registro), generando simultáneamente su organización. |
| RF-02 | El sistema debe permitir el inicio de sesión mediante un único formulario de usuario y contraseña, válido para Admin, Staff y Director. |
| RF-03 | El sistema debe redirigir automáticamente al usuario autenticado al panel correspondiente según su rol. |
| RF-04 | El sistema debe permitir que el Admin genere de forma masiva usuarios y contraseñas aleatorios para Staff y Director. Si el usuario ya existe (usuario global), solo se crea su asignación al evento/club en lugar de duplicar credenciales. |
| RF-05 | El sistema no debe permitir el auto-registro de Staff ni Director; sus cuentas solo pueden ser creadas por un Admin. |
| RF-06 | El sistema debe aislar completamente los datos entre organizaciones (multi-tenant): ningún usuario puede ver datos de una organización distinta a la suya. |

### 3.2 Gestión de organización, clubes y miembros

| ID | Requerimiento |
|---|---|
| RF-07 | El Admin debe poder crear, editar y eliminar clubes dentro de su organización. |
| RF-08 | El Admin debe poder registrar miembros de un club con datos básicos (nombre, edad, cargo, año de ingreso, categoría de membresía). |
| RF-09 | El sistema debe permitir importar miembros desde un archivo Excel, mediante una plantilla exportable. |
| RF-10 | El sistema debe validar los datos importados y reportar errores o registros duplicados. |

### 3.3 Gestión de eventos

| ID | Requerimiento |
|---|---|
| RF-11 | El Admin debe poder crear eventos con nombre, fecha, lugar, tipo, temporada/año y **puntaje máximo** (ej. 120, 320, 520 pts). |
| RF-12 | El Admin debe poder asignar uno o varios clubes participantes a un evento. |
| RF-13 | El Admin debe poder definir criterios de evaluación por evento, cada uno con un peso porcentual. |
| RF-14 | El sistema debe validar que la suma de los pesos de los criterios de un evento sea igual a 100%. |
| RF-15 | El Admin debe poder cerrar las evaluaciones de un evento; una vez cerrado, ningún usuario puede modificar evaluaciones, incidentes ni aplicar nuevas penalizaciones asociadas. Solo el Admin puede reabrirlo (RF-34) o anular penalizaciones (RF-40), quedando todo en auditoría. |
| RF-42 | El Admin debe poder designar, al asignar Staff a un evento, cuál Staff es el **Staff principal** evaluador de cada club participante. |
| RF-33 | El Admin debe poder ver, antes de cerrar el evento, un resumen de evaluaciones pendientes (qué Staff principal no ha calificado a qué club). |

### 3.4 Evaluación

| ID | Requerimiento |
|---|---|
| RF-16 | El Staff debe poder ver la lista de clubes participantes del evento al que fue asignado. |
| RF-17 | El Staff debe poder calificar cada club con un puntaje de 0 a 100 por cada criterio definido, más un comentario. |
| RF-18 | El Staff debe poder editar sus propias evaluaciones mientras el evento no esté cerrado. |
| RF-19 | El sistema debe calcular el puntaje de un club en un evento usando **únicamente la evaluación del Staff principal** designado para ese club (puntaje ponderado × puntaje máximo del evento, menos penalizaciones del evento). El sistema debe bloquear con 403 cualquier intento de calificar de un Staff no-principal de ese club. |

### 3.5 Incidentes

| ID | Requerimiento |
|---|---|
| RF-29 | El Staff debe poder reportar un incidente durante un evento, indicando club afectado (opcional), tipo, descripción y gravedad. Sin foto en MVP. |
| RF-30 | El Admin debe poder ver, filtrar (por evento, club, tipo, gravedad, estado) y cambiar el estado de los incidentes reportados (abierto → en revisión → resuelto). |
| RF-31 | El sistema debe notificar in-app al Admin cuando se reporte un incidente de gravedad alta (campanita/listado). |
| RF-32 | Foto en incidente: fuera del MVP (solo texto). Queda para versión futura. |

### 3.6 Penalizaciones

| ID | Requerimiento |
|---|---|
| RF-35 | El Admin debe poder crear, editar y desactivar motivos de penalización (nombre, descripción, puntos a descontar), reutilizables en todos los eventos de su organización. |
| RF-36 | El Staff debe poder aplicar uno o varios motivos de penalización (del catálogo) a un club durante un evento, con comentario opcional. |
| RF-37 | El sistema debe descontar los puntos de las penalizaciones aplicadas del puntaje del evento donde ocurrieron (puntaje_evento_final = puntaje_principal − penalizaciones_del_evento) y, por tanto, del acumulado de temporada (que suma eventos ya netos, sin doble descuento). |
| RF-38 | El Staff solo puede aplicar penalizaciones mientras el evento no esté cerrado. En evento cerrado se bloquea; solo el Admin puede anular vía reapertura (RF-34/RF-40). |
| RF-39 | El Admin debe poder ver un reporte de penalizaciones aplicadas (por evento, club, staff que la aplicó, motivo). |
| RF-40 | El sistema debe permitir al Admin anular una penalización aplicada por error, quedando registrado en auditoría quién y cuándo la anuló. |

### 3.7 Resultados y reportes

| ID | Requerimiento |
|---|---|
| RF-20 | El sistema debe mostrar el ranking de un evento (1.er, 2.º y 3.er lugar), ordenado por puntaje final del evento descendente (puntaje del Staff principal menos penalizaciones de ese evento). |
| RF-21 | El sistema debe manejar empates comparando el puntaje del criterio de mayor peso; si persiste el empate, los clubes comparten posición. |
| RF-22 | El sistema debe calcular y mostrar un ranking global por temporada/año, sumando los puntajes finales (ya netos de penalizaciones) de cada club en los eventos de esa temporada. |
| RF-23 | El Admin debe poder exportar los resultados de un evento o temporada a PDF y/o Excel. |
| RF-24 | El Director debe poder ver únicamente los eventos y resultados correspondientes a su propio club. |
| RF-43 | El sistema debe obtener el puntaje final de temporada sumando los puntajes finales de cada evento (ya descontadas sus penalizaciones), sin doble descuento. |
| RF-44 | El Admin debe poder acceder a un apartado de reportes que incluya: resultados/ranking, incidentes, penalizaciones, y actividad de staff (evaluaciones pendientes/completadas). |
| RF-45 | La pantalla de resultados debe mostrar, por defecto, el ranking de temporada (suma de puntajes finales de todos los eventos). |
| RF-46 | El sistema debe permitir filtrar la vista de resultados por un evento específico, mostrando únicamente el ranking de ese evento. |
| RF-47 | El sistema debe incluir una vista "Mostrar resultado" en modo pantalla completa, sin controles administrativos, para proyectar el ranking (de evento o de temporada) ante el público. Accesible solo desde el panel del Admin autenticado (sin link público en MVP). |
| RF-48 | La vista "Mostrar resultado" debe actualizarse automáticamente al recibir nuevos resultados, sin necesidad de recargar manualmente (polling). |
| RF-49 | El Admin debe poder elegir, desde la vista "Mostrar resultado", si proyecta el ranking de un evento específico o el ranking de temporada. |

### 3.8 Funcionalidades adicionales (extra / deseables)

| ID | Requerimiento |
|---|---|
| RF-25 | El sistema debe mostrar estadísticas y gráficas básicas del desempeño de un club: línea de puntaje por evento y barras por criterio (MVP). Comparativas entre clubes quedan para v2. |
| RF-26 | El sistema debe mantener un historial/auditoría de qué usuario evaluó, reportó, penalizó, cerró/reabrió o anuló, a qué club y cuándo. |
| RF-27 | El sistema debe notificar in-app a los directores cuando haya un nuevo resultado disponible (campanita/listado). |
| RF-28 | El sistema debería generar copias de seguridad periódicas de los datos. |
| RF-34 | El sistema debe permitir que el Admin "reabra" un evento cerrado en casos excepcionales, quedando registrado en auditoría quién y cuándo lo reabrió. |

---

## 4. Requerimientos No Funcionales (RNF)

| ID | Requerimiento |
|---|---|
| RNF-01 | **Web responsive**: el sistema debe funcionar en navegadores modernos de PC, tablet y celular (uso en campo por Staff). |
| RNF-02 | **Arquitectura API-first**: el frontend web debe consumir un backend con API REST documentada y versionada; toda la lógica de negocio (cálculos, validaciones, cierre) reside en el backend, no en el cliente. |
| RNF-09 | **Preparado para app futura**: la API debe ser reutilizable sin cambios por una futura app móvil nativa (mismos endpoints, autenticación por token). No se desarrolla app nativa en esta versión. |
| RNF-03 | **Seguridad**: las contraseñas deben almacenarse de forma segura (hash), nunca en texto plano. |
| RNF-04 | **Aislamiento de datos**: la arquitectura debe garantizar separación estricta de datos entre organizaciones (multi-tenancy). |
| RNF-05 | **Usabilidad**: el flujo de evaluación (Staff) debe ser simple y rápido de completar, pensado para uso en campo (ej. tablet o celular durante un evento). |
| RNF-06 | **Disponibilidad**: el sistema debe estar accesible durante eventos en vivo, donde varios Staff evalúan simultáneamente. |
| RNF-07 | **Escalabilidad**: el sistema debe soportar múltiples organizaciones operando de forma independiente y simultánea. |
| RNF-08 | **Integridad**: una vez cerrado un evento, los datos de evaluación, incidentes y penalizaciones deben quedar protegidos contra modificaciones. |

---

## 5. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | La suma de los pesos de los criterios de un evento debe ser exactamente 100%. |
| RN-02 | El puntaje de cada criterio se califica en una escala de 0 a 100. |
| RN-03 | El puntaje de un club en un evento es el resultado de la evaluación del **Staff principal** designado para ese club (porcentaje ponderado de criterios × puntaje máximo del evento, menos penalizaciones de ese evento). No se promedia entre evaluadores; el sistema bloquea calificaciones de no-principales. |
| RN-04 | Una vez cerrado un evento, ninguna evaluación, incidente ni penalización asociada puede crearse ni editarse. Solo el Admin puede reabrirlo o anular penalizaciones, con auditoría. |
| RN-05 | Un Admin administra, por el momento, una única organización. |
| RN-06 | Un Director solo puede visualizar información de su propio club; no tiene acceso a otros clubes ni a evaluaciones ajenas. |
| RN-07 | Solo el rol Admin puede auto-registrarse; Staff y Director son creados exclusivamente por el Admin. |
| RN-08 | Un Staff solo puede calificar, reportar incidentes o aplicar penalizaciones dentro del evento específico al que fue asignado; no tiene acceso a otros eventos, aunque sean de la misma organización. |
| RN-09 | El Director no tiene permisos de evaluación, penalización ni reporte de incidentes bajo ninguna circunstancia; su acceso es exclusivamente de lectura sobre los datos de su propio club. |
| RN-10 | El puntaje máximo de un evento es definido por el Admin al crearlo (no es fijo en 100); el ranking de temporada resulta de sumar los puntajes obtenidos por el club en cada evento. |
| RN-11 | Los motivos de penalización son definidos a nivel organización (catálogo reutilizable en todos los eventos), con un valor de descuento fijo establecido por el Admin. |
| RN-12 | Las penalizaciones se descuentan del puntaje del evento donde ocurrieron (puntaje_evento_final) y, por suma, del acumulado de temporada. Tanto el ranking de evento (RF-20) como el de temporada (RF-22) se ven afectados. No aplicar doble descuento en temporada. |
| RN-13 | Cada club debe tener exactamente un Staff principal designado por cada evento en el que participa. |
| RN-14 | La vista de resultados por defecto es el acumulado de temporada; el ranking de un evento individual solo se muestra al aplicar el filtro correspondiente. |

---

## 6. Restricciones y supuestos

- Se asume que cada organización gestiona sus propios eventos de forma independiente (no hay eventos compartidos entre organizaciones).
- Se asume usuario global: un mismo Staff/Director tiene una sola cuenta y se le asigna a N eventos/clubes (no credenciales distintas por evento). La generación masiva reutiliza cuentas existentes.
- Se asume que solo el Staff principal puede calificar a su club asignado; cualquier otro intento se bloquea con 403.
- No se contempla, en esta versión, app móvil nativa; solo web responsive. La API queda lista para conectarla a futuro.
- No se contempla, en esta versión, recuperación de contraseña ni aprobación manual de cuentas Admin.
- No se contempla foto en incidentes (MVP solo texto) ni link público para proyección (solo Admin autenticado).
- No se contempla facturación ni planes de pago (fuera del alcance de este análisis).
