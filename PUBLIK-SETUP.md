# Pasos que faltan para publicar en publik (los hace David)

> **Hecho el 2026-11-16.**
> - Listado: https://publikhq.com/dilo. App: https://dilo-mocha.vercel.app (Vercel + Turso). Repo público.
> - Variables de producción en Vercel: `AI_PROVIDER=publik`, `PUBLIK_APP_TOKEN`, `APP_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
> - La propiedad del repo se verificó con `publik-verify.txt`, porque la cuenta de publik de David no está ligada al GitHub `dzaot`.
> - Lo de abajo queda como referencia para rehacerlo o para otra app.


> Resumen: el código ya trae Sign in with publik, el conteo de uso y publik API detrás de una interfaz. Falta lo que necesita a David: elegir dónde alojar la app, desplegarla, hacer público el repo, correr el prompt de setup de publik y aprobar en el navegador, y poner el token en el servidor. Unos 45 a 60 minutos.

Fuentes leídas en crudo con curl el 2026-11-15: `publikhq.com/skills/setup.md`, `/skills/api.md`, `/skills/publish.md`, `/sdk/publik.ts.md`, `/developers`.

## Antes de empezar (5 min)

1. Decide el nombre (propuestas en `STATUS.md`). Si no es "Dilo", avísale al agente del paso 4 para cambiar textos.
2. Revisa la licencia: el repo trae MIT (`LICENSE`). publik solo lista código abierto.
3. Revisa que no haya nada privado en el repo. No hay claves: todo va por variables de entorno (`.env.example` solo tiene nombres).

## 1. Elegir hosting y desplegar (20 min)

La app es un servidor Node (Next.js) con SQLite en un archivo. Necesita:

- Node 22.13 o más nuevo (usa `node:sqlite`, ya está en `package.json` > `engines`).
- **Un disco persistente** para `DATABASE_PATH`. Sin disco, se borran rachas e historial en cada despliegue.
- Comandos: `npm ci && npm run build` para construir, `npm start` para arrancar (respeta la variable `PORT`).

Opciones (precios sin verificar hoy, revísalos antes de elegir): Railway con un volumen, Fly.io con un volumen, Render con disco persistente, o un VPS pequeño. Pregunta abierta para Akrit: si publik aloja apps `hosted_web` (está en `01-publik-research.md`, pregunta 4).

Primer despliegue en **modo demo** para tener la URL antes del token:

| Variable | Valor |
|---|---|
| `AI_PROVIDER` | `mock` |
| `DATABASE_PATH` | ruta dentro del volumen, por ejemplo `/data/coach.db` |
| `NODE_ENV` | `production` |

Anota la URL https pública. Esa es la `openWebUrl` del listado.

## 2. Hacer público el repo (1 min)

publik rechaza repos privados (`closed_source_not_allowed`).

```bash
gh repo edit dzaot/english-coach --visibility public --accept-visibility-change-consequences
```

## 3. Correr el setup de publik (15 min, interactivo)

En una sesión **interactiva** de Claude Code abierta en la carpeta del repo (`apps/english-coach`), pega:

```
Set up my app on publik. Fetch publikhq.com/skills/setup.md with curl and follow it step by step.
```

Y agrega este contexto en el mismo mensaje, para que no adivine:

```
Context: this is a hosted web app (outputType "hosted_web", openWebUrl = <tu URL https>).
The publik module already exists at src/server/publik/publik.ts (adapted for a multi-user server: one install per browser session, keys sealed in the database). Update APP_SLUG there; do not add a second module.
The gate already runs before the first page (src/components/coach-app.tsx). Usage counting is already wired (app_opened, active_session via /api/telemetry).
The token goes to a server only the builder deploys: PUBLIK_APP_TOKEN in the host's environment, not publik-app-token.txt.
publik API products: ai.chat, ai.transcribe, ai.speech. publikApi.enabled: true.
```

El agente te muestra **una lista de verificación** y espera tu sí. Valores sugeridos para el listado (revísalos):

| Campo | Sugerencia |
|---|---|
| `name` (18 máx.) | Dilo |
| `summary` (80 máx., sin URL) | Practice your job interview in English, out loud, free. Feedback in Spanish. (76) |
| `alternativeTo` | Speak |
| `category` | la que proponga publik para educación o idiomas (sin verificar la lista) |
| `license` | MIT |
| `outputType` / `openWebUrl` | `hosted_web` / tu URL https |
| `publikApi.products` | `ai.chat`, `ai.transcribe`, `ai.speech` |

## 4. Aprobar en el navegador (2 min)

El agente imprime una URL y un código (device flow). Ábrela, revisa que el código coincida y pulsa **Approve** (inicia sesión con GitHub si lo pide). La aprobación dura una hora.

- Si responde `403 claim_first`: abre la página del listado y pulsa **Your app? Claim it with GitHub**, y dile al agente que siga.
- Si responde `held_for_review`: el escaneo quiere una revisión humana; el listado sale cuando la aprueben. Sigue con los pasos.

## 5. Poner el token en el servidor (5 min)

Para un servidor, el agente guarda `PUBLIK_APP_TOKEN=` en un archivo `.env` local (ignorado por git). **No lo pegues en el chat.** Ábrelo tú y copia el valor a las variables del hosting. Después cambia el despliegue a modo real:

| Variable | Valor |
|---|---|
| `AI_PROVIDER` | `publik` |
| `PUBLIK_APP_TOKEN` | el `pat_...` del paso 4 |
| `APP_SECRET` | 32+ caracteres al azar: `openssl rand -base64 48`. Guárdalo: si cambia, todos tendrán que volver a iniciar sesión |
| `DATABASE_PATH` | igual que antes |
| `NODE_ENV` | `production` |
| `REPLY_TIER` (opcional) | `balanced` (por defecto) o `fast` si el saldo gratis se agota muy rápido (ver `STATUS.md`) |

Vuelve a desplegar.

## 6. Comprobar (5 min)

1. Comando de verificación de publik (`skills/api.md`, paso 5), en una terminal donde esté cargada la variable `PUBLIK_APP_TOKEN`. `installs: 201` o `200` significa que el token sirve; `401`, que no.

```bash
B=https://publikhq.com/api/v1; U=$(uuidgen 2>/dev/null || od -An -N16 -tx1 /dev/urandom | tr -d ' \n'); printf '{"app_token":"%s","app_slug":"<slug>","app_version":"0.0.0-check","os":"linux","install_id":"%s"}' "$PUBLIK_APP_TOKEN" "$U" | curl -s -o /dev/null -w 'installs: %{http_code}\n' -X POST $B/installs -H 'content-type: application/json' --data-binary @-
```

2. Abre la URL en una ventana privada: lo primero debe ser **Sign in with publik** (setup.md, paso 6, para web alojada).
3. Haz una práctica corta para confirmar voz, respuesta y feedback. Tu propio uso no cuenta para el leaderboard y no hay que inflarlo.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| La app muestra "Algo salió mal" al abrir | Falta `PUBLIK_APP_TOKEN` o `APP_SECRET` con el gate encendido (el servidor lo dice en su log) |
| "publik is not reachable" | publik no responde o el token es inválido (mira el mensaje debajo) |
| "Se acabó tu saldo de IA en publik" | Error 402: la cuenta del usuario no tiene saldo. Se muestra el enlace de recarga de publik |
| Se pierden rachas tras desplegar | `DATABASE_PATH` no está en un disco persistente |
