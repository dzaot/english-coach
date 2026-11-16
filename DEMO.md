# Primer video de Dilo (2026-11-17)

> Resumen: un reel vertical de 30 a 40 segundos, en español, que muestra a David practicando una entrevista con Emily. Se ve la llamada con subtítulos en vivo, el feedback y el "Sound check" que marca la palabra difícil, y cierra con el precio: sin suscripción, centavos por práctica. Se graba en la Mac con la IA real de publik, porque la app aún no está desplegada. Cada toma cuesta unos $0,05.

Los textos finales y el calendario los lleva la sesión de marketing (`marketing/`). Aquí van la estructura y la lista de tomas.

## La idea en una frase

"Practiqué mi entrevista en inglés con una colega americana, y me mostró qué palabra me cuesta y cómo suena." Es real, es útil y se ve en pantalla.

## Gancho (elige uno; son los 3 primeros segundos)

| # | Texto en pantalla y voz | Por qué funciona |
|---|---|---|
| A | "¿Te congelas cuando te hablan en inglés en el trabajo?" | Dolor directo del público: hispanohablantes que trabajan en inglés |
| B | "Esta app me mostró la palabra que llevo años diciendo mal." | Curiosidad. Se cumple en la toma del Sound check |
| C | "Speak cuesta $17,99 al mes. Yo practico por centavos." | Precio, nuestra bandera. Hay que mostrar la cifra de la App Store con fecha |

Recomendación: **B** para este primer video, porque es lo más visual y nuevo. **C** para el segundo.

## Guion y tomas (unos 35 s)

| Seg. | En pantalla | Acción | Voz de David (español) | Texto sobre el video |
|---|---|---|---|---|
| 0 a 3 | Tu cara | Gancho B | "Esta app me mostró la palabra que llevo años diciendo mal." | "la palabra que digo mal" |
| 3 a 7 | Inicio de Dilo: "Your call with Emily" y "Job interview" | Toca "Start talking" | "Es Dilo. Practicas tu inglés de trabajo en voz alta, como en una llamada." | "Dilo: practica en voz alta" |
| 7 a 13 | La llamada: Emily con su brillo y los subtítulos en vivo | Escucha la pregunta y responde con el micrófono | "Ella me entrevista en inglés y yo respondo con mi voz." | "Una llamada con una colega de EE. UU." |
| 13 a 18 | Feedback: el puntaje y tu frase original tachada ("I am agree…") | Desliza despacio | "Al final me corrige las frases que digo mal sin darme cuenta." | "Te corrige lo que dijiste" |
| 18 a 27 | **Sound check:** las palabras foco en ámbar. Tocas una y aparece su deletreo fonético (por ejemplo "SPEEK") con el tip en español | Toca la palabra, luego "Hear it slowly", y di la frase con "Say it" | "Y aquí está lo mejor: me muestra cómo suena cada palabra y qué sonido me cuesta." | "Así suena en inglés americano" |
| 27 a 31 | Resultado: palabras en verde con ✓ y "Well said!" en amarillo | Plano fijo | "La repito, y listo." | "Dilo bien" |
| 31 a 35 | Tarjeta "Your results" o la racha | Plano fijo | "Sin suscripción: pagas solo lo que practicas, centavos por práctica. Link en la bio." | "Sin suscripción. Centavos por práctica." |

Consejos:
- **Respuesta preparada**, con errores reales y comunes: "I want to espeak about my experience in sales and I am agree with the goals." Así sale una corrección clara. Las palabras foco las elige la app según la frase corregida. Si "speak" no queda en esa frase, usa la palabra que la app marque y ajusta la voz del segundo 18.
- **Corta los silencios** mientras la IA piensa, de 2 a 4 segundos por turno. Si los cortas, pon una nota pequeña: "editado para acortar".
- **Subtítulos:** tu voz en español va con subtítulos; la de Emily ya trae los de la app.

## Honestidad (no negociable)

- **Precio:** no decir "gratis". Decir "sin suscripción" y "centavos por práctica". Si muestras el precio de Speak, usa el de la App Store con la fecha del día y en la moneda de tu público (sección 6 de `COMPETITIVE-ANALYSIS.md`).
- **Sound check:** muestra qué palabras entendió la IA y qué sonidos suelen costarles a los hispanohablantes. **No** mide tu acento sonido por sonido. No decir "la IA analiza tu acento letra por letra".
- **Los colegas** son retratos hechos con IA de personas ficticias. Si alguien pregunta, se dice.
- **IA real, no simulada.** El modo demo tiene feedback fijo y muestra "Demo mode: simulated AI". No se graba en ese modo.

## Cómo grabar mañana en la Mac (unos 10 minutos de preparación)

La app no está desplegada todavía. Se graba en local, con tu clave de publik, que ya está en `.env.local`.

1. En la Terminal, dentro de `apps/english-coach`:

```bash
npm run dev
```

2. Abre Chrome en http://localhost:3000. El micrófono funciona porque es localhost.
3. Activa la vista de teléfono:
   - Ve a Ver > Opciones para desarrolladores > Herramientas para desarrolladores.
   - Pulsa el ícono de teléfono.
   - Elige "iPhone 14 Pro Max" con zoom al 100 %.
4. Usa el modo claro de macOS, que se lee mejor en el feed. Deja la ventana limpia, sin marcadores ni extensiones a la vista.
5. Graba la pantalla:
   - Pulsa Cmd+Shift+5 y elige "Grabar parte seleccionada" sobre el teléfono.
   - En Opciones, activa "Micrófono de MacBook" para que se oigan tu voz y la de Emily.
6. Antes de grabar, haz una práctica completa de ensayo. Así "Your results" y el Sound check ya tienen contenido.
7. Costo: unos $0,05 por práctica completa. Diez tomas son unos $0,50 de tu saldo de publik.

Para grabar en el iPhone, primero hay que desplegar la app con https (pasos en `PUBLIK-SETUP.md`). Sin https, el micrófono del teléfono no funciona contra la IP de tu Mac.

## Segundo y tercer video (ideas que la app ya respalda)

- **"5 palabras que los latinos pronunciamos mal en el trabajo".** Cada una con su deletreo fonético del Sound check:

  | Palabra | Deletreo fonético |
  |---|---|
  | speak | SPEEK |
  | very | VEH-ree |
  | think | THINGK |
  | worked | WERKT |
  | meeting | MEE-ding |
- **Precio (gancho C):** comparación en pesos, con fecha, y la frase "sin plan anual que te amarre".
- **Día 1 contra día 30:** la misma respuesta grabada hoy y dentro de un mes. Hay que guardar la toma de hoy.
