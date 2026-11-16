# Marca Dilo

> Resumen: Dilo es el colega que te hace ensayar tu inglés de trabajo en voz alta, a un precio mínimo. La marca es cálida y valiente, no infantil ni corporativa. Usa el "atardecer sobre la noche": coral y sol sobre un azul noche, con una burbuja de voz como símbolo. Sirve igual para la app, el listado en publik y el Instagram en español.

Actualizado: 2026-11-16. Los nombres y colores siguen como "de trabajo" hasta que David elija el nombre final (ver `STATUS.md`).

## 1. Qué aprendimos de los mejores (investigación del 2026-11-16)

Fuentes: Dribbble (búsquedas "language learning app", "ai voice tutor app", "speaking app", "pronunciation"), Awwwards (nominados de "language learning", por ejemplo Senthora, AI Language Tutor), la web de BoldVoice y las capturas de la App Store (EE. UU.) de Speak, ELSA, BoldVoice, Praktika y Duolingo.

| Referencia | Qué hace muy bien | Qué tomamos para Dilo |
|---|---|---|
| Speak (App Store) | Pantalla de práctica casi vacía: una frase enorme, la traducción pequeña debajo y una píldora "Speak now". Contadores de progreso en tu idioma: frases dichas, días de racha | Frase grande y una sola acción por pantalla. Contador "palabras dichas en inglés" |
| BoldVoice (App Store y web) | Cada palabra se parte en sonidos con colores y porcentaje; "You said OW" frente al sonido correcto; botón "Quick fix" con un coach. Fondo oscuro y un color fuerte por pantalla | Desglose por palabra con sonidos difíciles, en colores **con texto**, y un consejo corto en español por sonido |
| ELSA (App Store) | Pentágono de habilidades (pronunciación, fluidez, gramática, vocabulario, entonación) y nivel CEFR. Tareas visibles dentro del roleplay | Panel de progreso que muestra resultados en el tiempo. Objetivos visibles por práctica (siguiente paso) |
| Praktika (App Store) | El tutor ocupa toda la pantalla, como una videollamada, y la conversación flota encima. Racha con fuego gigante | La práctica se ve como una **llamada** con tu colega, con subtítulos en vivo |
| Talkio (Dribbble, IMRAN) | Un solo botón grande "Start speaking", orbe cálido que brilla, meta diaria en minutos | Inicio con una sola acción clara y una meta diaria |
| Online Learning App (Dribbble, Nixtio) | Video grande con la frase del profesor resaltada palabra por palabra | Subtítulos tipo karaoke mientras habla tu colega |
| Duolingo (App Store) | Botones gruesos, celebraciones, personajes con actitud | Celebración breve cuando lo dices bien (sin infantilizar) |

**Dónde nos diferenciamos a la vista:** Praktika y ELSA usan avatares de caricatura 3D sobre degradados morados; todos se parecen. Dilo usa **fotos de colegas americanos** y una paleta cálida de atardecer. Se siente como una llamada de trabajo real, no como un juego.

## 2. Idea de marca

- **Promesa:** "Dilo en voz alta antes de que importe." Ensayas la entrevista, la reunión o la llamada con un colega de EE. UU., y llegas con las frases ya dichas.
- **Personalidad:** cálida, valiente, práctica, con humor. El compañero de trabajo que está de tu lado. Nunca profesor regañón, nunca juego para niños, nunca banco.
- **Precio como bandera:** pagas solo lo que practicas, unos centavos por práctica, frente a suscripciones mensuales. Los números y fuentes están en `COMPETITIVE-ANALYSIS.md`, sección de precios. Nunca decir "gratis" sin aclarar, ni "mejor que Speak".
- **Lema de trabajo:**
  - EN: "Say it out loud. Sound like you belong."
  - ES: "Dilo en voz alta. Suena como que perteneces."
  - Corto para reels: "Dilo." / "Say it."

## 3. Logo

- **Símbolo:** una burbuja de diálogo con tres barras de voz adentro, en degradado de coral a sol. Es "decir algo" y "voz" al mismo tiempo. Archivos: `public/brand/dilo-icon.svg` (símbolo), `src/app/icon.svg` (favicon) y `public/brand/dilo-logo.svg` (símbolo y palabra).
- **Palabra:** "dilo" en minúsculas, Bricolage Grotesque ExtraBold, interletrado normal.
- **Espacio libre:** el alto de una barra alrededor del símbolo. Tamaño mínimo: 24 px.
- **No:** estirarlo, cambiar el degradado por otros colores, ponerle sombra o usarlo sobre fotos con mucho detalle.

## 4. Color

Paleta "atardecer sobre la noche". El contraste se revisó con la fórmula de WCAG 2.1 (texto normal a 4,5:1 como mínimo).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| Noche (`--ink` / fondo oscuro) | `#1A1530` | `#120F22` | Texto principal, fondo del modo oscuro, fondo de los reels |
| Papel (`--bg` claro) | `#FFF8F0` | | Fondo claro, cálido |
| Coral Dilo (`--primary`) | `#D63A17` (blanco encima: 4,69:1) | `#FF7A55` (noche encima: 6,84:1) | Botón principal, micrófono, marca |
| Coral de marca (gráficos) | `#FF5B3A` | `#FF5B3A` | Logo, degradados, ilustración; no para texto pequeño |
| Sol (`--sun`) | `#FFC233` (noche encima: 10,9:1) | `#FFD15C` | Racha, celebraciones, resaltados |
| Menta (`--accent`) | `#12805C` | `#4FD6A4` | "Se te entendió", aciertos, escuchando |
| Ámbar (`--warn`) | `#8A4B00` sobre `#FFF0D1` | `#FFC46B` sobre `#3A2A10` | "Casi", sonidos a cuidar |
| Rojo (`--error`) | `#C4291C` | `#FF8A80` | Errores y "no se entendió" |
| Cielo (`--sky`) | `#3559E0` | `#8FA8FF` | Enlaces secundarios y la voz del colega |

**Degradado de marca:** coral `#FF5B3A` a sol `#FFC233`, en diagonal. Va en el símbolo, el orbe de voz y los fondos de los reels. Una vez por pantalla, no más.

**Nunca solo color:** cada estado lleva icono o texto ("Clear", "Almost", "Not heard").

## 5. Tipografía

| Rol | Fuente | Pesos | Uso |
|---|---|---|---|
| Display | Bricolage Grotesque (Google Fonts) | 700, 800 | Titulares, números grandes, logo, textos de reels |
| Texto | Plus Jakarta Sans (Google Fonts) | 400, 500, 600, 700 | Interfaz, párrafos, botones |

Escala: 12 / 14 / 16 / 18 / 24 / 32 / 48 px. Texto mínimo 16 px en móvil; números con cifras tabulares.

## 6. Voz y tono

| Situación | Sí | No |
|---|---|---|
| Interfaz (inglés, frases cortas) | "Your turn.", "Say it again.", "Nice. That was clear." | "Congratulations on completing the exercise!" |
| Errores | "We didn't catch that. Try once more." | "Error: invalid input." |
| Apoyo en español (Beginner) | Tuteo, frases de 20 palabras o menos: "Esta s zumba como abeja: zzz." | Términos técnicos sin explicar ("fonema alveolar") |
| Marketing (español) | Hablar como colega latino: "¿Te congelas en las reuniones en inglés? Dilo antes aquí." | Promesas que no cumplimos: "acento nativo en 7 días" |

Reglas fijas: sin guion largo, sin emojis como iconos en la app, sin inventar cifras.

## 7. Movimiento

- **Orbe de voz:** un círculo con el degradado de marca detrás de la foto del colega. Late cuando él habla y sigue tu volumen cuando hablas tú.
- **Subtítulos en vivo:** la frase del colega se resalta palabra por palabra mientras suena.
- **Celebración:** al decir bien una frase, la palabra pasa a menta y aparece un destello de sol de 600 ms.
- Todo respeta `prefers-reduced-motion`: sin animaciones, solo cambios de estado.

## 8. Cómo se traduce afuera

**Listado en publik:**
- Icono: `public/brand/dilo-icon.svg` sobre fondo Noche.
- Nombre: "Dilo".
- Resumen: "Practice your work English out loud with a US coworker. Pay cents per practice." Tiene 78 caracteres; revisar contra el límite de 80 y la regla de "free".
- Captura principal: la pantalla de llamada con subtítulos.

**Instagram en español:**
- Fondo Noche y titulares en Bricolage Grotesque blanco, con una palabra en sol.
- La app grabada en pantalla, dentro de un marco de teléfono.
- Portada de reel: una frase en inglés que la gente dice mal, tachada en rojo, y la buena en menta. Ejemplo: ~~"I am agree"~~ → "I agree".
- Firma al final: el símbolo y "Dilo en voz alta".

**Colaboraciones en inglés** (Faithlify, Key Detector): la misma paleta y el lema en inglés.
