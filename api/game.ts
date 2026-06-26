import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Character, AIResponseSchema, GameState, ServiceResponse, TokenUsage } from "../types";

export const maxDuration = 30; // Evita el timeout de 10s de Vercel (máximo en plan gratuito es 60s, pero 30s es seguro)

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

// Defines the strict JSON structure we expect from the AI Game Engine
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: "El texto narrativo. DEBE tener una calidad literaria EXCEPCIONAL. Estilo: Fantasía Oscura, Realismo Sucio, Terror. Denso, sensorial y adulto." },
    hpChange: { type: Type.INTEGER, description: "Daño o curación a la vida ACTUAL." },
    maxHpChange: { type: Type.INTEGER, description: "Cambio a la vida MÁXIMA (Buffs permanentes o maldiciones que reducen el tope). Por defecto 0." },
    sanityChange: { type: Type.INTEGER, description: "Cambio mental." },
    inventoryAdd: {
      type: Type.ARRAY,
      items: { 
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING, description: "Breve descripción lore/atmosférica del objeto." },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Etiquetas de estado (ej: ['Afilada', 'Sagrada'])" }
        },
        required: ["name", "description"]
      },
      description: "Items obtenidos.",
    },
    inventoryRemove: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nombres de items perdidos, consumidos al usar, descartados o transformados." },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre EXACTO del item a actualizar." },
          newDescription: { type: Type.STRING, description: "Nueva descripción si cambia (ej: ahora está rota)." },
          newTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista COMPLETA de tags nueva (ej: ['Mellada', 'Vieja'])." }
        },
        required: ["name"]
      },
      description: "Actualizar estado de items existentes (desgaste, mejora, cambio de estado).",
    },
    newWorldFacts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hechos descubiertos (Lore general)." },
    newThreads: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único corto (ej: 'deuda_gremio')" },
          title: { type: Type.STRING, description: "Título visible (ej: 'Deuda con el Gremio')" },
          description: { type: Type.STRING, description: "Descripción detallada del objetivo o conflicto de este hilo." },
          status: { type: Type.STRING, enum: ['active'] }
        },
        required: ["id", "title", "description", "status"]
      },
      description: "Nuevos hilos narrativos o tramas que se abren en este turno.",
    },
    resolvedThreads: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de hilos que se han resuelto o cerrado en este turno." },
    newTraumas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (ej: 'brazo_roto')" },
          name: { type: Type.STRING, description: "Nombre (ej: 'Cúbito Astillado')" },
          description: { type: Type.STRING, description: "Descripción del dolor y la herida." },
          effect: { type: Type.STRING, description: "Texto descriptivo (ej: '-2 STR')." },
          modifier: {
            type: Type.OBJECT,
            description: "Penalización mecánica ESTRICTA si aplica.",
            properties: {
              attribute: { type: Type.STRING, enum: ["fuerza", "destreza", "constitucion", "inteligencia", "sabiduria", "carisma"] },
              value: { type: Type.INTEGER, description: "Valor negativo (ej: -2)." }
            },
            required: ["attribute", "value"]
          }
        },
        required: ["id", "name", "description", "effect"]
      },
      description: "Traumas físicos graves si HP < 20%.",
    },
    resolvedTraumas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de traumas curados." },
    newPhobias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (ej: 'nyctophobia')" },
          name: { type: Type.STRING, description: "Nombre (ej: 'Miedo a la Oscuridad')" },
          description: { type: Type.STRING, description: "Efecto narrativo (ej: 'Alucinaciones en zonas sin luz.')" },
          trigger: { type: Type.STRING, description: "Condición detonante (ej: 'Oscuridad')" }
        },
        required: ["id", "name", "description", "trigger"]
      },
      description: "Fobias o psicosis si Cordura < 30%.",
    },
    resolvedPhobias: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de fobias superadas." },
    environmentContext: { type: Type.STRING, description: "Notas internas EXCLUSIVAS PARA LA IA. Úsalas para recordar DÓNDE está exactamente el personaje, el tipo de terreno (interior/exterior), salidas posibles y estado de las mismas (ej: 'Habitación cerrada, puerta bloqueada, sin ventanas'). ACTUALIZA este valor en CADA turno para reflejar la posición espacial actual y evitar incoherencias geográficas." },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opciones." },

    isGameOver: { type: Type.BOOLEAN, description: "True si muere." },
    challenge: {
      type: Type.OBJECT,
      description: "Opcional. Incluir SOLO si la acción del usuario es arriesgada y el resultado es incierto.",
      properties: {
        attribute: { type: Type.STRING, enum: ["fuerza", "destreza", "constitucion", "inteligencia", "sabiduria", "carisma"] },
        difficulty: { type: Type.INTEGER, description: "Clase de Dificultad (DC). IMPORTANTE: El sistema suma Atributo Completo (5-19) + D20. Base: 15=Fácil, 25=Medio, 35=Difícil. Ajustarás la dificultad dinámicamente. SI el jugador usa una herramienta adecuada o narra una buena estrategia, REDUCE la dificultad en 1-5 puntos." },
        context: { type: Type.STRING, description: "Razón corta de la tirada, ej: 'Esquivar el golpe'" }
      },
      required: ["attribute", "difficulty", "context"]
    }
  },
  required: ["narrative", "hpChange", "sanityChange", "inventoryAdd", "inventoryRemove", "newWorldFacts", "suggestedActions", "isGameOver"],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, payload } = req.body;

  try {
    if (type === 'startAdventure') {
      const character = payload as Character;
      const prompt = `
        Eres el Director de Juego (Game Master) de una novela interactiva de **BAJA FANTASÍA MEDIEVAL (LOW FANTASY)** y Terror.

        DATOS PROPUESTOS POR EL JUGADOR:
        - Nombre: "${character.name}"
        - Arquetipo/Concepto Propuesto: "${character.archetype}"
        - Bio/Pasado: "${character.bio}"
        - Atributos: ${JSON.stringify(character.attributes)}

        ----------------------------------------------------------------------
        ### 1. REGLAS ABSOLUTAS DEL MUNDO (LA BIBLIA DEL ENTORNO)
        Este mundo NO es D&D ni Alta Fantasía.
        - **Tecnología**: Estancada. Acero, cuero, fuego, suciedad. NO hay pistolas, no hay electricidad, no hay cibernética.
        - **Magia**: Es rara, corrupta, ritualista y peligrosa. No se lanzan bolas de fuego por los dedos.
        - **Cosmología**: NO hay viajes entre planos accesibles. Nadie "camina entre dimensiones". La gente nace, sufre en el barro y muere.
        - **CALIDAD LITERARIA Y ESTILO DIRECTO**: Escribe prosa de altísima calidad, seca, cruda y adulta. **EVITA ROTUNDAMENTE LA RETÓRICA INFANTIL Y LOS RODEOS**. No uses descripciones en negativo o comparativas inútiles (EJEMPLO PROHIBIDO: "El aire no olía a flores, sino a podredumbre" o "La noche no era tranquila, sino aterradora"). Lo que es, es; y lo que no es, no se menciona. Di directamente "El aire apesta a podredumbre" o "La noche está plagada de aullidos". Sé directo, clínico y sensorial.
        - **ESTRUCTURA ORGÁNICA**: La longitud del texto debe ser la necesaria para establecer la escena. NO te limites. Usa varios párrafos si necesitas describir el entorno, el clima y las sensaciones físicas. 
        - **PERSPECTIVA Y TIEMPO (CRUCIAL)**: Escribe SIEMPRE en segunda persona del singular y en tiempo PRESENTE ("Caminas", "Ves", "Sientes"). NUNCA uses tercera persona ("Barnaby se arrastró") ni tiempo pasado.
        - **TONO**: Adulto, crudo, atmosférico. La esperanza es escasa.
        - **SIN CENSURA**: La violencia y el horror deben ser descritos con frialdad clínica o metáforas grotescas.
        - **HILO**: La IA mantendrá siempre el hilo conductor de forma inteligente para que la historia tenga sentido y un final a largo plazo.

        ----------------------------------------------------------------------
        ### 2. PROTOCOLO DE SANEAMIENTO DE PERSONAJE (PRIORIDAD MÁXIMA)
        El jugador puede intentar introducir conceptos que rompen el tono (Anacronismos, Sci-Fi, Alta Fantasía).
        TU TAREA ES REINTERPRETARLOS AGRESIVAMENTE para que encajen en la **Baja Fantasía**.

        **CASOS DE EJEMPLO (Aplícalos si el input se parece):**
        A. **INPUT: "Psiconauta / Viajero de Planos / Caminante Astral"**
           -> **INTERPRETACIÓN REAL**: Es un adicto a las drogas (Láudano, Hongos) o un loco que sufre alucinaciones vívidas.
           -> **NARRATIVA**: No está en "otro plano"; está tirado en un callejón babeando. El mundo lo trata como un demente o un yonqui.

        B. **INPUT: "Astronauta / Viajero del Tiempo / Alienígena"**
           -> **INTERPRETACIÓN REAL**: Un forastero loco que habla una lengua extraña y viste harapos raros, o un astrólogo herético obsesionado con las estrellas que ha perdido la razón.
        
        C. **INPUT: "Hacker / Ingeniero"**
           -> **INTERPRETACIÓN REAL**: Un cerrajero experto o un escriba capaz de descifrar códigos antiguos.

        D. **INPUT: "Marine / Soldado Moderno"**
           -> **INTERPRETACIÓN REAL**: Un mercenario veterano con TEPT (Estrés Postraumático) de guerras brutales con espada y escudo.

        **IMPORTANTE**: Nunca rompas la cuarta pared diciendo "No puedes ser eso". Simplemente narra la realidad sucia de su concepto reinterpretado. Si dice que viaja por planos, narra cómo se despierta de un trance inducido por hierbas en un sótano húmedo.

        ----------------------------------------------------------------------
        ### 3. ESTILO LITERARIO Y RITMO NARRATIVO (CRUCIAL)
        Eres un escritor de Dark Fantasy cruda y realista (estilo Joe Abercrombie, George R.R. Martin, Kentaro Miura). Tu prosa debe ser afilada, inmersiva y madura.
        
        OBJETIVOS DEL TURNO 1 (ESTABLECIMIENTO Y VARIEDAD):
        - **PROHIBIDO EMPEZAR DESPERTANDO O CON AMNESIA**: JAMÁS empieces la historia con el personaje despertando, levantándose de un colchón, abriendo los ojos, o sin saber dónde está. El personaje sabe perfectamente quién es, qué hace ahí y cuál es su objetivo.
        - **IN MEDIA RES (ACCIÓN INMEDIATA)**: Sitúalo en MEDIO DE UNA ACCIÓN o situación tensa en un lugar que grite su pasado. Si es un cazarrecompensas, está rastreando sangre bajo la lluvia; si es un médico, está intentando coser a un moribundo en un carro en movimiento; si es un ladrón, está huyendo por los tejados. **NUNCA lo pongas estático en una habitación cerrada a menos que sea vital para su historia.**
        - **INTEGRACIÓN DEL BIO (CONTEXTO ABSOLUTO)**: Explica orgánicamente a través de la narración por qué está ahí, cuál es su misión actual, sus lesiones previas o su objetivo. No dejes que el lector se pregunte "qué hago aquí". Entrelaza su pasado con el presente de forma directa.
        - Describe la incomodidad, la temperatura o el olor del ambiente mientras realiza esa acción (Recuerda: directo, sin rodeos).
        - Crea un inventario inicial lógico (1-4 items) integrado en la narración. Describe su estado material (óxido, desgaste, humedad).
        - **IMPORTANTE: EL INVENTARIO DEBE SER ÚNICO Y BASADO ESTRICTAMENTE EN LA PROFESIÓN/PASADO.** No le des a todos los personajes los mismos items genéricos. Un caballero tendrá una espada mellada; un mendigo, un mendrugo de pan con moho; un cirujano, sus herramientas manchadas. Jamás incluyas Láudano a menos que el personaje sea explícitamente un médico, alquimista o adicto.
        - **CIERRE DEL TURNO**: Termina tu narración de forma natural. Presenta el entorno y deja que el jugador decida su primer paso. NO fuerces un evento de acción inmediato ni un "cliffhanger" barato.
        - **MEMORIA ESPACIAL (environmentContext)**: Rellena el campo 'environmentContext' del JSON con las características físicas exactas de donde lo acabas de situar (interior/exterior, clima, salidas, barreras).

        DESARROLLO POSTERIOR:
        - La trama debe desvelarse orgánicamente. Deja que el jugador asimile la atmósfera e investigue antes de presentar conflictos letales o el objetivo principal.
        - **CALIDAD DE LAS OPCIONES (suggestedActions)**: Las opciones deben ser relevantes, avanzar la historia o invitar a investigar pistas cruciales. Está PROHIBIDO ofrecer acciones triviales, aburridas o inútiles (ej. "Beber agua", "Mirar una pared", "Esperar"). Cada opción debe tener un propósito narrativo interesante.

        ----------------------------------------------------------------------
        OBJETIVOS DEL JUEGO (FIN DE LA AVENTURA):
        - La misión es no morir mientras se intenta completa el objetivo final (el objetivo final dependerá del personaje elegido).
        - Si se consigue el objetivo final se creará un último pasaje final de la historia para terminar la novela.

        Genera el JSON siguiendo el esquema estricto.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const usage: TokenUsage = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return res.status(200).json({ data: JSON.parse(text), usage });
    }

    if (type === 'nextTurn') {
      const { action, currentState } = payload as { action: string, currentState: GameState };
      const context = {
        hp: currentState.hp,
        maxHp: currentState.maxHp,
        sanity: currentState.sanity,
        inventory: currentState.inventory.map(i => ({ name: i.name, desc: i.description, tags: i.tags })),
        knownFacts: currentState.worldFacts,
        activeThreads: currentState.activeThreads.map(t => ({ id: t.id, title: t.title, desc: t.description })), 
        character: currentState.character,
        currentTraumas: currentState.traumas || [], 
        currentPhobias: currentState.phobias || [],
        environmentContext: currentState.environmentContext || "Desconocido"
      };

      const prompt = `
        Eres el motor narrativo de una novela interactiva de **BAJA FANTASÍA OSCURA Y REALISTA**.
        
        CONTEXTO MECÁNICO: ${JSON.stringify(context)}
        HISTORIA PREVIA (Último párrafo): ${currentState.currentTurn?.narrative || "Inicio"}
        ACCIÓN DEL JUGADOR: "${action}"
        TURNO ACTUAL: ${currentState.turnCount + 1}

        ---------------------------------------------------
        ### FILTRO DE REALIDAD (CRUCIAL)
        El jugador puede intentar realizar acciones imposibles o fantásticas basándose en su arquetipo (ej: "Uso mis poderes psíquicos", "Saco mi pistola láser", "Viajo al plano astral").
        
        **TU REACCIÓN DEBE SER:**
        1. **NO** permitas que suceda la fantasía.
        2. **REINTERPRETA** la acción en el contexto físico y sucio del mundo.
           - Si intenta "usar poderes mentales": Narra cómo se concentra hasta que le sangra la nariz, pero solo logra parecer un estreñido ante los demás. O tal vez tiene una alucinación, pero en la realidad no pasa nada.
           - Si intenta "sacar tecnología": Narra cómo busca frenéticamente en sus bolsillos y solo encuentra polvo o un objeto inútil (una piedra, un hueso).
           - Si intenta "viajar entre planos": Narra cómo se desmaya o consume una sustancia, cayendo indefenso al suelo mientras el mundo real sigue siendo peligroso a su alrededor.

        ---------------------------------------------------
        DIRECTIVAS DE ESTILO Y NARRATIVA (CRUCIAL):
        Eres un novelista de Fantasía Oscura y Terror de Supervivencia. Tu estilo debe ser crudo, pragmático, sensorial y maduro.
        
        1. **RITMO Y DESARROLLO (SLOW BURN)**:
           - Construye la tensión orgánicamente. No satures cada turno con eventos extremos o combates. 
           - Deja espacio para la paranoia, la logística (curar heridas, reparar armas) y la exploración silenciosa.
           - Si el jugador hace algo estúpido, aplica consecuencias lógicas y letales. Si es astuto, recompénsalo de forma sutil.

        2. **CALIDAD LITERARIA, ESTILO DIRECTO Y TONO VISCERAL**:
           - Escribe con calidad excepcional. La violencia es dolorosa, sucia y carente de gloria.
           - **EVITA LA RETÓRICA INFANTIL**: Está PROHIBIDO usar formulaciones como "No era X, sino Y" o "No olía a A, sino a B". Sé directo, crudo y asertivo. No des rodeos para explicar algo; lo que es, es, y lo que no es, no se menciona. Di "Huele a óxido y heces", no "El aire no olía a limpio, sino a...".
           - Emplea el "Show, don't tell". No digas "el monstruo da miedo", describe su anatomía aberrante, su olor a podredumbre y cómo se mueve.
           - Adapta la longitud de tus respuestas al momento: usa párrafos detallados para la calma tensa; usa frases cortas y contundentes para el combate y el pánico.
           - **CONCISIÓN EN LO MUNDANO (LEY ESTRICTA)**: Si el personaje encuentra un objeto común (una aguja, una moneda) o bebe agua, **sé extremadamente directo y conciso (1 o 2 frases máximo)**. Está TERMINANTEMENTE PROHIBIDO escribir grandes parrafadas literarias, poéticas o dramáticas para describir una simple aguja o el acto de beber agua normal. Reserva el lenguaje extenso para descubrimientos terroríficos, combates o giros clave.

        3. **PERSPECTIVA Y TIEMPO (LEY ABSOLUTA)**:
           - Tienes que escribir SIEMPRE en segunda persona del singular y en tiempo PRESENTE ("Miras a tu alrededor", "El frío cala tus huesos", "Esquivas el golpe").
           - ESTÁ TOTALMENTE PROHIBIDO usar la tercera persona o el tiempo pasado ("Barnaby se arrastró", "Miró a su alrededor"). Dirígete directamente al jugador como el protagonista que lo está viviendo AHORA.

        4. **CALIDAD Y COHERENCIA DE OPCIONES (suggestedActions)**:
           - Las opciones deben avanzar la trama, plantear un dilema, o invitar a una investigación relevante. Deben ser **INTERESANTES** para la historia.
           - ESTÁ PROHIBIDO sugerir acciones triviales, aburridas o inútiles (ej. "Beber agua", "Mirar un cuchillo", "Esperar sin motivo"). Cada opción debe tener peso narrativo.
           - Las opciones no tienen que estar limitadas rígidamente a lo recién descrito; pueden proponer acciones que sean lógicas, obvias o naturales dado el contexto (ej: "Buscar una salida", "Registrar los muebles en busca de pistas", "Avanzar por el pasillo"), siempre que mantengan la coherencia y relevancia de la historia.

        5. **FINALES DE TURNO NATURALES**:
           - **VARIEDAD**: No uses la misma fórmula para terminar tus respuestas. 
           - Deja que las acciones concluyan de forma lógica. A veces un turno termina simplemente porque una puerta está cerrada, porque empieza a llover o porque el personaje necesita descansar. 
           - No recurras a "cliffhangers" forzados (como un ruido inoportuno o una sombra en la esquina) en cada turno para obligar al jugador a reaccionar. Que el peso de la decisión caiga en los hombros del jugador en un mundo indiferente.

        ---------------------------------------------------
        SISTEMA DE DAÑO Y CORDURA (MUY IMPORTANTE):
        - **Daño Físico**: Si recibe daño, descríbelo de forma clínica: crujido de huesos, desgarro de tejido, sabor a sangre.
        - **LEY DE LA CORDURA (SANITY)**: La Cordura representa el aguante mental y NO es un temporizador. NO reduzcas la cordura por el mero paso del tiempo o por la exploración normal.
           * **Pérdida (Negativo)**: Resta cordura SOLO al enfrentarse a horrores innombrables, gore extremo, usar magia corrupta o desesperación profunda.
           * **Recuperación (Positivo)**: El jugador RECUPERA cordura (+2, +5) si descansa en un lugar seguro, consume alcohol/drogas, fuma, o resuelve un misterio. ¡Premia las acciones que den esperanza o relajación!
           * **Nota sobre Vicios**: Si usa drogas o alcohol para recuperar cordura, añade un pequeño 'Trauma' temporal para reflejar los efectos secundarios (ej. 'Ebrio: -2 Destreza').
        - **Erosión Mental**: Cuando pierda cordura, describe la confusión, la paranoia o las alucinaciones.
        
        ---------------------------------------------------
        GESTIÓN DE INVENTARIO Y ESTADO:
        - **InventoryUpdates**: Todo se desgasta. Si usa una herramienta o arma, mella el filo, abolla el metal o gasta el recurso.
        - **Traumas**: Si HP < 30%, genera un trauma grave (ej: costilla fracturada, hemorragia, conmoción).
        - **Fobias**: Si Cordura < 50%, genera una paranoia o fobia ligada al trauma reciente.
        - **MUERTE**: Si HP llega a 0 ("isGameOver": true), describe la agonía y la muerte sin tapujos ni esperanza. El cadáver retiene sus traumas (no los borres).

        ---------------------------------------------------
        DADOS Y DESAFÍOS:
        - Si la acción es arriesgada y el resultado incierto, genera un 'challenge'. DC Base: 15. Medio: 25. Difícil: 35.

        ---------------------------------------------------
        COHERENCIA Y CONSECUENCIAS (MEMORIA ESPACIAL):
        - **Entorno Actual ('environmentContext' del CONTEXTO MECÁNICO)**: Este campo contiene tus notas internas del lugar exacto donde está el personaje. LÉELO antes de narrar. Si está encerrado en una habitación, NO puede estar de repente en un prado con hierba sin haber abierto la puerta y salido.
        - **Actualización**: Si el jugador cambia de habitación o ubicación en este turno, ACTUALIZA tu propio campo 'environmentContext' en la respuesta JSON para reflejar el nuevo lugar. Si no se mueve, mantén o amplía la descripción del lugar actual. Mantén un registro estricto de salidas, barreras y luces.
        - Mantén un registro mental estricto del entorno. Si el jugador soltó una antorcha, la sala está a oscuras. Si tiene una pierna rota, no puede correr.

        ---------------------------------------------------
        REGLAS DE SISTEMA (MECÁNICAS):
        1. **INTERACCIÓN CON ITEMS**:
           - [USAR], [TIRAR], [COMBINAR], [INSPECCIONAR]: Gestiona estas acciones lógicamente.

        2. **DADOS Y DIFICULTAD (IMPORTANTE)**: 
           - Si la acción del usuario es incierta, genera un objeto "challenge".
           - Usa la siguiente guía de atributos y habilidades para elegir el 'attribute' correcto:
             * **FUERZA**: Atletismo (trepar, saltar, nadar, romper).
             * **DESTREZA**: Acrobacias, Juego de Manos, Sigilo.
             * **CONSTITUCION**: Resistencia pura (venenos, correr mucho tiempo).
             * **INTELIGENCIA**: Historia, Investigación, Naturaleza, Religión.
             * **SABIDURIA**: Trato con Animales, Intuición, Medicina, Percepción, Supervivencia.
             * **CARISMA**: Engaño, Intimidación, Persuasión, Representación.
           
           - El jugador suma su Atributo Completo (ej. 5-19) + 1d20.
           - Por tanto, las Dificultades (DC) deben ser ajustadas dinámicamente. 
        
        3. **ESTADÍSTICAS**: Ajusta 'hpChange' y 'sanityChange' acorde a lo narrado.

        Genera el JSON de respuesta.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const usage: TokenUsage = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return res.status(200).json({ data: JSON.parse(text), usage });
    }

    return res.status(400).json({ error: 'Unknown action type' });
  } catch (error: any) {
    console.error("Error in API route:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
