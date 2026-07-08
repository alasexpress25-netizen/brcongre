# Migración de esquema a un proyecto Supabase nuevo (brcongre)

Este documento sirve para reutilizar la app **congregacion-app / brcongre** con
otra congregación, creando un proyecto Supabase nuevo y vacío, y apuntando el
mismo frontend a ese proyecto.

Cuando quieras hacer esto: abrí una conversación nueva con Claude, pegale
este archivo completo, y decile "hacé esto".

---

## 0. Resumen de la idea

- El **frontend no se toca** (0 archivos `.jsx`). Solo se cambian 2 variables
  de entorno.
- El **backend (Supabase) se migra solo en estructura**, sin datos: tablas,
  columnas, relaciones, funciones, políticas de seguridad (RLS), triggers.
- Cada congregación queda con su propio proyecto Supabase, totalmente aislado
  de las demás (sin cruce de datos posible).

---

## 1. Frontend — qué cambiar

Un solo lugar: el archivo `.env` del proyecto (local) y las Environment
Variables del proyecto en Vercel.

```
VITE_SUPABASE_URL=https://TU-PROYECTO-NUEVO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-nueva-anon-key
```

No hace falta tocar ningún componente ni página: todo el código lee estas dos
variables desde `src/lib/supabaseClient.js`. Después de cambiarlas, hay que
volver a desplegar en Vercel para que las tome.

---

## 2. Backend — qué migrar

Estructura actual del proyecto origen (`brcongre`, project_id
`hkqfaihwhyrfgshzhvue`), a modo de referencia:

- **20 tablas** en el schema `public` (profiles, publicadores, grupos,
  salidas_predicacion, salidas_predicacion_territorios, territorios,
  semanas_vida_ministerio, partes_vida_ministerio, tareas_mecanicas,
  reuniones_publicas, tareas_mecanicas_reunion_publica, turnos_limpieza,
  anuncios, eventos_calendario, permisos, config_congregacion,
  informes_predicacion, solicitudes_precursor_auxiliar, wol_reuniones,
  _rls_test).
- **3 enums**: `rol_usuario`, `seccion_reunion`, `tipo_servicio_publicador`.
- **~15 funciones/RPC**, varias `SECURITY DEFINER` (`puede_editar`,
  `rol_actual`, `es_editor`, `identificar_publicador`,
  `territorios_numeros_publico`, `publicadores_publico`, `informes_estado`,
  `enviar_informe_predicacion`, `enviar_recordatorios_informe`,
  `enviar_recordatorios_reunion_publica`,
  `enviar_recordatorios_vida_ministerio`, `handle_new_user`,
  `proteger_campos_profile`, `proteger_campos_semana`, etc.)
- **1 trigger** en `auth.users` (`handle_new_user`) que auto-crea el registro
  en `profiles` + `publicadores` + `permisos` cuando alguien se registra.
- **Políticas RLS** por tabla (lectura pública en la mayoría, edición
  restringida por permiso granular vía `puede_editar(seccion)`).
- **Grants a nivel de columna** en `publicadores`: el rol `anon` solo puede
  leer `id, nombre, activo, grupo_id, servicio` (no teléfono, dirección, CPF,
  número de documento, notas ni email — eso protege datos personales aunque
  alguien inspeccione la red del navegador).
- **2 Edge Functions**: `wol-importar` (scraping de wol.jw.org) y
  `notificar` (envío de notificaciones/recordatorios). Estas NO viven en el
  schema SQL, se despliegan aparte.
- **Secretos hardcodeados al proyecto actual**: las funciones
  `enviar_recordatorios_*` tienen un `cron_secret` y una `function_url`
  apuntando a `hkqfaihwhyrfgshzhvue.supabase.co` — hay que regenerarlos para
  el proyecto nuevo, no reutilizar los mismos.

---

## 3. Prompt para pegarle a Claude cuando quieras migrar

```
Necesito migrar el esquema (SIN datos) de mi proyecto Supabase "brcongre"
a un proyecto Supabase nuevo y vacío, para reutilizar la misma app
(congregacion-app, repo brcongre) con otra congregación.

Usá el conector MCP de Supabase que ya tengo activo.

1. Con list_tables (verbose=true) y consultas a pg_policies, pg_proc,
   pg_type/pg_enum y information_schema.triggers sobre el proyecto
   ORIGEN (project_id: hkqfaihwhyrfgshzhvue), reconstruí el DDL completo:
   tablas, columnas, defaults, constraints, FKs, enums, funciones/RPC
   (incluyendo SECURITY DEFINER y search_path), triggers y políticas RLS,
   más los grants a nivel de columna en la tabla publicadores (algunas
   columnas están restringidas para el rol anon, ver migraciones
   "publicadores_lectura_publica_limitada" y
   "publicadores_columnas_anon_fix").

2. Confirmame el project_id del proyecto DESTINO (nuevo, vacío) antes de
   aplicar nada.

3. Aplicá el DDL en el proyecto DESTINO con apply_migration, en el orden
   correcto (enums y extensiones primero, tablas, luego funciones,
   luego triggers, luego policies y grants).

4. Regenerá el cron_secret y actualizá function_url en las funciones
   enviar_recordatorios_* para que apunten al proyecto nuevo (no
   reutilices el secreto del proyecto origen).

5. Recordame que las Edge Functions (wol-importar, notificar) hay que
   desplegarlas aparte con `supabase functions deploy`, no viven en el
   schema SQL.

6. Al final dame la VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY del
   proyecto nuevo para actualizar el .env del frontend (brcongre-fixed),
   y confirmame que no hace falta tocar ningún archivo .jsx.

No copies datos, solo estructura. Preguntame antes de cualquier
operación destructiva.
```

---

## 4. Alternativa vía Supabase CLI (dump 100% fiel)

Si en algún momento preferís hacerlo vos mismo por línea de comandos en vez de
pedírselo a Claude (por ejemplo si Claude ya no tiene el conector MCP activo
en esa sesión), esta es la forma más segura de no perder ningún detalle del
schema:

```bash
# 1. Autenticarte y linkear el proyecto ORIGEN
supabase login
supabase link --project-ref hkqfaihwhyrfgshzhvue

# 2. Dump SOLO del esquema (sin datos)
supabase db dump --schema public --schema-only -f schema.sql

# 3. Crear el proyecto nuevo en supabase.com (vacío)

# 4. Linkear al proyecto DESTINO y aplicar
supabase link --project-ref TU-PROYECTO-NUEVO
psql "postgresql://postgres:[password]@db.TU-PROYECTO-NUEVO.supabase.co:5432/postgres" -f schema.sql
```

Después de esto, igual quedan pendientes los mismos puntos manuales: Edge
Functions, `cron_secret`/`function_url`, y actualizar el `.env` del
frontend.

---

## 5. Checklist final antes de dar por terminada la migración

- [ ] Esquema aplicado en el proyecto nuevo (tablas, enums, funciones,
      triggers, RLS, grants de columna en `publicadores`)
- [ ] Edge Functions `wol-importar` y `notificar` redesplegadas
- [ ] `cron_secret` y `function_url` regenerados en las funciones de
      recordatorios
- [ ] `.env` actualizado (local + Vercel) con la URL y anon key del proyecto
      nuevo
- [ ] Redeploy en Vercel
- [ ] Probar el flujo completo: identificación por email, ver Vida y
      Ministerio / Reunión Pública / Predicación / Territorios / Limpieza /
      Anuncios / Calendario, y que un email que NO está en `publicadores`
      quede bloqueado correctamente
