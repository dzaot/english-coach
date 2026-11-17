# Estado: Dilo (english-coach)

> **Publicada el 2026-11-16.**
> - Listado en publik: https://publikhq.com/dilo (estado `live`, slug `dilo`, categoría Productivity, publik API con `ai.chat`, `ai.transcribe` y `ai.speech`).
> - App: https://dilo-mocha.vercel.app (Vercel, proyecto `dilo`, base de datos Turso).
> - Repo público: https://github.com/dzaot/english-coach (MIT).
> - Abre con **Sign in with publik**. Sin sesión, la práctica responde `gate_required`.
> - El token de la app (`PUBLIK_APP_TOKEN`) solo está en Vercel; publik respondió `installs: 201`.

> **Auditoría (2026-11-16, noche):** un agente revisó toda la app como usuario y crítico (`AUDITORIA-2026-11-16.md`): 1 crítico, 10 altos, 17 medios, 20 bajos. El crítico y los 10 altos quedaron arreglados en el commit `a484ac2` (la voz en iPhone falta verificarla en un teléfono). Quedan medios y bajos.

> **Idiomas (2026-11-16, noche):** la interfaz está en inglés, español, portugués, francés, italiano y alemán.
> - Un botón arriba (en el inicio y en la pantalla de publik) cambia el idioma. La primera vez se usa el del navegador, y la elección se guarda en el navegador.
> - La conversación sigue en inglés, que es lo que se practica.
> - Según el nivel, las explicaciones, los tips de sonido, las razones de cada corrección y las traducciones de "Help me" llegan en el idioma elegido. Beginner: todo en tu idioma. Intermediate: traducciones en tu idioma y explicaciones en inglés. Advanced: todo en inglés.
> - Los textos de publik (título y botones de inicio de sesión) quedan en inglés, por la regla de publik.
> - Probado con la IA real en francés: correcciones y "Help me" llegaron en francés.
> - Las traducciones las escribió la IA; conviene que un hablante nativo revise portugués, francés, italiano y alemán.
> - 362 tests, 96,8% de líneas.

> **Cambios del 2026-11-16 (noche), tras la primera prueba de David en producción:**
> - **Turnos más rápidos.** Un solo pedido en streaming: tus palabras aparecen a los ~2,5 s (antes ~7 s) y la respuesta llega junto con su voz a los ~7 a 8 s (antes ~10 a 11 s). Las respuestas usan `publik-fast` (antes `publik-balanced`, 2 s más lento). El cuello de botella que queda es la voz HD de publik: 2,3 a 4,8 s por llamada, sin streaming real.
> - **Tus errores se ven.** whisper-1 corregía tu gramática ("I have work" volvía como "worked"). Ahora se le pasa un prompt con errores típicos y transcribe palabra por palabra. Cada respuesta se revisa en paralelo (`publik-fast`, con un ejemplo resuelto en el prompt): gramática y palabras en rojo, corregidas **letra por letra** dentro de tu frase (verde bien, rojo sobra, amarillo falta), frases poco naturales en amarillo, la razón de cada una y **2 formas más de decirlo** con su voz.
> - **Tu situación real.** En el inicio: link o texto de la oferta de trabajo para la entrevista, detalles para cualquier escenario y un escenario nuevo, "Your situation" (por ejemplo, una reunión con tu abogado). Un link se lee en el servidor con protecciones contra redes privadas y se resume; la primera frase del compañero se escribe para tu caso.
> - **Sound check letra por letra:** las letras del sonido difícil en amarillo antes de hablar; después, verde lo que se oyó, rojo lo que sobró y amarillo lo que faltó.
> - Lo que **no** hace: medir tu acento sonido por sonido. Las letras comparan lo que la IA **oyó** con la forma correcta; el amarillo de los sonidos difíciles es una guía por la ortografía. Para puntaje fonético real haría falta Azure Speech o un modelo en el navegador.
> - Costo por turno medido: $0,005 a $0,006 (transcripción $0,0009, respuesta $0,0001, revisión $0,0004 a $0,0005, voz HD $0,004 a $0,005). La práctica sigue en unos $0,07 a $0,09.
> - 345 tests, 96,9% de líneas y 88,5% de ramas.

> Resumen: MVP completo y probado **con la IA real de publik** en local (clave de desarrollador, gate apagado). Una práctica de 10 minutos cuesta unos **$0,07 a $0,09** con voces HD (`tts-1-hd`, elegidas por David el 2026-11-16). El 2026-11-16 se agregaron:
> - una marca propia (`BRAND.md`);
> - la práctica como videollamada con subtítulos en vivo;
> - el **Sound check** de pronunciación en inglés americano;
> - un inicio con una sola acción y una tarjeta de resultados;
> - un análisis de precios: sin suscripción, de 2 a 12 veces más barato que las apps pagas.
>
> Sign in with publik sigue probado solo contra un publik falso. Repo privado; no está público, desplegado ni listado.

Actualizado: 2026-11-16 (tarde)

## Qué funciona (verificado)

| Parte | Cómo se verificó |
|---|---|
| Flujo completo (inicio, práctica, feedback, frases, historial) | A mano en el navegador a 375px, modo claro y oscuro; con IA simulada y con IA real |
| IA real de publik: whisper-1, `publik-balanced`, `tts-1`, `publik-fast` | Pruebas reales el 2026-11-16 con audio grabado (`say` de macOS), costos abajo |
| Marca Dilo: paleta "atardecer sobre la noche", Bricolage Grotesque para títulos, logo de burbuja con barras de voz (`BRAND.md`, `public/brand/`) | Revisión visual a 375px; contraste calculado con la fórmula WCAG |
| Práctica como videollamada: foto grande del colega, brillo que late cuando habla y sigue tu voz cuando hablas, subtítulos en vivo palabra por palabra | Tests y revisión visual a 375px (modo demo). Los subtítulos siguen el audio real, los eventos de la voz del navegador o, si no hay, una estimación por tiempo |
| **Sound check** en "Say it": deletreo fonético en inglés americano ("MEE-ding"), sílaba fuerte, 3 palabras foco con tips en español o inglés según el nivel (17 reglas para hispanohablantes sobre el diccionario CMU); al decir la frase: qué palabras entendió la IA, qué oyó en su lugar, palabras por minuto, pausas largas y tu voz palabra por palabra | Tests (dominio, servidor, componente) y revisión visual. Prueba real: publik devuelve los tiempos por palabra de whisper-1 (`verbose_json`), $0,0003 por 3 s de audio |
| Inicio: una tarjeta "Your call with …" con la situación y un solo botón; compañero, industria y nivel en un panel que se abre solo la primera vez; tarjeta "Your results" (palabras dichas en inglés, prácticas, frases aprendidas, curva de puntaje) | Tests y revisión visual a 375px |
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
| Tests | 294 tests. Cobertura: 97,2% de líneas, 88,8% de ramas, 96% de funciones |

## Diferencias entre la API real y el mock (corregidas)

| Hallazgo | Arreglo |
|---|---|
| publik rechazó el audio `audio/mp4` subido como `turn.mp4` ("Invalid file format"). Es lo que graba Safari en iPhone | Se sube como `.m4a`; mapeo de tipos en `audioExtension()` con test |
| El modelo escribe guiones largos en respuestas y feedback | Se limpian (`cleanDashes`) y el prompt los prohíbe |
| El feedback hablaba de "el candidato" y con frases largas | Prompt en "tú", frases de máximo 25 palabras y razones de máximo 20 |
| La transcripción no siempre trae la cabecera `x-publik-charge-micros` | El total se cuadró con `GET /wallet` `spent_today_micros` |
| `tts-1` con la voz `alloy` sí funciona en `/audio/speech` | Se mantiene (antes era una suposición) |
| whisper-1 corrige solo el acento: el audio "I want to espeak" volvió como "I want to speak" | El Sound check dice "la IA te entendió", no "pronunciaste perfecto"; los tips de sonidos se predicen por la palabra y lo dicen |

## Costo medido con la IA real (2026-11-16)

Fuente: cabecera `x-publik-charge-micros` por llamada (activar con `PUBLIK_COST_LOG=1`) y cuadre con `GET /wallet`. 1.000.000 micros = $1.

| Llamada | Modelo | Costo medido |
|---|---|---|
| Voz del saludo inicial | tts-1-hd | unos $0,0045 a $0,005 (tts-1: $0,0022 a $0,0025) |
| Transcripción de un turno (unos 6 s de audio) | whisper-1 | $0,0005 |
| Respuesta de la contraparte | publik-balanced | $0,0010 a $0,0014 (crece con la conversación) |
| Voz de la respuesta | tts-1-hd | unos $0,003 a $0,006 (tts-1: $0,0015 a $0,003). HD cuesta el doble: medido el 2026-11-16, la misma frase costó $0,0017 en tts-1 y $0,0035 en tts-1-hd |
| **Un turno completo** | | **unos $0,006** (tts-1: $0,004) |
| Feedback final | publik-balanced | $0,0102 |
| "Help me" | publik-fast | $0,0002 |
| "Say it" (una frase, con tiempos por palabra) | whisper-1 `verbose_json` | $0,0003 a $0,0005 |
| Sound check (deletreo y tips) | ninguno, diccionario local | $0 |

**Práctica de 10 minutos con voces HD** (estimado con esos costos, unos 10 turnos, 3 "Say it" y 2 ayudas): 0,0048 + 10 × 0,0062 + 0,0102 + 3 × 0,0005 + 2 × 0,0002 ≈ **$0,079**, entre **$0,07 y $0,09**. Con `tts-1` serían $0,05 a $0,06. 10 minutos al día durante un mes: unos **$2,10 a $2,70**. Toda la prueba real de esta sesión gastó unos $0,029.

Lectura: el saldo gratis de publik ($0,05) ya no alcanza para una práctica completa con voces HD (cubre unos dos tercios). La voz es más de la mitad del costo; volver a `tts-1` con `PUBLIK_TTS_MODEL=tts-1` lo baja a $0,05 a $0,06, pero suena más robótica; `REPLY_TIER=fast` ahorra poco porque el chat es la parte barata.

## Qué está simulado o sin probar

- **Sign in with publik de punta a punta:** el gate real sale en la URL pública y el token sirve (`installs: 201`), pero nadie ha completado aún el inicio de sesión ni una práctica real en producción.
- **Pronunciación sonido por sonido:** el Sound check no puntúa cada sonido como ELSA o BoldVoice. Eso necesita un servicio de evaluación de pronunciación (por ejemplo Azure Speech, fuera de publik) o un modelo de unos 200 MB en el navegador. Detalle en `COMPETITIVE-ANALYSIS.md`, mejora #20.
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
3. **Saldo gratis:** medido, $0,05 da para unos dos tercios de una práctica con voces HD. ¿Pueden dar más saldo inicial a los usuarios de fellows, o pueden los créditos de David cubrir su uso?
4. **Compute:** ¿cuenta para el leaderboard el gasto en audio (transcripción y voz), que publik cobra sin margen? Es casi la mitad del costo de una práctica.
5. **Hosting:** resuelto por ahora con Vercel (plan Hobby) y Turso. Pregunta: ¿publik aloja apps `hosted_web`?
6. **"Free":** la interfaz dice "Free" en el inicio y en la descripción. Si los créditos de David no pueden cubrir el uso, hay que cambiar esos textos (riesgo marcado también por la sesión de marketing).

Para David:

7. ¿Nombre final? (tabla de arriba).
8. ¿Licencia MIT está bien?
9. Dominio propio: hoy la URL es `dilo-mocha.vercel.app`. ¿Compramos un dominio (por ejemplo, para Dilo)?
10. ¿Te sirven los 4 avatares (Sarah, James, Emily, Mike)? Se cambian con una imagen y una línea en `src/domain/avatars.ts`. Blotato quedó con 398 créditos.

## Bloqueado por David

- Nada. Lo que había (repo público, despliegue, setup de publik, token) quedó hecho el 2026-11-16.

## Siguientes pasos sugeridos

Ranking completo, precios y fuentes en `COMPETITIVE-ANALYSIS.md`.

1. Grabar el primer video con `DEMO.md` (en la Mac, con la IA real, unos $0,08 por toma).
2. Los pasos de `PUBLIK-SETUP.md` y una práctica real con Sign in with publik.
3. Probar en iPhone y Android reales (micrófono, audio, subtítulos, "Say it") y una práctica real por nivel.
4. Prueba de nivel al inicio y repetirla cada mes, con el audio de antes y después (#17). Es el mejor momento para un reel.
5. Ejercicios armados con tus propios errores del Sound check (#18).
6. Escenario propio: pegar tu CV o "mañana tengo reunión con..." (#3).
7. Recordatorio diario (correo o notificación web) para la racha y el "Today's review".
8. Voz en tiempo real como v2, con un relé en el servidor (detalle en `README.md`).
