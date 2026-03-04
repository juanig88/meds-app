# Especificación técnica — PWA Meds Tracker (tratamientos médicos mascotas)

**Versión:** 1.1  
**Enfoque:** Spec-Driven Development — documento orientado a implementación.  
**Decisiones PO:** Incorporadas (segimiento mensual, login obligatorio, recordatorios, tema, edición/baja, límites, exportación, i18n).

---

## Parte A — Análisis crítico de la especificación actual

### A.1 Puntos ambiguos o mal definidos

| Área | Problema | Impacto |
|------|----------|---------|
| **Seguimiento mensual** | No se define si es solo “vista mensual”, “resumen descargable”, “reporte para veterinario” o “métricas de cumplimiento”. | Afecta UX y posiblemente modelo de datos (reportes, agregados). |
| **Frecuencia diaria** | “Frecuencia diaria” puede ser “veces por día” (1, 2, 3…) o “cada X horas”. La implementación actual usa solo “veces por día”; no hay horarios. | Si se requieren recordatorios o ventanas horarias, el modelo actual es insuficiente. |
| **Cumplimiento** | Solo se menciona “dado u omitido”. No está definido: ¿se puede desmarcar?, ¿hay estado “pendiente” explícito?, ¿qué pasa si no se registra nada? | Afecta reglas de negocio y criterios de aceptación. |
| **Múltiples meses** | “Soporte para múltiples meses” no aclara si hay límite de historial, si se pueden editar meses pasados o solo consultar. | Afecta permisos, validaciones y volumen de datos. |
| **Modo claro/oscuro** | No se especifica si es solo `prefers-color-scheme` o preferencia persistente del usuario (ej. toggle en app). | Afecta persistencia y consistencia de tema. |
| **Experiencia tipo app nativa (PWA)** | No se detalla: instalabilidad, offline, notificaciones, iconos, splash, actualización de contenido. | Riesgo de que la PWA quede a medias. |

### A.2 Elementos faltantes

- **Inputs y outputs**
  - No hay definición explícita de formatos de entrada (ej. fechas en UTC vs local, longitud de nombres).
  - No se especifica si existe exportación de datos (CSV, PDF) ni su formato.

- **Casos límite**
  - Medicamento con `start_date` futura.
  - Cambio de `times_per_day` con dosis ya registradas.
  - Eliminación de paciente/medicamento con historial de dosis (actualmente cascade delete).
  - Usuario sin conexión tras login (¿solo lectura?, ¿cola de escrituras?).
  - Primer uso sin Google: datos en localStorage y posterior login (migración o descarte).

- **Estados del sistema**
  - No se describen estados de carga/error por pantalla.
  - No se define comportamiento cuando falla Supabase (reintentos, mensaje, fallback a localStorage).

- **Restricciones técnicas**
  - Límites de pacientes, medicamentos por paciente, dosis por consulta no definidos.
  - Tamaño máximo de nombres/descripciones no especificado.

- **Manejo de errores**
  - Errores de red, sesión expirada, RLS denegado, validación de formularios: sin flujos definidos.
  - No hay política de reintentos ni mensajes estándar.

- **Supuestos implícitos**
  - Un solo cuidador por cuenta (no compartición de mascotas entre usuarios).
  - El “día” es según zona horaria del dispositivo.
  - No hay roles (admin vs viewer).
  - Sin recordatorios push en la spec inicial.

- **Escalabilidad y diseño**
  - Carga de “todas las dosis” por paciente puede no escalar a años de historial; no hay paginación ni filtro por rango de fechas en la API actual.

---

## Parte B — Especificación mejorada

### 1. Contexto y objetivo

**Contexto:** Aplicación PWA para cuidadores de mascotas (principalmente gatos) que deben administrar medicación con una o varias tomas diarias y llevar un registro de cumplimiento.

**Objetivo:** Permitir registrar múltiples mascotas, definir medicamentos con frecuencia diaria, marcar cada toma como dada u omitida por día, y consultar el historial por mes, con persistencia en la nube (Supabase) y experiencia usable en móvil, incluyendo soporte offline básico y modo claro/oscuro.

**Supuestos explícitos (a validar con PO):**
- Un usuario = un cuidador; no se comparten mascotas entre cuentas en v1.
- El día se interpreta en la zona horaria local del dispositivo.
- No hay requisito legal de auditoría ni inmutabilidad de registros en v1.

#### Pantallas principales

1. **Pantalla de inicio de sesión**  
   Botón «Continuar con Google»; sin sesión no se accede al resto de la app.

2. **Pantalla de pacientes**  
   Listado de todos los pacientes/mascotas. Al hacer clic en uno se navega a la pantalla de detalle (calendario) de ese paciente.

3. **Pantalla de detalle (calendario del paciente)**  
   - Mes en curso (o mes seleccionado) con las pastillas dadas por día.
   - Detalle de cada medicamento y cantidad de veces por día (filas por toma: ej. «Enoxaparina 1», «Enoxaparina 2»).
   - Sección **Próximas pastillas a dar**: tomas de hoy aún sin marcar, con acciones rápidas «Dada» / «Omitida».
   - **Contadores arriba**: una cuenta por cada pastilla con la cantidad de dosis dadas (y omitidas) a lo largo del mes.
   - En el grid, marcar cada celda como dada u omitida.

---

### 2. Alcance

#### In scope (v1)

- **Login obligatorio con Google** (Supabase Auth). Sin sesión no se puede usar la app.
- **Pacientes:** crear, editar nombre/descripción, eliminar (con historial en cascada). Límite: 10 pacientes por usuario.
- **Medicamentos:** crear, finalizar tratamiento (end_date), eliminar (con historial). No se editan nombre/frecuencia/fechas; para cambiar, eliminar y crear otro o finalizar y crear uno nuevo. Límite: 50 medicamentos por usuario (suma de todos los pacientes).
- **Registro de cumplimiento:** por cada (medicamento, slot del día, fecha) estado “dado” o “omitido”.
- **Vista mensual:** solo calendario por mes (no informes ni PDF obligatorios). Navegación por meses con historial del **último año calendario**.
- Resumen de contadores por medicamento (dadas / omitidas / total) para el mes visible.
- **Exportación CSV** (opcional).
- **Exportación PDF** (opcional, no requerida).
- **Recordatorios:** notificaciones recordando N veces al día (sin horarios fijos en v1).
- **Modo claro/oscuro:** según sistema (prefers-color-scheme) o elección manual del usuario con persistencia (toggle en app).
- **Idiomas:** español e inglés (i18n en v1).
- Persistencia solo en Supabase (no hay modo anónimo ni localStorage).
- RLS: cada usuario solo accede a sus pacientes y datos derivados.
- UI mobile-first, responsive, navegación por pestañas (Inicio, Pacientes, Calendario).
- PWA: instalable, iconos y manifest; comportamiento offline según consideraciones técnicas.

#### Out of scope (v1)

- Horarios específicos por toma (v1 basta “N veces al día”).
- Compartición de mascotas entre usuarios (no por ahora).
- Migración de datos anónimos (no aplica: no hay uso sin login).

---

### 3. Modelo de datos

#### 3.1 Entidades, campos, tipos y relaciones

**Paciente (patients)**  
- Representa una mascota/paciente del usuario.

| Campo       | Tipo        | Obligatorio | Descripción |
|------------|-------------|-------------|-------------|
| id         | uuid        | Sí (PK)     | Identificador único. |
| user_id    | uuid        | Sí (FK → auth.users) | Propietario del registro. |
| name       | text        | Sí          | Nombre de la mascota. |
| description| text        | No          | Notas (raza, condiciones, etc.). |
| created_at | timestamptz | Sí          | Alta del registro. |

**Medicamento (medications)**  
- Medicación asignada a un paciente.

| Campo         | Tipo        | Obligatorio | Descripción |
|---------------|-------------|-------------|-------------|
| id            | uuid        | Sí (PK)     | Identificador único. |
| patient_id    | uuid        | Sí (FK → patients) | Paciente al que pertenece. |
| name          | text        | Sí          | Nombre del medicamento. |
| times_per_day | int         | Sí          | Número de tomas por día (≥ 1). |
| start_date    | date        | Sí          | Primer día de tratamiento. |
| end_date      | date        | No          | Último día (null = activo). |
| color_hint    | text        | No          | Uno de: green, red, yellow, blue, neutral. |
| created_at    | timestamptz | Sí          | Alta del registro. |

**Dosis (doses)**  
- Una marca de cumplimiento por (paciente, medicamento, slot del día, fecha).

| Campo         | Tipo        | Obligatorio | Descripción |
|---------------|-------------|-------------|-------------|
| id            | uuid        | Sí (PK)     | Identificador único. |
| patient_id    | uuid        | Sí (FK → patients) | Paciente. |
| medication_id | uuid        | Sí (FK → medications) | Medicamento. |
| slot_index    | int         | Sí          | Índice de toma del día (0 = primera, 1 = segunda, …). |
| date          | date        | Sí          | Fecha del día (YYYY-MM-DD). |
| status        | text        | Sí          | 'given' \| 'omitted'. |
| created_at    | timestamptz | Sí          | Registro de la marca. |

**Restricciones de BD:**
- `(patient_id, medication_id, slot_index, date)` único en `doses`.
- `times_per_day >= 1`, `slot_index >= 0`, `status IN ('given','omitted')`, `color_hint` según enum.

**Relaciones:**
- `patients.user_id` → `auth.users(id)` (ON DELETE CASCADE).
- `medications.patient_id` → `patients(id)` (ON DELETE CASCADE).
- `doses.patient_id` → `patients(id)`, `doses.medication_id` → `medications(id)` (ON DELETE CASCADE).

#### 3.2 Ejemplos de registros

**Paciente**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "auth-uuid-del-usuario",
  "name": "Minina",
  "description": "Gata europea, FIV+",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Medicamento**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440002",
  "patient_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Enoxaparina",
  "times_per_day": 2,
  "start_date": "2025-01-20",
  "end_date": null,
  "color_hint": "red",
  "created_at": "2025-01-20T08:00:00Z"
}
```

**Dosis**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440003",
  "patient_id": "550e8400-e29b-41d4-a716-446655440001",
  "medication_id": "660e8400-e29b-41d4-a716-446655440002",
  "slot_index": 0,
  "date": "2025-02-15",
  "status": "given",
  "created_at": "2025-02-15T09:30:00Z"
}
```

---

### 4. Flujos principales

#### 4.1 Arranque y autenticación

1. Usuario abre la app.
2. Si no hay sesión: se muestra pantalla de login con “Continuar con Google”. **No puede usar la app sin iniciar sesión.**
3. Tras OAuth y callback: se obtiene sesión Supabase; se cargan pacientes del usuario, luego medicaciones y dosis (por patient_id, rango último año si se aplica).
4. Si hay sesión: carga directa de datos y redirección a Pacientes (o última vista si se persiste).
5. Estados: `loading` (inicial), `unauthenticated`, `authenticated`; error de configuración (env faltante) muestra mensaje específico.

#### 4.2 Pacientes: alta, edición y baja

1. **Alta:** Pacientes → “Agregar paciente”. Nombre (obligatorio), descripción opcional. Validar límite 10 pacientes. Insert en Supabase.
2. **Edición:** El usuario puede editar nombre y descripción del paciente (no hay edición de medicamento; ver 4.3).
3. **Baja:** Eliminar paciente (confirmación recomendada); elimina en cascada medicamentos y dosis.

#### 4.3 Medicamentos: alta, finalizar y baja (sin edición)

1. **Alta:** Calendario con paciente seleccionado → “Agregar medicamento”. Nombre, veces por día (1–N), fecha inicio, color (opcional). Validar límite 50 medicamentos total. Insert en Supabase. No se editan después; para cambiar, finalizar o eliminar y crear otro.
2. **Finalizar tratamiento:** Establecer `end_date` (ej. hoy); el medicamento deja de mostrarse en días posteriores.
3. **Baja:** Eliminar medicamento (con historial de dosis en cascada).

#### 4.4 Registro de cumplimiento (dosis)

1. Usuario en Calendario, mes y paciente seleccionados.
2. Para cada celda (medicamento+slot, día): si el día está dentro de [start_date, end_date] del medicamento, la celda es interactiva.
3. Click en celda: ciclo de estado (pendiente → given → omitted → pendiente) o solo given/omitted según diseño; “pendiente” = sin fila en `doses` para esa (patient, medication, slot, date).
4. Se llama upsert: si existe fila se actualiza `status`; si no, insert.
5. Contadores del mes se recalculan a partir de las dosis cargadas en cliente.

#### 4.5 Navegación por meses

1. Controles “mes anterior” / “mes siguiente” (y opcionalmente selector mes/año).
2. **Historial limitado al último año calendario:** solo se muestran/editan meses dentro de ese rango; cargar dosis por rango de fechas si aplica.

#### 4.6 Cierre de tratamiento (end_date)

1. Desde la UI del medicamento (“Finalizar tratamiento”): se setea `end_date` a la fecha elegida (ej. hoy).
2. En el calendario, los días posteriores a `end_date` no muestran ese medicamento/slots o se muestran deshabilitados.

---

### 5. Reglas de negocio

- **RN1** Un paciente pertenece a un único usuario (`user_id`).
- **RN2** Un medicamento pertenece a un único paciente y tiene al menos una toma por día (`times_per_day >= 1`).
- **RN3** Las celdas del calendario solo son editables para fechas dentro de [start_date, end_date] del medicamento (end_date null = sin tope).
- **RN4** Por (patient_id, medication_id, slot_index, date) existe como máximo un registro en `doses`; el estado es `given` u `omitted`.
- **RN5** Si no hay registro en `doses` para una celda válida, se considera “pendiente” (no contabilizado en given/omitted).
- **RN6** Eliminar un paciente elimina en cascada sus medicamentos y dosis; eliminar un medicamento elimina sus dosis. Está permitido eliminar con historial.
- **RN7** El usuario puede **editar** nombre y descripción de paciente. No puede editar nombre, frecuencia ni fechas de medicamento; para cambiar, debe finalizar tratamiento o eliminar el medicamento y crear uno nuevo.
- **RN8** Límites: máx. **10 pacientes** por usuario, máx. **50 medicamentos** en total (todos los pacientes). Historial visible/editable: **último año calendario**.
- **RN9** El “día” de una dosis se determina siempre por la **zona horaria del dispositivo**.

---

### 6. Errores y excepciones

| Situación | Comportamiento esperado |
|-----------|-------------------------|
| Supabase no configurado (env faltante) | Mostrar pantalla “Configuración requerida” con instrucciones (sin bloqueo de build). |
| Error de red al cargar datos | Mostrar mensaje genérico “Error al cargar”; opción reintentar. |
| Error al guardar (insert/update) | Mostrar mensaje “No se pudo guardar”; dejar datos en formulario para reintento. |
| Sesión expirada o inválida | Redirigir a login; no borrar datos locales hasta que el usuario cierre sesión explícitamente o se defina política. |
| RLS deniega operación | Tratar como error de guardado; mensaje “No tenés permiso para esta acción”. |
| Validación de formulario (nombre vacío, fecha inválida, etc.) | Mensaje inline en el campo o debajo del formulario; no enviar a backend. |
| Callback OAuth con `error` en query | Mostrar mensaje “Error al iniciar sesión” y opción de reintentar. |

---

### 7. Criterios de aceptación (Given-When-Then)

**Autenticación**
- **G:** Usuario no autenticado, **W:** abre la app, **T:** ve pantalla de login con opción “Continuar con Google” y no puede acceder al resto de la app.
- **G:** Usuario completa login con Google, **W:** Supabase devuelve sesión, **T:** se cargan sus pacientes y medicaciones y ve la pantalla de Pacientes (o la definida por defecto).
- **G:** Variables de Supabase no configuradas, **W:** se inicia la app, **T:** se muestra mensaje de configuración requerida y no se muestra login.

**Pacientes**
- **G:** Usuario autenticado en Pacientes, **W:** agrega paciente con nombre y descripción (y no supera 10 pacientes), **T:** el paciente aparece en la lista y persiste en Supabase.
- **G:** Usuario autenticado, **W:** edita nombre o descripción de un paciente, **T:** los cambios persisten en Supabase.
- **G:** Usuario con 10 pacientes, **W:** intenta agregar otro, **T:** la UI impide o muestra mensaje de límite alcanzado.

**Medicamentos**
- **G:** Usuario en Calendario con paciente seleccionado, **W:** agrega medicamento (nombre, 2 veces/día, fecha inicio) y no supera 50 medicamentos total, **T:** en el grid aparecen dos filas (ej. “Med 1”, “Med 2”) para ese medicamento. No puede editar nombre/frecuencia/fechas después.
- **G:** Usuario finaliza tratamiento de un medicamento, **W:** setea end_date (ej. hoy), **T:** los días posteriores no permiten marcar dosis para ese medicamento (o no se muestran).
- **G:** Usuario con 50 medicamentos en total, **W:** intenta agregar otro, **T:** la UI impide o muestra mensaje de límite alcanzado.

**Cumplimiento**
- **G:** Usuario en Calendario, día dentro de rango del medicamento, **W:** toca celda sin marca, **T:** se registra estado (given u omitted según ciclo) y la celda refleja el estado.
- **G:** Ya existe dosis “given” para (medicamento, slot, fecha), **W:** usuario cambia a “omitted”, **T:** el registro se actualiza y los contadores del mes se actualizan.

**Vista mensual**
- **G:** Usuario con al menos un paciente y un medicamento, **W:** selecciona paciente y va a Calendario, **T:** ve el mes actual con grid de medicamentos/slots y días del mes; puede cambiar a mes anterior/siguiente dentro del último año calendario.

**RLS**
- **G:** Usuario A autenticado, **W:** solicita lista de pacientes, **T:** solo ve pacientes con user_id = usuario A.

---

### 8. Consideraciones técnicas

- **PWA**
  - Incluir `manifest.json` (o equivalente en Next) con nombre, short_name, iconos (mín. 192x192, 512x512), `display: standalone` o `minimal-ui`, `start_url`.
  - Service worker: Next.js puede registrar uno; definir si en offline se sirve shell y se muestran datos en caché/localStorage o mensaje “Sin conexión”.
  - No se exige en v1: cola de escrituras offline para Supabase.

- **Autenticación Google**
  - Supabase Auth con provider Google; redirect a `/auth/callback`; en callback intercambiar código por sesión y redirigir a `/`.
  - Site URL y Redirect URLs configurados en Supabase y en Google Cloud (OAuth client web).

- **Supabase**
  - Tablas `patients`, `medications`, `doses` con RLS por `auth.uid() = user_id` (patients) y políticas para medications/doses vía pertenencia a paciente del usuario.
  - Cliente browser con `createClient` desde `@supabase/supabase-js`; SSR si aplica con cookies según `@supabase/ssr`.

- **Mobile first**
  - Diseño desde viewport móvil; breakpoints para tablet/desktop; touch targets ≥ 44px; navegación por pestañas fija abajo en móvil.

- **Modo claro/oscuro**
  - Según sistema (**prefers-color-scheme**) **o** elección manual del usuario. Toggle en app que persiste en `localStorage` (o cookie); aplicar clase en `<html>` (ej. `dark`) y meta `theme-color` / `color-scheme` coherentes.

- **Historial y dosis**
  - Historial: **último año calendario**. Cargar dosis por rango de fechas (ej. año actual o 12 meses atrás) para no sobresaturar; mismo contrato de UI (grid por mes).

- **Recordatorios (v1)**
  - Notificaciones recordando **N veces al día** (sin horarios fijos). Implementación: solicitar permiso de notificaciones; programar N recordatorios diarios (ej. repartidos o configurables por el usuario de forma simple). No requiere franjas “mañana/tarde” en el modelo de datos.

---

## Parte C — Decisiones del product owner (registradas)

| Tema | Decisión |
|------|----------|
| **Seguimiento mensual** | Solo vista de calendario por mes. No informes ni PDF obligatorios. Sí posibilidad de **exportar CSV**. |
| **Migración datos anónimos** | No aplica: **sin login no se puede usar la app** (login obligatorio). |
| **Recordatorios** | **Sí en v1.** Enviar notificaciones recordando N veces al día. |
| **Modo claro/oscuro** | Según sistema **o** que el usuario pueda cambiarlo manualmente (toggle + persistir). |
| **Edición y baja** | Editar nombre/descripción de **paciente**. Eliminar paciente o medicamento (con historial). **No** editar nombre/frecuencia/fechas de medicamento; a lo sumo eliminar y crear otro, o finalizar tratamiento y crear uno nuevo. |
| **Horarios** | En v1 basta "N veces al día" (sin franjas mañana/tarde). |
| **Límites** | **10 pacientes** por usuario, **50 medicamentos** en total, historial del **último año calendario**. |
| **Zona horaria** | Siempre zona horaria del dispositivo para el día de una dosis. |
| **Exportación** | No requerido; posibilidad de **exportar CSV** y de **exportar PDF** (opcional). |
| **Idiomas** | **Español e inglés** (i18n en v1). |
| **Compartir mascotas** | No por ahora. |

---

*Documento vivo: las decisiones anteriores están incorporadas en alcance, reglas de negocio y consideraciones técnicas.*
