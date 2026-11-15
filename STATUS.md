# Estado: Dilo (english-coach)

> Resumen: MVP completo y probado en local con IA simulada: elegir escenario e industria, hablar por turnos (micrófono o texto), feedback con puntaje, 3 frases mejores y vocabulario, racha diaria, historial y frases para repasar. Sign in with publik, conteo de uso y publik API están programados según los docs de publik y probados contra un servidor publik falso local, pero **no contra publik real**: eso necesita el token y la aprobación de David. Repo privado en GitHub; no está público, desplegado ni listado.

Actualizado: 2026-11-15

## Qué funciona (verificado)

| Parte | Cómo se verificó |
|---|---|
| Flujo completo en modo demo (inicio, práctica, feedback, frases, historial) | Recorrido a mano en el navegador a 375px, modo claro y oscuro |
| Racha diaria con los últimos 7 días, en la zona horaria del usuario | Tests de dominio y de rutas |
| Push to talk con MediaRecorder, corte a los 90 s, respuesta escrita como alternativa | Tests con MediaRecorder simulado. **No probado en un teléfono real** |
| Voz de la contraparte: audio del servidor o, si falla, la voz inglesa del navegador | Tests; en el navegador se oyó la voz del sistema |
| Sign in with publik por sesión de navegador: instalar, "Sign in with publik", elegir plan, "Connect your plan", "Use my own key", uso en % | Tests y recorrido completo contra un servidor publik falso en localhost |
| Telemetría `app_opened` y `active_session` con la clave de la instalación | Tests y el servidor falso la recibió con clave |
| Claves solo en el servidor, cifradas (AES-256-GCM) | Tests: la clave no aparece en la base ni en las respuestas |
| Errores en español con un solo enlace de recarga en el 402 | Tests |
| `npm run build`, `npm run lint`, `npm run typecheck` | Pasan |
| Tests | 183 tests. Cobertura: 97% de líneas, 90% de ramas, 96% de funciones |

## Qué está simulado o sin probar

- **IA en desarrollo:** `AI_PROVIDER=mock` responde con preguntas fijas y un feedback fijo construido con tus frases. Sirve para demo y tests, no para un reel.
- **publik real:** nada se ha llamado contra publikhq.com con un token. Faltan los pasos de `PUBLIK-SETUP.md`.
- **Modelo de voz:** los docs de publik no dicen qué nombre de modelo acepta `/audio/speech`. Usé `tts-1` y la voz `alloy` (configurables con `PUBLIK_TTS_MODEL` y `PUBLIK_TTS_VOICE`). Si fallan, la app usa la voz del navegador y sigue funcionando.
- **Teléfonos reales:** falta probar micrófono y reproducción automática en iPhone (Safari) y Android (Chrome). iOS puede bloquear el audio que llega después de esperar la respuesta; para eso está el botón "Escuchar" en cada burbuja.

## Nombres propuestos

| Nombre | Por qué | Contra |
|---|---|---|
| **Dilo** (favorito, nombre de trabajo) | "Dilo" es la acción misma: decirlo en voz alta. Corto, en español, sirve como verbo en los reels ("Dilo en inglés") | Disponibilidad de dominio y marca sin verificar |
| Ensayo | Suena profesional: ensayas antes de la entrevista real | Menos memorable, puede sonar a escrito académico |
| Turno | Calza con la mecánica por turnos y con "tu turno" | Genérico, difícil de buscar |

## Preguntas abiertas

Para Akrit o Mann (publik):

1. **Web alojada con muchos usuarios:** el módulo de publik guarda una instalación por computador. Aquí cada sesión de navegador hace su propio `POST /installs` con el token del servidor, y su clave queda cifrada en la base. ¿Es el patrón que esperan para `hosted_web`? ¿Qué valor de `os` debe ir (hoy `linux`, configurable con `PUBLIK_INSTALL_OS`)?
2. **El escaneo:** busca `/api/v1/installs`, `/api/v1/telemetry`, `app_opened` y `APP_SLUG = "<slug>"` en "el archivo del módulo". Todo está en `src/server/publik/publik.ts`. ¿Lo encontrará ahí?
3. **Saldo gratis de $0,05:** una práctica hace unas 6 a 12 llamadas de chat, más transcripción, voz y feedback. Estimo (I) que el saldo gratis se acaba dentro de la primera práctica y el usuario ve el aviso de recarga. ¿Pueden dar más saldo inicial a los usuarios de fellows? Mientras tanto, `REPLY_TIER=fast` abarata las respuestas.
4. **Compute:** ¿cuenta para el leaderboard el gasto en audio (transcripción y voz), que publik cobra sin margen?
5. **Hosting:** ¿publik aloja apps `hosted_web` o cada fellow pone su servidor?

Para David:

6. ¿Nombre final? (tabla de arriba).
7. ¿Licencia MIT está bien?
8. ¿Dónde desplegar? Necesita disco persistente (ver `PUBLIK-SETUP.md`).

## Bloqueado por David (no se puede hacer sin él)

- Hacer público el repo, desplegar, correr el setup de publik y aprobar en el navegador, poner `PUBLIK_APP_TOKEN` en el hosting. Todo en `PUBLIK-SETUP.md`.

## Siguientes pasos sugeridos

1. Los pasos de `PUBLIK-SETUP.md` y una práctica real de punta a punta.
2. Probar en iPhone y Android reales (micrófono, audio automático, teclado).
3. Grabar el primer reel con `DEMO.md`.
4. Medir costo real por práctica con `x-publik-charge-micros` y decidir `REPLY_TIER`.
5. Recordatorio diario opcional (correo o notificación web) para cuidar la racha, que es lo que convierte a alguien en usuario semanal (uso en 2 días distintos).
6. Repaso activo de frases: decir la frase mejorada en voz alta y comprobarla con la transcripción.
7. Nivel (básico, intermedio, avanzado) y opción de voz más lenta.
8. Tarjeta para compartir el puntaje (imagen) para que los usuarios la suban a historias.
9. Voz en tiempo real como v2, con un relé en el servidor para no exponer la clave (detalle en `README.md`).
10. Vincular el historial a la cuenta de publik (no solo a la cookie) para usarlo en varios dispositivos.
