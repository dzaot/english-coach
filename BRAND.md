# Marca Dilo

> Resumen: Dilo es el colega que te hace ensayar tu inglés de trabajo en voz alta, a un precio mínimo. La marca es cálida y valiente, no infantil ni corporativa. Usa "tres voces" en color plano: naranja (tú), cobalto (tu colega) y lima (lo dijiste bien) sobre tinta, con Unbounded para títulos, una burbuja con barras de voz como símbolo y un set de 17 stickers. Todo está a la vista en `/brand`.

Actualizado: 2026-11-16 (noche, segunda vuelta: marca "tres voces"). Los nombres y colores siguen como "de trabajo" hasta que David elija el nombre final (ver `STATUS.md`).

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

**Dónde nos diferenciamos a la vista:** Praktika y ELSA usan avatares de caricatura 3D sobre degradados morados; todos se parecen. Dilo usa **fotos de colegas americanos** y bloques de color plano (naranja, cobalto y lima). Se siente como una llamada de trabajo real, no como un juego.

## 2. Idea de marca

- **Promesa:** "Dilo en voz alta antes de que importe." Ensayas la entrevista, la reunión o la llamada con un colega de EE. UU., y llegas con las frases ya dichas.
- **Personalidad:** cálida, valiente, práctica, con humor. El compañero de trabajo que está de tu lado. Nunca profesor regañón, nunca juego para niños, nunca banco.
- **Precio como bandera:** pagas solo lo que practicas, unos centavos por práctica, frente a suscripciones mensuales. Los números y fuentes están en `COMPETITIVE-ANALYSIS.md`, sección de precios. Nunca decir "gratis" sin aclarar, ni "mejor que Speak".
- **Lema de trabajo:**
  - EN: "Say it out loud. Sound like you belong."
  - ES: "Dilo en voz alta. Suena como que perteneces."
  - Corto para reels: "Dilo." / "Say it."

## 3. Logo

- **Símbolo:** una burbuja de diálogo con tres barras de voz adentro, en un solo color plano. Sin degradado. Sobre el piso oscuro va naranja con barras tinta; sobre un bloque de color va tinta con las barras del color del bloque.
- **Palabra:** "dilo" en minúsculas, Unbounded Black (900).
- **Archivos:** `public/brand/dilo-icon.svg` y `src/app/icon.svg` (símbolo sobre ficha naranja), `public/brand/dilo-logo.svg` (símbolo y palabra; la palabra necesita la fuente Unbounded instalada, hay que convertirla a trazos antes de imprimir). En la app: `src/components/brand-mark.tsx`.
- **Espacio libre:** el alto de una barra alrededor del símbolo. Tamaño mínimo: 24 px.
- **No:** estirarlo, ponerle degradado o sombra, ni usarlo sobre fotos con mucho detalle.

## 4. Color: "tres voces"

Desde el 2026-11-16 (noche, segunda vuelta) la marca usa **color plano en bloques**: sin degradados, sin brillos, sin desenfoque. La tinta es el piso y cada pantalla abre con un bloque de un color fuerte. Cada color significa algo. Todo se puede ver en `/brand` dentro de la app.

| Voz | Valor | Qué significa | Dónde va |
|---|---|---|---|
| Naranja (`--primary`) | `#FF5A1F` | Tú, diciéndolo | Bloque del inicio, botón principal, micrófono, racha |
| Cobalto (`--cobalt`) | `#2B4BFF` | Tu colega | Bloque de la llamada, sus burbujas, "Today's review" |
| Lima (`--accent`) | `#C8F542` | Lo dijiste bien | Bloque del feedback, palabra que suena, "Say it", aciertos |

| Apoyo | Valor | Uso |
|---|---|---|
| Tinta (`--bg`, `--night`) | `#14110F` | Piso de la app y texto sobre naranja y lima |
| Paneles (`--surface`, `--surface-2`) | `#211C19`, `#2E2723` | Tarjetas y píldoras sobre el piso |
| Crema (`--ink`) | `#FFF4E4` | Texto sobre el piso, opción elegida, borde de los stickers |
| Apagado (`--muted`) | `#BDB2A6` | Texto secundario (9,0:1 sobre el piso, 7,1:1 sobre panel) |
| Sol (`--sun`) | `#FFD23F` | "Casi", letras que faltan, sonidos a cuidar |
| Rosa (`--error`) | `#FF6B86` | Errores y letras que sobran |

Contraste medido (WCAG 2.1): tinta sobre naranja 6,0:1, blanco sobre cobalto 5,9:1, tinta sobre lima 14,9:1, crema sobre tinta 17,3:1. El blanco sobre naranja da 3,1:1: **solo** para la segunda línea del titular (texto grande), nunca para texto normal.

**Nunca solo color:** cada estado lleva icono o texto ("Clear", "Almost", "Not heard").

## 4b. Sistema visual

Referencia: las 28 capturas de GOAT AI Fitness en `Faithlify/GOAT App Screenshots`. Se tomó la estructura (campo de color plano, bloques, píldoras, números enormes, stickers), no el azul.

- **Escenario (`stage`):** el bloque de color que abre cada pantalla. En teléfono llega a los bordes; en escritorio es un bloque redondeado. Clases `stage-orange`, `stage-cobalt`, `stage-lime`.
- **Panel (`panel`):** tarjeta plana sobre el piso, radio de 28 px (`rounded-card`), 20 px adentro (`rounded-tile`). Una idea por tarjeta, sin tarjetas con borde dentro de otra.
- **Píldoras:** todos los botones. Naranja es la acción principal, lima es "Say it", el resto va en panel.
- **Barras de voz (`VoiceField`):** el recurso gráfico de la marca, sacado del logo. Se mueven cuando alguien habla en la llamada y, quietas, son la semana de la racha.
- **Stickers (`src/components/brand/stickers.tsx`):** 17 dibujos planos con borde troquelado, en los tres colores: burbuja, micrófono, onda, llama, chispa, visto, comillas, bombillo, uno por escenario (6), frases, historial y repaso. Son decoración y orientación: siempre van al lado de un texto y ocultos para lectores de pantalla. Lucide queda solo para flechas y controles.
- **Prohibido:** degradados, desenfoque, sombras de color, etiquetas en mayúsculas y texto con degradado.

## 5. Tipografía

| Rol | Fuente | Pesos | Uso |
|---|---|---|---|
| Display | Unbounded (Google Fonts) | 600, 800, 900 | Titulares, nombres, números grandes, logo, títulos pequeños dentro de un panel |
| Texto | Geist (Google Fonts) | 400 a 700 | Todo lo que se lee y se toca: párrafos, botones, subtítulos de la llamada |

Reglas: siempre mayúscula inicial, **nunca todo en mayúsculas**. Los números son lo más grande de la pantalla. Texto mínimo 16 px en móvil; números con cifras tabulares. Unbounded es ancha: en móvil los titulares van a 40 px y parten en varias líneas a propósito.

## 6. Voz y tono

| Situación | Sí | No |
|---|---|---|
| Interfaz (inglés, frases cortas) | "Your turn.", "Say it again.", "Nice. That was clear." | "Congratulations on completing the exercise!" |
| Errores | "We didn't catch that. Try once more." | "Error: invalid input." |
| Apoyo en español (Beginner) | Tuteo, frases de 20 palabras o menos: "Esta s zumba como abeja: zzz." | Términos técnicos sin explicar ("fonema alveolar") |
| Marketing (español) | Hablar como colega latino: "¿Te congelas en las reuniones en inglés? Dilo antes aquí." | Promesas que no cumplimos: "acento nativo en 7 días" |

Reglas fijas: sin guion largo, sin emojis como iconos en la app, sin inventar cifras.

## 7. Movimiento

- **Barras de voz:** detrás de la foto del colega. Se mueven cuando él habla y se vuelven lima cuando hablas tú; un anillo plano sigue tu volumen.
- **Subtítulos en vivo:** la frase del colega se resalta palabra por palabra, en lima, mientras suena.
- **Celebración:** al decir bien una frase aparece la etiqueta "Well said" con una entrada de 360 ms, sin rebote.
- Todo respeta `prefers-reduced-motion`: sin animaciones, solo cambios de estado.

## 8. Cómo se traduce afuera

**Listado en publik:**
- Icono: `public/brand/dilo-icon.svg` (ficha naranja con la burbuja en tinta).
- Nombre: "Dilo".
- Resumen: "Practice your work English out loud with a US coworker. Pay cents per practice." Tiene 78 caracteres; revisar contra el límite de 80 y la regla de "free".
- Captura principal: la pantalla de llamada con subtítulos.

**Instagram en español:**
- Un bloque de color plano por pieza (naranja, cobalto o lima) y titulares en Unbounded, con una palabra en blanco o en tinta. Stickers de la marca como remate.
- La app grabada en pantalla, dentro de un marco de teléfono.
- Portada de reel: una frase en inglés que la gente dice mal, tachada en rosa, y la buena en lima. Ejemplo: ~~"I am agree"~~ → "I agree".
- Firma al final: el símbolo y "Dilo en voz alta".

**Colaboraciones en inglés** (Faithlify, Key Detector): la misma paleta y el lema en inglés.
