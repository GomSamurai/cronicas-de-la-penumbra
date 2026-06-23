import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Character, AIResponseSchema, GameState, ServiceResponse, TokenUsage } from "../types";

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
        - **CALIDAD LITERARIA**: Escribe prosa de altísima calidad. Evita clichés de RPG. No digas "Te sientes triste", describe el nudo en la garganta y el peso en el pecho. Usa metáforas oscuras.
        - **ESTRUCTURA ORGÁNICA**: La longitud del texto debe ser la necesaria para establecer la escena. NO te limites. Usa varios párrafos si necesitas describir el entorno, el clima y las sensaciones físicas. 
        - **PERSPECTIVA**: Segunda persona ("Caminas", "Ves, "Observas").
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
        ### 3. INSTRUCCIONES DE NARRATIVA (RITMO "SLOW BURN")
        OBJETIVOS DEL TURNO 1 (ESTABLECIMIENTO):
        - MUY IMPORTANTE: NO reveles la trama, ni metas acción o drama directo todavía. El ritmo debe ser muy lento.
        - Ancla al personaje en el pasaje 1: dedica este primer turno SÓLO a establecer la atmósfera, el lugar, el frío, el olor, la sensación física.
        - Sitúa al personaje en un escenario vívido y opresivo acorde a su (posiblemente reinterpretado) arquetipo.
        - Conecta su entorno inmediato con su **Pasado** (Bio). 
        - Crea un inventario inicial lógico (1-4 items) integrado en la narración. Describe su desgaste.
        - Termina el texto simplemente con un pensamiento oscuro o un pequeño detalle (un sonido, el viento, una puerta). NO lances la aventura aún.
        
        DESARROLLO POSTERIOR (TURNOS 2, 3 Y ADELANTE):
        - La trama se debe ir desvelando e intrincando ESPESAMENTE y POCO A POCO a lo largo de varios turnos. No todo tiene que pasar al principio.
        - No corras hacia el conflicto. Deja que el jugador asimile la atmósfera, investigue o camine un poco antes de presentar un objetivo claro.
        - Cada pasaje debe guiar al jugador, dando opciones o decisiones ambiguas, sutiles y coherentes con la historia.

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
        currentPhobias: currentState.phobias || []
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
        DIRECTIVAS DE NARRATIVA ORGÁNICA (CRUCIAL):
        1. **RITMO NATURAL Y "SLOW BURN"**: No fuerces la trama deprisa. La historia se tiene que ir desvelando e intrincando poco a poco.
        2. **DESARROLLO LENTO**: Dedica tiempo a asentar al personaje antes de introducir acción directa, drama intenso o el objetivo principal. Deja que la tensión, la paranoia y el misterio crezcan poco a poco.
        3. **COHERENCIA**: Respeta la física y la lógica del mundo. Si el jugador hace algo estúpido, castígalo con realismo. Si hace algo inteligente, recompénsalo sutilmente.
        4. **NOVELA ADULTA**: Evita tropos de videojuegos ("Encuentras una poción"). Usa lenguaje literario ("Descubres un frasco con un líquido viscoso que huele a almendras amargas").

        ---------------------------------------------------
        SISTEMA DE DAÑO Y CORDURA:
        - Si el jugador recibe daño, DESCRIBE LA HERIDA. El dolor, la sangre, el hueso.
        - Si pierde cordura, describe la intrusión de pensamientos oscuros, temblores o alucinaciones periféricas.
        
        ---------------------------------------------------
        GESTIÓN DE INVENTARIO Y ESTADO:
        - **InventoryUpdates**: Las cosas se rompen. Si usa una espada, mella el filo. Si usa ropa, se rasga.
        - **Traumas**: Si HP < 30%, genera un trauma realista (ej: costilla rota, conmoción).
        - **Fobias**: Si Cordura < 50%, genera una fobia basada en lo que acaba de ver.
        - **MUERTE**: Si HP llega a 0 ("isGameOver": true), describe la muerte final, fría y sin gloria. El cadáver retiene sus heridas (NO limpies traumas).

        ---------------------------------------------------
        DADOS Y DESAFÍOS:
        - Si la acción es arriesgada, genera un 'challenge'. DC Base: 15. Medio: 25. Difícil: 35.

        ---------------------------------------------------
        DIRECTRICES DE ESCRITURA (PRIORIDAD MÁXIMA):
        1. **VARIEDAD ESTRUCTURAL**: ROMPE EL PATRÓN. No escribas siempre 2 párrafos de igual longitud.
           - Si el jugador explora o hay calma: Extiéndete. Usa 3, 4 o 5 párrafos. Describe el polvo, la luz, el olor a podredumbre, los pensamientos intrusivos del personaje.
           - Si hay combate o pánico: Usa frases cortas. Párrafos de una sola línea. Caos. Velocidad.
           - La longitud del texto debe dictarla el ritmo de la escena, NO un límite artificial. Hazlo fluido y orgánico.
        
        2. **TONO ADULTO Y VISCERAL**:
           - La violencia es fea y dolorosa. La gente es compleja.
           - Evita lenguaje de videojuego ("Has ganado 5 puntos"). Intégralo en la narrativa ("Sientes cómo la vitalidad regresa a tus miembros entumecidos").
           - Show, don't tell.

        3. **COHERENCIA NARRATIVA**:
           - Recuerda el inventario y las heridas previas.
           - Las consecuencias deben ser lógicas y a veces injustas.

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
