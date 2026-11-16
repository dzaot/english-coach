# Estado: Dilo (english-coach)

> Resumen: MVP completo y probado **con la IA real de publik** en local (clave de desarrollador, gate apagado): voz a texto, respuesta de la contraparte, voz, feedback, "Help me" y "Say it". Una práctica de 10 minutos cuesta unos **$0,05 a $0,06** (medido por llamada). La interfaz está en inglés; cada persona elige su nivel (Beginner con apoyo en español, Intermediate, Advanced) y su compañero de práctica entre 4 avatares con foto y voz propia (Sarah, James, Emily, Mike). Sign in with publik sigue probado solo contra un publik falso: falta el token de la app y la aprobación de David. Repo privado; no está público, desplegado ni listado.

Actualizado: 2026-11-16

## Qué funciona (verificado)

| Parte | Cómo se verificó |
|---|---|
| Flujo completo (inicio, práctica, feedback, frases, historial) | A mano en el navegador a 375px, modo claro y oscuro; con IA simulada y con IA real |
| IA real de publik: whisper-1, `publik-balanced`, `tts-1`, `publik-fast` | Pruebas reales el 2026-11-16 con audio grabado (`say` de macOS), costos abajo |
| Interfaz en inglés y 3 niveles: Beginner (inglés más simple, voz a 0,9x, explicaciones y traducción en español), Intermediate (explicaciones en inglés, traducción en español), Advanced (todo en inglés) | Tests (prompts, ayuda y feedback por nivel). Los prompts por nivel **no** se probaron aún con la IA real |
| 4 avatares con foto (retratos generados con IA de personas ficticias, hechos con Blotato) y voz propia: Sarah (nova), James (onyx), Emily (shimmer), Mike (echo). El avatar se anima cuando habla o escucha | Tests y revisión visual a 375px. **Sin sincronía de labios** (ver pendientes) |
| "Help me": traducción o paráfrasis de lo que te dijeron, respuesta sugerida y un tip | Tests y prueba real (2,6 s, $0,0002) |
| "Say it": dices la frase mejorada, la app la transcribe, marca las palabras que faltaron y la agenda para 1, 3 y 7 días | Tests y prueba real: frase correcta 100% y agendada para el día siguiente; frase equivocada 6% |
| "Today's review" en el inicio y frases del día primero | Tests |
| El texto de la respuesta aparece antes que la voz; la voz se pide aparte y queda en caché para repetir y para "Slower" (0,75x) | Tests y prueba real: el texto llega unos 2,5 s antes |
| Racha diaria con los últimos 7 días, en la zona horaria del usuario | Tests |
| Push to talk con MediaRecorder, corte a los 90 s, respuesta escrita como alternativa | Tests con MediaRecorder simulado. **No probado en un teléfono real** |
| Sign in with publik por sesión de navegador, telemetría `app_opened` y `active_session` | Tests y recorrido contra un publik falso en localhost. **No probado contra publik real** |
| Claves solo en el servidor, cifradas (AES-256-GCM) | Tests |
| `npm run build`, `npm run lint`, `npm run typecheck` | Pasan |
| Tests | 240 tests. Cobertura: 97,5% de líneas, 90% de ramas, 96% de funciones |

## Diferencias entre la API real y el mock (corregidas)

| Hallazgo | Arreglo |
|---|---|
| publik rechazó el audio `audio/mp4` subido como `turn.mp4` ("Invalid file format"). Es lo que graba Safari en iPhone | Se sube como `.m4a`; mapeo de tipos en `audioExtension()` con test |
| El modelo escribe guiones largos en respuestas y feedback | Se limpian (`cleanDashes`) y el prompt los prohíbe |
| El feedback hablaba de "el candidato" y con frases largas | Prompt en "tú", frases de máximo 25 palabras y razones de máximo 20 |
| La transcripción no siempre trae la cabecera `x-publik-charge-micros` | El total se cuadró con `GET /wallet` `spent_today_micros` |
| `tts-1` con la voz `alloy` sí funciona en `/audio/speech` | Se mantiene (antes era una suposición) |

## Costo medido con la IA real (2026-11-16)

Fuente: cabecera `x-publik-charge-micros` por llamada (activar con `PUBLIK_COST_LOG=1`) y cuadre con `GET /wallet`. 1.000.000 micros = $1.

| Llamada | Modelo | Costo medido |
|---|---|---|
| Voz del saludo inicial | tts-1 | $0,0022 a $0,0025 |
| Transcripción de un turno (unos 6 s de audio) | whisper-1 | $0,0005 |
| Respuesta de la contraparte | publik-balanced | $0,0010 a $0,0014 (crece con la conversación) |
| Voz de la respuesta | tts-1 | $0,0015 a $0,0030 |
| **Un turno completo** | | **unos $0,004** |
| Feedback final | publik-balanced | $0,0102 |
| "Help me" | publik-fast | $0,0002 |
| "Say it" (una frase) | whisper-1 | $0,0005 |

**Práctica de 10 minutos** (estimado con esos costos, unos 10 turnos, 3 "Say it" y 2 ayudas): 0,0024 + 10 × 0,004 + 0,0102 + 3 × 0,0005 + 2 × 0,0002 ≈ **$0,054**. Con el historial más largo de los últimos turnos, entre **$0,05 y $0,06**. Toda la prueba real de esta sesión gastó unos $0,029.

Lectura: el saldo gratis de publik ($0,05) alcanza para más o menos **una** práctica. La voz (tts-1) es casi la mitad del costo; `REPLY_TIER=fast` ahorra poco porque el chat es la parte barata.

## Qué está simulado o sin probar

- **Sign in with publik real:** necesita el token de la app (`PUBLIK_APP_TOKEN`) y el setup de `PUBLIK-SETUP.md`. La prueba real usó la clave de desarrollador con el gate apagado.
- **Avatar que habla con los labios:** hoy el avatar es una foto con animación de "hablando" y "escuchando". Mover los labios en vivo necesita un servicio de avatar en tiempo real de pago (mejora #13 en `COMPETITIVE-ANALYSIS.md`).
- **Niveles con la IA real:** el estilo de cada nivel está en los prompts y tiene tests, pero no se hizo una práctica real en Beginner ni en Advanced.
- **Teléfonos reales:** falta probar micrófono, audio automático y "Say it" en iPhone (Safari) y Android (Chrome). El arreglo de `.m4a` se probó con un archivo de macOS, no con una grabación de Safari.
- **Modo demo:** `AI_PROVIDER=mock` sigue sirviendo para ensayar sin gastar; su feedback es fijo.

## Nombres propuestos

| Nombre | Por qué | Contra |
|---|---|---|
| **Dilo** (favorito, nombre de trabajo) | "Dilo" es la acción misma: decirlo en voz alta. Corto, en español, sirve como verbo en los reels ("Dilo en inglés"). Funciona en los reels en español aunque la app esté en inglés | Disponibilidad de dominio y marca sin verificar |
| Ensayo | Suena profesional: ensayas antes de la entrevista real | Menos memorable, puede sonar a escrito académico |
| Turno | Calza con la mecánica por turnos y con "tu turno" | Genérico, difícil de buscar |

## Preguntas abiertas

Para Akrit o Mann (publik):

1. **Web alojada con muchos usuarios:** aquí cada sesión de navegador hace su propio `POST /installs` con el token del servidor y su clave queda cifrada en la base. ¿Es el patrón que esperan para `hosted_web`? ¿Qué valor de `os` va (hoy `linux`, configurable)?
2. **El escaneo:** busca `/api/v1/installs`, `/api/v1/telemetry`, `app_opened` y `APP_SLUG = "<slug>"` en el archivo del módulo, que es `src/server/publik/publik.ts`. ¿Lo encontrará ahí?
3. **Saldo gratis:** medido, $0,05 da para una práctica. ¿Pueden dar más saldo inicial a los usuarios de fellows, o pueden los créditos de David cubrir su uso?
4. **Compute:** ¿cuenta para el leaderboard el gasto en audio (transcripción y voz), que publik cobra sin margen? Es casi la mitad del costo de una práctica.
5. **Hosting:** ¿publik aloja apps `hosted_web` o cada fellow pone su servidor?
6. **"Free":** la interfaz dice "Free" en el inicio y en la descripción. Si los créditos de David no pueden cubrir el uso, hay que cambiar esos textos (riesgo marcado también por la sesión de marketing).

Para David:

7. ¿Nombre final? (tabla de arriba).
8. ¿Licencia MIT está bien?
9. ¿Dónde desplegar? Necesita disco persistente (ver `PUBLIK-SETUP.md`).
10. ¿Te sirven los 4 avatares (Sarah, James, Emily, Mike)? Se cambian con una imagen y una línea en `src/domain/avatars.ts`. Blotato quedó con 398 créditos.

## Bloqueado por David

- Hacer público el repo, desplegar, correr el setup de publik y aprobar en el navegador, poner `PUBLIK_APP_TOKEN` en el hosting. Todo en `PUBLIK-SETUP.md`.

## Siguientes pasos sugeridos

Ranking completo y fuentes en `COMPETITIVE-ANALYSIS.md`.

1. Los pasos de `PUBLIK-SETUP.md` y una práctica real con Sign in with publik.
2. Probar en iPhone y Android reales (micrófono, audio, "Say it") y una práctica real por nivel.
3. Grabar el primer reel con `DEMO.md`.
4. Escenario propio: pegar tu CV o "mañana tengo reunión con..." y practicar eso (puntaje 78 en el ranking).
5. Objetivos visibles: 3 tareas por situación, marcadas al final (66).
6. Recordatorio diario (correo o notificación web) para cuidar la racha y el "Today's review" (64).
7. Bajar el costo de voz: probar otra voz o modelo de `/audio/speech` si publik ofrece uno más barato, o usar la voz del navegador en los repasos.
8. Voz en tiempo real como v2, con un relé en el servidor (detalle en `README.md`).
9. Vincular el historial a la cuenta de publik para usarlo en varios dispositivos.
