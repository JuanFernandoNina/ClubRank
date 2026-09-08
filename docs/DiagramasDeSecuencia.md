# Diagramas de Secuencia — ClubRank

> Diagramas en formato **Mermaid**. Se visualizan automáticamente en GitHub, GitLab, VS Code (con la extensión "Markdown Preview Mermaid Support"), Typora, Obsidian, y otros editores de Markdown compatibles.
> Alcance actual: solo **Web responsive (MVP)**. La API es API-first y será reutilizada sin cambios por la futura App móvil nativa.

---

## 1. Registro de Admin y creación de organización

```mermaid
sequenceDiagram
    actor A as Admin (nuevo)
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    A->>UI: Toca "Crear cuenta"
    UI->>A: Muestra formulario (nombre, usuario, contraseña, nombre de organización)
    A->>UI: Envía datos del formulario
    UI->>API: POST /auth/registro
    API->>API: Valida datos y hashea contraseña
    API->>DB: Crea registro Usuario (rol=admin)
    API->>DB: Crea registro Organizacion (vinculada al admin)
    DB-->>API: Confirmación (IDs generados)
    API-->>UI: 201 Created + token de sesión
    UI-->>A: Redirige al panel de Admin
```

---

## 2. Inicio de sesión (Admin, Staff o Director)

```mermaid
sequenceDiagram
    actor U as Usuario (Admin/Staff/Director)
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    U->>UI: Toca "Iniciar sesión"
    UI->>U: Muestra formulario (usuario, contraseña)
    U->>UI: Envía credenciales
    UI->>API: POST /auth/login
    API->>DB: Busca Usuario por username
    DB-->>API: Retorna Usuario (con rol y organizacion_id)
    API->>API: Verifica contraseña (hash)

    alt Credenciales válidas
        API-->>UI: 200 OK + token + rol
        alt rol = admin
            UI-->>U: Redirige a Panel de Organización
        else rol = staff
            UI-->>U: Redirige a Panel de Evaluación (evento asignado)
        else rol = director
            UI-->>U: Redirige a Panel de Club (resultados propios)
        end
    else Credenciales inválidas
        API-->>UI: 401 Unauthorized
        UI-->>U: Muestra mensaje de error
    end
```

---

## 3. Creación de evento, definición de puntaje máximo y generación masiva de accesos

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Crea evento (nombre, fecha, lugar, tipo, temporada, puntaje_maximo)
    UI->>API: POST /eventos
    API->>DB: Guarda Evento
    DB-->>API: evento_id

    Ad->>UI: Define criterios de evaluación (nombre + peso)
    UI->>API: POST /eventos/{id}/criterios
    API->>API: Valida que suma de pesos = 100%
    API->>DB: Guarda Criterios
    DB-->>API: Confirmación

    Ad->>UI: Asigna clubes participantes
    UI->>API: POST /eventos/{id}/clubes
    API->>DB: Crea registros Evento_Club
    DB-->>API: Confirmación

    Ad->>UI: Solicita "Generar accesos masivos"
    UI->>API: POST /eventos/{id}/generar-accesos
    Note over API,DB: Usuario global: reutilizar si ya existe, no duplicar credenciales
    loop Por cada Staff/Director requerido
        API->>DB: Busca Usuario por username/email en la organizacion
        alt Usuario no existe
            API->>API: Genera username y password aleatorios
            API->>DB: Crea Usuario (rol=staff|director, organizacion_id)
        end
        API->>DB: Crea Asignacion (usuario_id, evento_id, club_id si aplica)
        API->>DB: Crea Auditoria (quien, que, cuando)
    end
    DB-->>API: Lista de usuarios creados
    API-->>UI: 200 OK + lista de credenciales
    UI-->>Ad: Muestra/exporta lista de usuario y contraseña

    Ad->>UI: Designa Staff principal por cada club participante
    UI->>API: PATCH /eventos/{id}/clubes/{club_id} { staff_principal_id }
    API->>DB: Actualiza Evento_Club.staff_principal_id
    DB-->>API: Confirmación
    API-->>UI: 200 OK
    UI-->>Ad: Muestra confirmación de asignación
```

---

## 4. Evaluación de un club por Staff

```mermaid
sequenceDiagram
    actor S as Staff
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    S->>UI: Inicia sesión (ver diagrama 2)
    UI->>API: GET /eventos/{id}/clubes
    API->>DB: Consulta clubes del evento
    DB-->>API: Lista de clubes participantes
    API-->>UI: 200 OK + lista de clubes
    UI-->>S: Muestra clubes a evaluar

    S->>UI: Selecciona un club y asigna puntajes por criterio + comentario
    UI->>API: POST /evaluaciones (Authorization: Bearer <token>)
    API->>DB: Verifica token, organizacion_id y que el evento no esté cerrado

    alt Evento abierto
        API->>DB: Verifica si el Staff es el principal del club
        alt Es principal
            API->>DB: Crea/actualiza Evaluacion
            API->>DB: Crea/actualiza Puntaje por cada criterio
            API->>DB: Crea Auditoria + Notificacion in-app (nuevo resultado)
            DB-->>API: Confirmación
            API-->>UI: 200 OK
            UI-->>S: Muestra confirmación de guardado
        else No es principal
            API-->>UI: 403 Forbidden (solo Staff principal puede calificar)
            UI-->>S: Muestra mensaje "Solo el Staff principal puede calificar a este club"
        end
    else Evento cerrado
        API-->>UI: 403 Forbidden
        UI-->>S: Muestra mensaje "Evento cerrado, no se puede modificar"
    end
```

---

## 5. Staff reporta un incidente

```mermaid
sequenceDiagram
    actor S as Staff
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    S->>UI: Inicia sesión (ver diagrama 2)
    S->>UI: Toca "Reportar incidente"
    UI->>S: Muestra formulario (club opcional, tipo, gravedad, descripción — sin foto en MVP)
    S->>UI: Envía datos del incidente
    UI->>API: POST /eventos/{id}/incidentes (Authorization: Bearer <token>)
    API->>DB: Verifica token, organizacion_id y que el evento no esté cerrado

    alt Evento abierto
        API->>DB: Crea Incidente (evento_id, club_id, usuario_id, tipo, gravedad, descripcion, estado=abierto)
        API->>DB: Crea Auditoria
        DB-->>API: Confirmación

        alt Gravedad = alta
            API->>DB: Crea Notificacion in-app al Admin (campanita)
        end

        API-->>UI: 201 Created
        UI-->>S: Muestra confirmación de reporte
    else Evento cerrado
        API-->>UI: 403 Forbidden
        UI-->>S: Muestra mensaje "Evento cerrado, no se puede reportar"
    end
```

---

## 6. Admin gestiona incidentes reportados

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Abre sección "Incidentes"
    UI->>API: GET /organizaciones/{id}/incidentes?evento=&club=&gravedad=&estado=
    API->>DB: Consulta incidentes con filtros
    DB-->>API: Lista de incidentes
    API-->>UI: 200 OK + lista
    UI-->>Ad: Muestra incidentes filtrados

    Ad->>UI: Cambia estado de un incidente (en_revision/resuelto)
    UI->>API: PATCH /incidentes/{id} { estado }
    API->>DB: Actualiza Incidente.estado
    DB-->>API: Confirmación
    API-->>UI: 200 OK
    UI-->>Ad: Muestra estado actualizado
```

---

## 7. Admin crea motivo de penalización y Staff lo aplica

```mermaid
sequenceDiagram
    actor Ad as Admin
    actor S as Staff
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Note over Ad,DB: Configuración (una sola vez, reutilizable en todos los eventos)
    Ad->>UI: Crea motivo de penalización (nombre, descripción, puntos_descuento)
    UI->>API: POST /organizaciones/{id}/motivos-penalizacion
    API->>DB: Guarda Motivo_Penalizacion
    DB-->>API: Confirmación
    API-->>UI: 201 Created
    UI-->>Ad: Muestra motivo creado

    Note over S,DB: Durante el evento
    S->>UI: Selecciona club y motivo de penalización a aplicar
    UI->>API: GET /organizaciones/{id}/motivos-penalizacion
    API->>DB: Consulta motivos activos
    DB-->>API: Lista de motivos
    API-->>UI: 200 OK + lista
    UI-->>S: Muestra catálogo de motivos

    S->>UI: Confirma penalización (motivo + comentario opcional)
    UI->>API: POST /eventos/{id}/clubes/{club_id}/penalizaciones (Authorization: Bearer <token>)
    API->>DB: Verifica token, organizacion_id y que el evento no esté cerrado

    alt Evento abierto
        API->>DB: Crea Penalizacion_Aplicada (club_id, evento_id, usuario_id, motivo_id, comentario)
        API->>DB: Crea Auditoria
        DB-->>API: Confirmación
        Note over API,DB: Afecta ranking del evento y de temporada (sin doble descuento)
        API-->>UI: 201 Created
        UI-->>S: Muestra confirmación de penalización aplicada
    else Evento cerrado
        API-->>UI: 403 Forbidden
        UI-->>S: Muestra mensaje "Evento cerrado, no se puede aplicar"
    end
```

---

## 8. Cierre de evento y cálculo de resultados

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Solicita "Cerrar evaluaciones" del evento
    UI->>API: GET /eventos/{id}/pendientes
    API->>DB: Consulta clubes sin evaluación del Staff principal
    DB-->>API: Lista de pendientes
    API-->>UI: 200 OK + resumen de pendientes
    UI-->>Ad: Muestra resumen (si hay pendientes, advierte antes de continuar)

    Ad->>UI: Confirma cierre del evento
    UI->>API: POST /eventos/{id}/cerrar
    API->>DB: Marca Evento.cerrado = true
    DB-->>API: Confirmación

    API->>DB: Obtiene Evaluacion del Staff principal de cada club participante
    DB-->>API: Datos de evaluaciones

    loop Por cada Club participante
        API->>API: Calcula porcentaje ponderado (Σ valor_criterio × peso/100)
        API->>API: Calcula puntaje_bruto = porcentaje × evento.puntaje_maximo
        API->>DB: Obtiene penalizaciones del club en este evento
        API->>API: puntaje_evento_final = puntaje_bruto − Σ penalizaciones_evento
    end

    API->>API: Ordena clubes por puntaje_evento_final descendente
    API->>API: Resuelve empates (criterio de mayor peso; si persiste, comparten posición)
    API->>DB: Guarda ranking del evento
    API->>DB: Crea Auditoria (cierre: quien, cuando)

    API-->>UI: 200 OK + ranking (1.º, 2.º, 3.º lugar)
    UI-->>Ad: Muestra ranking del evento
```

---

## 9. Pantalla de resultados: acumulado de temporada (por defecto) con filtro por evento

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Abre pantalla "Resultados"
    UI->>API: GET /organizaciones/{id}/temporadas/{temporada}/ranking (Authorization: Bearer <token>)
    API->>DB: Obtiene puntaje_evento_final de cada club en los eventos de la temporada (ya neto de penalizaciones)
    DB-->>API: Puntajes finales por evento

    loop Por cada Club
        API->>API: puntaje_temporada_final = Σ puntaje_evento_final (todos los eventos, sin doble descuento)
    end

    API->>API: Ordena clubes por puntaje_temporada_final descendente
    API-->>UI: 200 OK + ranking de temporada (vista por defecto)
    UI-->>Ad: Muestra ranking acumulado de todos los eventos

    opt Admin aplica filtro por evento
        Ad->>UI: Selecciona un evento específico
        UI->>API: GET /eventos/{id}/ranking
        API->>DB: Obtiene puntaje_evento_final de ese evento (principal menos penalizaciones)
        DB-->>API: Ranking del evento
        API-->>UI: 200 OK + ranking del evento filtrado
        UI-->>Ad: Muestra ranking de ese evento únicamente
    end

    Ad->>UI: Abre gráficas básicas del club (MVP: línea por evento + barras por criterio)
    UI->>API: GET /clubes/{club_id}/desempeno
    API-->>UI: Serie por evento + desglose por criterio
```

---

## 10. Admin proyecta "Mostrar resultado" (pantalla pública)

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Abre "Resultados" y toca "Mostrar resultado" (solo Admin autenticado, sin link público en MVP)
    UI->>Ad: Pregunta qué proyectar (ranking de evento X, o ranking de temporada)
    Ad->>UI: Selecciona el alcance a proyectar
    UI->>API: GET /eventos/{id}/ranking  o  GET /organizaciones/{id}/temporadas/{temporada}/ranking
    API->>DB: Consulta ranking correspondiente
    DB-->>API: Datos de ranking
    API-->>UI: 200 OK + ranking
    UI-->>Ad: Muestra vista de pantalla completa (sin controles administrativos), lista para proyectar

    loop Mientras la vista esté abierta (polling MVP)
        UI->>API: GET ranking (polling)
        API-->>UI: Ranking actualizado
        UI-->>Ad: Refresca la vista automáticamente
    end
```

---

## 11. Director consulta resultados de su club

```mermaid
sequenceDiagram
    actor D as Director
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    D->>UI: Inicia sesión (ver diagrama 2)
    UI->>API: GET /clubes/{club_id}/eventos
    API->>DB: Verifica que club_id pertenece al Director autenticado
    API->>DB: Consulta eventos donde participó el club
    DB-->>API: Lista de eventos + puntaje_evento del club
    API-->>UI: 200 OK + resultados
    UI-->>D: Muestra sus eventos y puntajes (solo de su club)
```

---

## 12. Exportar resultados a PDF/Excel

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Solicita exportar resultados (evento o temporada)
    UI->>API: GET /eventos/{id}/exportar?formato=pdf|excel  o  GET /organizaciones/{id}/temporadas/{temporada}/exportar?formato=pdf|excel
    API->>DB: Consulta ranking y datos (evento o temporada)
    DB-->>API: Datos completos
    API->>API: Genera archivo (PDF o Excel)
    API-->>UI: Archivo generado (descarga)
    UI-->>Ad: Descarga el archivo
```

---

## 13. Importar miembros por Excel (plantilla exportable)

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Solicita plantilla de miembros
    UI->>API: GET /clubes/{club_id}/miembros/plantilla
    API-->>UI: Archivo Excel plantilla
    UI-->>Ad: Descarga plantilla

    Ad->>UI: Sube Excel diligenciado
    UI->>API: POST /clubes/{club_id}/miembros/importar (archivo)
    API->>API: Valida datos y detecta duplicados
    alt Válido
        API->>DB: Crea Miembros
        API->>DB: Crea Auditoria
        API-->>UI: 200 OK + resumen importados
    else Con errores
        API-->>UI: 422 + reporte de errores/duplicados por fila
        UI-->>Ad: Muestra errores para corregir
    end
```

---

## 14. Reabrir evento y anular penalización (solo Admin + auditoría)

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Solicita "Reabrir" evento cerrado
    UI->>API: POST /eventos/{id}/reabrir
    API->>DB: Verifica rol=admin y organizacion_id
    API->>DB: Marca Evento.cerrado = false
    API->>DB: Crea Auditoria (quien/cuando reabrió)
    API-->>UI: 200 OK

    Ad->>UI: Anula penalización aplicada por error
    UI->>API: DELETE /penalizaciones/{id} (anular)
    API->>DB: Marca Penalizacion anulada (no borrado físico)
    API->>DB: Crea Auditoria (quien/cuando anuló)
    API-->>UI: 200 OK
    Note over API,DB: En evento cerrado sin reapertura: bloquear (403)
```

---

## 15. Reportes, actividad de staff y notificaciones in-app

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as Web
    participant API as Backend
    participant DB as Base de Datos

    Ad->>UI: Abre "Reportes"
    UI->>API: GET /organizaciones/{id}/reportes?tipo=resultados|incidentes|penalizaciones|actividad_staff
    API->>DB: Consulta según filtros (evento, club, estado)
    DB-->>API: Datos
    API-->>UI: 200 OK + reporte
    UI-->>Ad: Muestra reporte + actividad (pendientes/completadas por Staff)

    Ad->>UI: Abre campanita
    UI->>API: GET /notificaciones (in-app)
    API-->>UI: Incidentes graves + nuevos resultados
```
