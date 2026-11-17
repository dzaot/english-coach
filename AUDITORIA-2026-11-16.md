# Auditoría de Dilo (2026-11-16)

Hecha en modo demo local (`AI_PROVIDER=mock`, puerto 3200) a 375 px, 640 px y escritorio, en claro y oscuro, en inglés, español y alemán, más la pantalla de inicio de sesión del sitio en vivo. Se leyó el código de pantallas, dominio, servidor e idiomas. No se tocó ningún archivo de la app.

## Estado de los arreglos (commit `a484ac2`, 2026-11-16)

| Hallazgo | Estado |
|---|---|
| C1 saldo a mitad de práctica | En parte: aviso antes de empezar si el saldo puede no alcanzar (sin mostrar dinero, regla de publik), precio por práctica visible, y la respuesta que falla vuelve al cuadro para reenviarla. La evaluación sigue necesitando saldo |
| A1 error fuera de la pantalla | Arreglado: el error sale justo encima de "Empezar a hablar" |
| A2 enlace ilegible bloquea | Arreglado: sigue con tus notas y avisa en la práctica |
| A3 doble "Enviar" | Arreglado en la pantalla y en el servidor (rechaza la segunda respuesta) |
| A4 doble "Practicar otra vez" | Arreglado: el botón espera y dice "Preparando todo…" |
| A5 "Practicar otra vez" desde el historial | Arreglado: repite la práctica que estás viendo |
| A6 respuesta hablada larga | Arreglado: se guarda recortada en una palabra completa |
| A7 panel de abajo tapa la pregunta | Arreglado: la ayuda va dentro de la conversación y el panel se mide |
| A8 repaso saltable | Arreglado: solo avanza el día que le toca |
| A9 pantalla de entrada | Arreglado: titular, qué es y precio arriba; "free" quitado de la descripción del sitio |
| A10 voz en iPhone | Hecho, a verificar en un iPhone real: un solo elemento de audio desbloqueado en el primer toque |
| M1, M2, M8 (prompt), M9 | Arreglados de paso. El resto de medios y bajos sigue pendiente |

## 1. Resumen

- La app está sólida en lo técnico: 362 tests pasan, TypeScript sin errores, buen contraste en casi todo, textos completos en 6 idiomas y nada se desborda a 375 px ni en alemán.
- Los problemas están en el flujo real de un usuario nuevo en el teléfono, no en la lógica pura.
- **Grave 1:** un usuario nuevo de publik se queda sin saldo a mitad de su primera práctica (según tu propia medición en STATUS) y la app no lo protege: pierde la práctica y queda una respuesta "huérfana" en pantalla.
- **Grave 2:** varios errores dejan al usuario sin saber qué pasó: el error al empezar aparece fuera de la pantalla, y una respuesta hablada larga se rechaza con "habla más fuerte".
- **Grave 3:** doble toque en "Enviar" o en "Practicar otra vez" duplica la respuesta o la práctica (y el gasto), y "Practicar otra vez" desde el historial abre otro escenario.

Conteo: 1 Crítico, 10 Altos (uno a verificar en iPhone), 17 Medios, 20 Bajos.

## 2. Hallazgos

### Crítico

**C1. El saldo gratis se acaba a mitad de la primera práctica y la práctica se pierde**
- Dónde: práctica. `STATUS.md` (sección de costo: "$0,05 cubre unos dos tercios de una práctica con voces HD"), `src/components/practice-view.tsx:104-110` y `:140-146`, `src/server/practice-service.ts:239-267`.
- Cómo se reproduce (inferido del código y de tu medición, no probado con publik real): usuario nuevo sin plan, practica 6 a 8 turnos con voz HD, publik responde 402.
- Qué pasa: el evento "heard" ya agregó tu respuesta al historial local y borró lo que escribiste; luego llega el error. El servidor no guardó ese turno (solo guarda al final). La respuesta queda en pantalla sin contestar, el contador sube, y al siguiente turno desaparece porque se reemplaza con el estado del servidor. Para terminar y ver la evaluación también hace falta saldo. Resultado: la primera experiencia termina en "se acabó tu saldo" sin evaluación.
- Qué debería pasar: el usuario sabe antes de empezar cuánto cuesta y cuánto saldo tiene; si se queda sin saldo, conserva lo dicho y puede pedir la evaluación al recargar.
- Por qué importa: es lo primero que vive cualquier persona que llega desde el listado de publik.
- Arreglo sugerido: mostrar el saldo y el costo estimado antes de "Empezar", bajar a `tts-1` cuando el saldo es bajo, y no agregar el turno local hasta que el servidor lo guarde (o revertirlo en el error y devolver el texto al campo).

### Alto

**A1. El error al empezar queda fuera de la pantalla** (visto en el navegador)
- Dónde: inicio. `src/components/coach-app.tsx:86-89` y `:209`.
- Cómo: en "Tu situación" pega un enlace que no se pueda leer (probé `https://example.com/job`), baja hasta "Empezar a hablar" y tócalo.
- Qué pasa: el botón dice "Leyendo la oferta de trabajo…" y vuelve a "Empezar a hablar". El aviso de error se pinta arriba del todo; medí que quedó 600 px por encima de la vista. En el teléfono parece que no pasó nada.
- Debería: mostrar el error junto al botón o llevar la vista al aviso.
- Por qué importa: es el botón principal; el usuario lo toca varias veces y se va.
- Arreglo: poner el `ErrorBanner` dentro de la tarjeta, justo encima del botón, o hacer `scrollIntoView` al aviso.

**A2. Un enlace que no se puede leer bloquea toda la práctica** (visto en el navegador)
- Dónde: `src/server/practice-service.ts:118-126`, `src/server/link-reader.ts:117-119`.
- Cómo: pega un enlace de LinkedIn o Indeed (piden sesión o cargan con JavaScript) junto con tus notas.
- Qué pasa: falla todo el inicio con "No pudimos leer ese enlace. Pega el texto de la oferta de trabajo", aunque escribiste notas útiles. El mensaje habla de "oferta de trabajo" aunque estés en "Tu situación".
- Debería: seguir con las notas y avisar que el enlace no se pudo leer.
- Por qué importa: pegar el enlace de la oferta es una función que el inicio promueve, y los sitios de empleo más usados casi nunca se dejan leer.
- Arreglo: si el enlace falla, usar el texto sin el enlace y mostrar un aviso suave.

**A3. Doble toque en "Enviar" manda la misma respuesta dos veces** (visto en el navegador)
- Dónde: `src/components/practice-view.tsx:93-99` y `:313-318`.
- Cómo: escribe una respuesta y toca "Enviar" dos veces seguidas (lo simulé con dos clics en el mismo instante).
- Qué pasa: se crearon dos turnos iguales en el servidor, con dos respuestas de Sarah. Con la IA real son dos cobros. Con la IA lenta las dos peticiones pueden pisarse en el servidor (`practice-service.ts:263`): se cobran ambas y se guarda solo una (inferido).
- Debería: ignorar el segundo toque.
- Arreglo: un `useRef` de "enviando" que corte `submit` si ya hay un envío en curso; en el servidor, rechazar un turno si la práctica cambió entre leer y guardar.

**A4. "Practicar otra vez" se puede tocar dos veces y no muestra que está cargando** (visto en el navegador)
- Dónde: `src/components/feedback-view.tsx:114-116`, `src/components/coach-app.tsx:174-176`.
- Cómo: en la evaluación, toca "Practicar otra vez" dos veces rápido.
- Qué pasa: se mandaron 2 pedidos de inicio (2 prácticas). El botón no cambia ni se desactiva mientras carga; con un enlace tarda varios segundos y la persona vuelve a tocar.
- Arreglo: pasar `starting` a `FeedbackView`, desactivar el botón y mostrar "Preparando todo…".

**A5. "Practicar otra vez" desde el historial abre otro escenario** (visto en el navegador)
- Dónde: `src/components/coach-app.tsx:174-176`.
- Cómo: haz una práctica de "Tu situación", vuelve al inicio, abre en el historial una "Entrevista de trabajo" anterior y toca "Practicar otra vez".
- Qué pasa: empezó "Your situation" con los detalles del arrendador, no la entrevista que estabas mirando.
- Debería: repetir la práctica que está en pantalla.
- Arreglo: usar siempre `view.practice` (escenario, industria, detalles) y guardar `lastChoice` solo como respaldo cuando coincide el id.

**A6. Una respuesta hablada larga se rechaza con "habla más fuerte"** (inferido del código)
- Dónde: `src/server/practice-service.ts:236-237`, `src/domain/conversation.ts:19`.
- Cómo: graba una respuesta de más de 75 a 80 segundos (el límite de grabación es 90 s; a 150 a 160 palabras por minuto pasa de 1.200 caracteres).
- Qué pasa: el texto supera `MAX_USER_TEXT_CHARS` y el servidor responde `transcription_empty`: "No entendimos el audio. Habla un poco más fuerte o escribe tu respuesta." La transcripción ya se pagó y la respuesta se pierde.
- Debería: aceptar la respuesta (recortada) o decir "tu respuesta es muy larga".
- Arreglo: recortar el texto transcrito a 1.200 caracteres en vez de rechazarlo, o bajar el límite de grabación a unos 60 s y decirlo.

**A7. El panel de abajo tapa la pregunta que hay que contestar** (visto en el navegador)
- Dónde: práctica, `src/components/practice-view.tsx:307-366` y `:300`.
- Cómo: a 375 px abre "Ayúdame" o "Escribir", o deja un error visible.
- Qué pasa: el panel fijo midió 406 px (la mitad de la pantalla) con error y campo de texto, y 589 px (73 %) con ayuda y campo. La última línea de Sarah quedó medio tapada detrás del panel. Con el teclado del teléfono abierto no queda nada visible de la conversación, y el subtítulo grande queda arriba, fuera de la vista.
- Debería: siempre ver la última pregunta mientras respondes.
- Arreglo: hacer la tarjeta de ayuda plegable o moverla a la conversación, reservar abajo el alto real del panel (no un `scroll-mb-72` fijo) y mostrar una línea con la última pregunta encima del campo.

**A8. La repetición espaciada (1, 3 y 7 días) se puede saltar en un minuto** (inferido del código)
- Dónde: `src/server/practice-service.ts:428-438`, `src/domain/drill.ts:76-80`.
- Cómo: en la evaluación o en "Frases para repasar", di la misma frase bien 4 veces seguidas con "Dilo" y "Intentar de nuevo".
- Qué pasa: cada acierto sube un paso sin mirar si la frase tocaba hoy. Al cuarto acierto queda "aprendida" el mismo día y suma a "frases aprendidas".
- Debería: solo avanzar cuando la frase está pendiente para hoy (`dueDay <= hoy`); los demás intentos son práctica libre.
- Por qué importa: es la promesa de aprendizaje de la app y la cifra de progreso que ve el usuario.
- Arreglo: en `drillPhrase`, llamar a `nextSchedule` solo si `isDue(phrase, hoy)` o si es el primer intento del día de creación.

**A9. La pantalla de entrada no dice qué es Dilo ni cuánto cuesta** (visto en el sitio en vivo)
- Dónde: https://dilo-mocha.vercel.app, `src/components/gate-panel.tsx:49-104`.
- Qué pasa: lo primero que ve alguien nuevo es "Sign in with publik" y dos párrafos sobre iniciar sesión: uno en inglés (texto de publik) y otro en español que repite lo mismo. No hay una frase sobre qué hace la app, ni una imagen, ni el precio por práctica. "Inicia sesión gratis" puede leerse como "la app es gratis".
- Debería: una línea de valor ("Ensaya tu entrevista en inglés en voz alta"), una captura de la llamada y "unos centavos por práctica, pagas con tu saldo de publik".
- Arreglo: añadir arriba de la tarjeta de publik el titular y subtítulo del inicio, y una línea de precio. Los textos de publik pueden quedar intactos debajo.

**A10. En iPhone la voz de Sarah probablemente no suena** (a verificar en un teléfono real)
- Dónde: `src/lib/hooks/use-speaker.ts:84-106`, `src/components/practice-view.tsx:64-75` y `:170-174`.
- Qué pasa: la voz se reproduce después de una petición de red (`await api.speech`), ya fuera del toque del usuario. Safari en iOS suele bloquear `audio.play()` en ese caso; la app cae a la voz del navegador, que en iOS también exige un toque. No hay ningún "desbloqueo" de audio en el primer toque (busqué `AudioContext` y `unlock`: no existe).
- Por qué importa: sin voz no hay "llamada", y los subtítulos tipo karaoke no avanzan.
- Arreglo: al tocar "Empezar a hablar" y el micrófono, reproducir un audio silencioso en un único `<audio>` reutilizable y luego cambiarle el `src`.

### Medio

**M1. El panel "Cambiar compañero, industria o nivel" siempre aparece abierto** (visto)
- `src/components/home-view.tsx:45-46`. `firstTime` se calcula cuando `progress` todavía es `null`, así que siempre es `true`. Con 1 práctica en el historial el panel seguía abierto. Alarga mucho el inicio en el teléfono. Arreglo: calcular `customizing` cuando llega `progress` (o guardarlo en el navegador).

**M2. El título de la práctica sale en inglés en todos los idiomas** (visto)
- `src/components/practice-view.tsx:240` usa `scenario.title` del dominio. En español: barra superior "Your situation", tarjeta "Tu situación · General". Arreglo: `t.scenarios[scenario.id].title`.

**M3. El error del micrófono no se va al escribir** (visto)
- `src/components/practice-view.tsx:309`. Toca el micrófono sin permiso, luego "Escribir" y envía una respuesta: el aviso "Necesitamos permiso para usar el micrófono" sigue fijo y ocupa espacio. Además la app no abre sola el modo escribir cuando el micrófono falla. Arreglo: `recorder.clearError()` al pasar a escribir o al enviar, y abrir el campo de texto tras un error de permiso.

**M4. En modo "Escribir" desaparece "Ayúdame" y se pierde el foco** (visto)
- `src/components/practice-view.tsx:312-356`. La fila con "Ayúdame" solo existe en modo voz. Quien no tiene micrófono no puede pedir ayuda. Al tocar "Escribir" o cerrar la ayuda, el foco cae en `body` (medido): un usuario de teclado o lector de pantalla pierde su lugar y el campo no recibe el foco. Arreglo: mostrar "Ayúdame" también en modo escribir y enfocar el campo al abrirlo.

**M5. Salir o recargar a mitad de la práctica la pierde sin aviso** (salida vista; recarga inferida)
- `src/components/practice-view.tsx:241-245`, estado solo en memoria en `coach-app.tsx:44`. La flecha de atrás sale sin confirmar aunque lleves 11 respuestas. Una recarga (iOS recarga pestañas en segundo plano con frecuencia, o al contestar una llamada) vuelve al inicio sin forma de retomar; esa práctica no cuenta para la racha. Arreglo: confirmar al salir con 2 o más respuestas y ofrecer "Continuar tu práctica" en el inicio si hay una sin terminar.

**M6. El texto de ejemplo parece contenido real y el botón se apaga sin explicar por qué** (visto)
- `src/components/home-view.tsx:111-126`. En "Tu situación" el placeholder ("Reunión con mi abogado…") se ve casi igual que texto escrito (contraste 6,9:1) y el botón queda gris. No hay mensaje de "escribe al menos 10 caracteres". El placeholder además se corta en 3 líneas. Arreglo: placeholder más tenue o con "Ej.:", y una línea de ayuda que diga qué falta.

**M7. Los detalles escritos pasan de un escenario a otro** (inferido del código)
- `src/components/home-view.tsx:44`. Un solo estado `details` para todos: escribes la oferta para la entrevista, cambias a "Llamada con cliente" y esa oferta se manda como contexto del cliente. Arreglo: guardar detalles por escenario o limpiar al cambiar (con deshacer).

**M8. Los consejos de sonidos y el prompt asumen que hablas español** (inferido del código)
- `src/domain/sounds.ts:2` y `:120` (reglas "para hispanohablantes", por ejemplo "Sin e antes de la s", "V, no B"), `src/domain/prompts.ts:23` y `:25` ("a Spanish-speaking professional"). La app se ofrece en alemán, francés, italiano y portugués, pero un alemán recibe tips que no son sus errores (los suyos son w/v, th, ensordecimiento final) y Sarah cree que habla con un hispano. Arreglo: usar `speakerOf(locale)` en el prompt y, por ahora, mostrar los tips de sonido solo en español e inglés o decir "pensado para hispanohablantes".

**M9. "Free" en la descripción del sitio** (código)
- `src/app/layout.tsx:10`: "Practice your job interview in English, out loud, free." Es lo que muestran Google y las vistas previas de enlaces. Contradice tu propia regla de `BRAND.md` ("nunca decir gratis sin aclarar") y el costo real. Arreglo: "for cents per practice".

**M10. Las reglas de nivel no coinciden con lo que dice la tarjeta de Intermedio** (código)
- `src/i18n/messages/es.ts:89` promete "Consejos en inglés". Los tips de sonido del "Dilo" usan `translationLocale` (`feedback-view.tsx:27`, `coach-app.tsx:187`), que para Intermedio es tu idioma. Así un intermedio ve el resumen y las razones en inglés, pero los tips de sonido en español. Arreglo: decidir una regla y usar `explanationLocale` en ambos sitios (o cambiar la descripción).

**M11. El progreso vive en una cookie del navegador, no en la cuenta de publik** (código)
- `src/server/session.ts:13-25`. Cada navegador es un usuario nuevo: el teléfono y la computadora tienen rachas e historiales distintos, y si se borran las cookies se pierde todo (y se crea otra instalación de publik). Para una app de hábito diario esto pesa. Arreglo: atar los datos a la cuenta o instalación de publik cuando hay sesión.

**M12. El límite de uso no funciona en Vercel** (código)
- `src/server/http.ts:8-9`, `src/server/rate-limit.ts:1`. Es un mapa en memoria; en serverless cada instancia tiene el suyo, y además se identifica por la cookie, que un script puede no mandar. El costo recae en el saldo de cada usuario, así que el riesgo es moderado, pero el lector de enlaces sirve de proxy. Arreglo: límite en Turso o en Vercel KV, por instalación de publik.

**M13. Lector de enlaces: la protección contra redes privadas se puede saltar con DNS rebinding** (código)
- `src/server/link-reader.ts:53` resuelve el nombre y valida la IP, pero `fetch` en `:103` vuelve a resolverlo. Un dominio que cambia de IP entre las dos consultas pasa el filtro. En Vercel el daño posible es bajo; en un servidor propio es mayor. Arreglo: conectar a la IP ya validada (agente con `lookup` fijo) o usar un servicio de lectura externo.

**M14. Idioma marcado mal para lectores de pantalla** (código)
- `src/components/letter-diff.tsx:35` pone la frase "Dijiste … Mejor …" en tu idioma dentro de un párrafo `lang="en"` (`chat-bubble.tsx:37`, `answer-check.tsx:86`). `sound-words.tsx:70-72` pone `lang="en"` a botones cuyo nombre accesible está en español ("entendida", "practica esta"). La pista de "Ayúdame" (`help-card.tsx:39`) y el resumen de la evaluación salen en inglés en Intermedio y Avanzado sin `lang="en"`. Resultado: el lector lee español con voz inglesa y al revés. Arreglo: `lang` del idioma de la interfaz en los textos sr-only y `lang="en"` donde el contenido viene en inglés.

**M15. Modo oscuro: la tarjeta principal se funde con el fondo y la racha se invierte** (visto)
- `src/app/globals.css:59` (`--night: #0b0918` sobre `--bg: #120f22`, contraste 1,05:1): la tarjeta "Tu llamada con Sarah" no tiene borde visible. `src/components/streak-card.tsx:12` usa `bg-ink text-bg`, que en oscuro se vuelve un bloque crema muy brillante en medio de la pantalla oscura. Arreglo: un borde `border-border` en la tarjeta nocturna y colores propios para la racha en oscuro.

**M16. El anillo de foco casi no se ve sobre la tarjeta oscura en modo claro** (calculado)
- `src/components/home-pickers.tsx:10-11` y `globals.css:25`: `--focus #2457d6` sobre `--night #1a1530` da 2,86:1 (por debajo de 3:1 para indicadores). Afecta a los escenarios, el campo de detalles y el botón "Empezar". Arreglo: dentro de la tarjeta nocturna usar un foco claro (por ejemplo `#8fb1ff`, el del modo oscuro).

**M17. Si la voz del navegador no termina, Sarah "habla" para siempre** (visto en el panel; a verificar en teléfonos)
- `src/lib/hooks/use-speaker.ts:53-82`. En el navegador de prueba `speechSynthesis.speaking` siguió en `true` más de 40 s; el estado quedó en "Sarah está hablando…" y el contador de turnos nunca se mostró. Chrome tiene un fallo conocido con frases largas que no disparan `onend`. Arreglo: un tope de tiempo (largo estimado más 2 s) que cierre el estado de "hablando".

### Bajo

1. **Textos fijos en inglés**: el enlace "Skip to main content" (`layout.tsx:30`) aunque existe `t.app.skipToContent`; el título de la pestaña siempre en inglés (`layout.tsx:9`). (código, visto en español)
2. **Primer pintado en inglés**: `i18n/provider.tsx:35-41` pinta en inglés y cambia al idioma guardado tras montar; se ve un parpadeo de idioma. (código)
3. **Carga infinita**: si `/api/gate` no responde, "Cargando…" se queda sin tiempo límite (`use-gate.ts:34-43`). En local con `127.0.0.1` se quedó así para siempre (por el bloqueo de origen de Next en desarrollo, no es de producción). (visto)
4. **Rol raro en "Tu situación"**: la tarjeta de la llamada dice "Tu situación · General" como rol del compañero (`es.ts:77` `role`); la industria no aplica en ese escenario. (visto)
5. **"Leyendo la oferta de trabajo…"** aparece aunque el enlace no sea una oferta (`home-view.tsx:125`). (visto)
6. **Contador de caracteres**: el campo de respuesta corta en 1.200 caracteres en silencio al pegar, sin contador (`practice-view.tsx:329`); con más texto el servidor responde un genérico "Revisa lo que escribiste". (visto)
7. **Enter no envía** en el campo de respuesta (agrega un salto de línea). En escritorio la gente espera Enter para enviar y Shift+Enter para salto. (visto)
8. **Escape** solo cancela la grabación; no cierra la tarjeta de ayuda (`practice-view.tsx:194`). (código)
9. **Números en el sound check**: al tocar "40%." el detalle sale sin palabra arriba y dice "Esta palabra no tiene sonidos difíciles" (`sound-words.tsx:107` borra los dígitos). (visto)
10. **La mejor frase guardada solo se ve como fichas sueltas** en la evaluación (`feedback-view.tsx:74-79`): no hay una línea con la frase completa para leerla de corrido. (visto)
11. **"Dijiste:" va tachado completo y en gris pequeño**, difícil de leer, y lo marca todo como "mal" aunque solo cambie una palabra. (visto)
12. **Flecha de tendencia siempre hacia arriba** en "Tus resultados" aunque el puntaje baje o se mantenga (`results-card.tsx:64`). (visto con 72 → 72)
13. **La tarjeta salta al marcar "Ya me la sé"**: se reordena al instante y se va al final de la lista, sin deshacer (`phrases-view.tsx:34`). (visto)
14. **Frases antiguas sin fecha de repaso** (`dueDay` nulo) nunca aparecen en "Repaso de hoy" (`drill.ts:82-84`). Lo vi con datos locales viejos; a verificar si existen en producción. (visto)
15. **La leyenda de colores se repite en cada respuesta** y muestra "Amarillo" aunque no haya amarillo. (visto)
16. **El resaltado del subtítulo incluye el espacio final**, la ficha amarilla queda con un hueco a la derecha (`call-stage.tsx:77`). (visto)
17. **Varios botones "Escuchar" iguales** en la conversación, sin decir de qué frase son (lector de pantalla). (código)
18. **Copia en otros idiomas**: alemán "Sag es laut bevor es zählt" sin coma (`de.ts:95-96`); alemán "Taste drücken oder tippen" (`de.ts:120`) confunde "tocar" con "escribir"; italiano "tieni premuto per parlare" (`it.ts:120`) dice "mantén presionado", pero la app es tocar y volver a tocar. Español "arrendador" suena formal; "dueño del departamento" o "casero" es más natural. (código, alemán visto)
19. **Duración**: el inicio dice "Unos 5 minutos" y el README "5 a 10 minutos"; con 12 respuestas y la voz HD puede pasar de 10. (código)
20. **Datos de demo engañosos para grabar videos**: en modo demo la evaluación cita frases que el usuario no dijo y "Ayúdame" traduce siempre al español, aunque la interfaz esté en alemán (`mock-provider.ts:42`, `:58`). Solo afecta al demo. (visto)

Otros menores sin número: el historial cuenta las prácticas sin terminar dentro del límite de 30 (`practice-service.ts:382-385`); si sales durante un envío, la voz de esa respuesta puede sonar ya en el inicio (`practice-view.tsx:121-126`, inferido); "Practicar otra vez" vuelve a leer el enlace y usa tu nivel actual, no el de esa práctica (`coach-app.tsx:85`).

## 3. Lo que funciona bien

- 362 tests en 46 archivos pasan y `tsc --noEmit` no da errores.
- Nada se desborda a 375 px, ni en alemán (medido elemento por elemento).
- Contraste: casi todos los pares de colores pasan 4,5:1 en claro y oscuro (calculado con la fórmula WCAG); solo fallan los dos casos de M15 y M16.
- La corrección letra por letra es clara y no depende solo del color (tachado y subrayado), con leyenda y texto para lectores de pantalla.
- Los errores llegan traducidos y en tono amable; el 402 sigue la regla de un solo enlace.
- Reducción de movimiento global, objetivos táctiles de 44 px en casi todo, anuncios `aria-live` durante la llamada.
- El lector de enlaces ya bloquea direcciones privadas, redirecciones y páginas grandes.
- El cambio de idioma es inmediato y completo en las 6 lenguas.

## 4. Ideas de mejora (crítico de producto)

1. **Precio visible antes de empezar** ("Esta práctica cuesta unos $0,08. Tu saldo: $0,05"). Es tu bandera frente a Speak y ELSA, y hoy no aparece en la app.
2. **Inicio más corto en el teléfono**: el botón "Empezar" queda a 1,3 pantallas de distancia y el nivel (que cambia el idioma de los consejos) está debajo del botón. Pon nivel y compañero como una línea editable dentro de la tarjeta.
3. **Retomar práctica**: una práctica interrumpida debería poder seguir. Es lo más probable en un teléfono (llamadas, cambio de app).
4. **Respuesta corta de prueba de micrófono** la primera vez ("Di: Hi Sarah"), para detectar permisos y volumen antes de la entrevista.
5. **Mostrar la última pregunta pegada al campo de respuesta**: es lo que la persona necesita mirar mientras habla o escribe.
6. **Puntaje con contexto**: "72" no dice frente a qué. Mostrar 2 o 3 subpuntajes (claridad, gramática, fluidez) o la comparación con tu práctica anterior.
7. **Progreso atado a la cuenta**, para que la racha sobreviva al cambio de teléfono; sin eso la racha diaria es frágil.
8. **Páginas de idioma honestas**: mientras los tips de sonidos sean para hispanohablantes, dilo en la interfaz de los otros idiomas o limita el sound check; prometer lo mismo en alemán resta credibilidad.

## 5. Qué no pude probar y por qué

- **Micrófono real, grabación, "Dilo" con voz y el corte a 90 s**: el panel del navegador bloquea el micrófono. Revisé el flujo en `use-recorder.ts`, `record-button.tsx` y `practice-view.tsx`.
- **iPhone y Android reales** (autoplay, Safari, `.m4a`, teclado en pantalla): no hay dispositivo. A10 y M17 quedan "a verificar".
- **IA real, costos y saldo de publik**: prohibido gastar. C1 se basa en tu medición de `STATUS.md` y en el código.
- **Inicio de sesión con publik**: solo miré la pantalla de entrada del sitio en vivo.
- **Usuario completamente nuevo en local**: la cookie de `localhost` ya tenía datos de pruebas anteriores, y `127.0.0.1` no carga en modo desarrollo de Next. Los estados vacíos (sin frases, sin historial) los revisé en el código.
- **Detección automática de idioma**: el navegador de prueba está en inglés; revisé `detectLocale` en el código.
- **Lector de pantalla real** (VoiceOver o TalkBack): revisé atributos y anuncios en el código y el árbol de accesibilidad.
- **Datos de prueba**: las prácticas de esta auditoría (unas 5, varias sin terminar) quedaron en la base local `data/coach.db` bajo la sesión de `localhost`. Marqué y desmarqué una frase para dejarla como estaba.
