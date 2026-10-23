import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Character, GameState, TokenUsage } from "../types";

export const maxDuration = 30; // Evita el timeout de Vercel

function getAi(customApiKey?: string) {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No hay ninguna clave de API configurada en el servidor ni en tu navegador. Introduce tu clave gratuita de Google Gemini en el menú de Ajustes.");
  }
  return new GoogleGenAI({ apiKey });
}

function resolveModel(modelName?: string) {
  const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-2.5-pro'];
  if (modelName && ALLOWED_MODELS.includes(modelName)) {
    return modelName;
  }
  return 'gemini-2.5-flash';
}


// Defines the strict JSON structure we expect from the AI Game Engine
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { 
      type: Type.STRING, 
      description: "El texto narrativo del pasaje. DEBE tener una calidad literaria EXCEPCIONAL. Estilo: Baja Fantasía Oscura, Realismo Sucio, Terror Psicológico y Físico. Prosa sensorial, despiadada, adulta y directa en SEGUNDA PERSONA DEL SINGULAR y TIEMPO PRESENTE." 
    },
    tensionLevel: {
      type: Type.STRING,
      enum: ['calma', 'sospecha', 'tension', 'peligro', 'combate', 'agonico'],
      description: "Nivel de tensión dramática del momento: 'calma' (respiro/recomponerse), 'sospecha' (duda, misterio, desconfianza), 'tension' (sigilo, cuenta atrás, opresión), 'peligro' (trampa, emboscada o encrucijada violenta), 'combate' (choque físico directo, violencia descarnada), 'agonico' (al borde de la muerte o el colapso mental)."
    },
    locationUpdate: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "ID corto del lugar (ej: 'fosa_san_jude', 'callejon_tintoreros')" },
        name: { type: Type.STRING, description: "Nombre visible y evocador del lugar (ej: 'Fosa Común de San Jude')" },
        description: { type: Type.STRING, description: "Breve atmósfera sensorial del lugar físico actual (1-2 frases)." },
        lighting: { type: Type.STRING, enum: ['oscuridad_total', 'penumbra', 'antorchas', 'luz_de_dia'] },
        dangerLevel: { type: Type.STRING, enum: ['seguro', 'inquietante', 'letal'] },
        exits: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "Lista de salidas o caminos posibles (ej: ['Reja norte cerrada con candado', 'Camino este con patrulla'])." 
        },
        connectedLocations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "IDs o nombres de ubicaciones adyacentes conectadas a este nodo cartográfico."
        }
      },
      required: ["id", "name", "description", "lighting", "dangerLevel", "exits"],
      description: "Datos cartográficos y sensoriales de la ubicación actual."
    },
    newNpcs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único del PNJ (ej: 'enterrador_cojo', 'guardia_sobornado')" },
          name: { type: Type.STRING, description: "Nombre visible o apodo del PNJ (ej: 'Garrick el Tuerto')" },
          role: { type: Type.STRING, description: "Profesión o función (ej: 'Enterrador cómplice', 'Guardia de la ronda')" },
          description: { type: Type.STRING, description: "Rasgos físicos memorables y actitud (ej: 'Dientes podridos, cojera visible, mirada huidiza')." },
          status: { type: Type.STRING, enum: ['vivo', 'herido', 'inconsciente', 'muerto', 'desaparecido'] },
          relationship: { type: Type.STRING, enum: ['aliado', 'favorable', 'neutral', 'sospechoso', 'hostil', 'enemigo_mortal'] },
          notes: { type: Type.STRING, description: "Secreto, deuda o información clave sobre su relación contigo." },
          location: { type: Type.STRING, description: "Dónde se encuentra o 'en_grupo' si te acompaña." }
        },
        required: ["id", "name", "role", "description", "status", "relationship"]
      },
      description: "Nuevos PNJs que interactúan o se presentan con relevancia en este pasaje."
    },
    npcUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID del PNJ a actualizar." },
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['vivo', 'herido', 'inconsciente', 'muerto', 'desaparecido'] },
          relationship: { type: Type.STRING, enum: ['aliado', 'favorable', 'neutral', 'sospechoso', 'hostil', 'enemigo_mortal'] },
          notes: { type: Type.STRING },
          location: { type: Type.STRING }
        },
        required: ["id"]
      },
      description: "Actualizaciones de estado, heridas, lealtad o ubicación de PNJs existentes."
    },
    hpChange: { type: Type.INTEGER, description: "Daño o curación a la vida ACTUAL (negativo para daño, positivo para curación)." },
    maxHpChange: { type: Type.INTEGER, description: "Cambio a la vida MÁXIMA (maldiciones que reducen el tope o secuelas permanentes). Por defecto 0." },
    sanityChange: { type: Type.INTEGER, description: "Cambio de cordura (negativo ante horrores/gore/desesperación; positivo (+2 a +5) si descansa, fuma, bebe alcohol o resuelve un misterio)." },
    inventoryAdd: {
      type: Type.ARRAY,
      items: { 
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre del objeto." },
          description: { type: Type.STRING, description: "Breve descripción tangible, atmosférica y material del objeto." },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Etiquetas de estado y desgaste (ej: ['Mellada', 'Oxidada', 'Húmeda'])." }
        },
        required: ["name", "description"]
      },
      description: "Objetos obtenidos o despojados en este pasaje.",
    },
    inventoryRemove: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Nombres EXACTOS de items perdidos, consumidos, rotos irreparablemente o descartados." 
    },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre EXACTO del item a actualizar." },
          newDescription: { type: Type.STRING, description: "Nueva descripción reflejando su estado actual." },
          newTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista COMPLETA de etiquetas actualizada reflejando entropía." }
        },
        required: ["name"]
      },
      description: "Actualizar estado de items existentes por desgaste, rotura, uso parcial o transformación.",
    },
    newWorldFacts: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Hechos concretos descubiertos en este pasaje (pistas, nombres de lugares, reglas del entorno, verdades crueles)." 
    },
    newThreads: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único corto (ej: 'sospecha_sepulturero', 'deuda_gremio')" },
          title: { type: Type.STRING, description: "Título visible en la interfaz (ej: 'El Secreto del Sepulturero')" },
          description: { type: Type.STRING, description: "Descripción detallada del conflicto, objetivo o enigma de este hilo." },
          status: { type: Type.STRING, enum: ['active'] }
        },
        required: ["id", "title", "description", "status"]
      },
      description: "Nuevas tramas, dilemas o misterios que se abren en este turno.",
    },
    resolvedThreads: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "IDs de hilos que se han resuelto, concluido o fracasado definitivamente en este turno." 
    },
    newTraumas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (ej: 'costilla_fracturada', 'ojo_morado')" },
          name: { type: Type.STRING, description: "Nombre de la herida (ej: 'Costilla Fracturada')" },
          description: { type: Type.STRING, description: "Descripción del dolor físico y la limitación." },
          effect: { type: Type.STRING, description: "Resumen visible (ej: '-2 STR')." },
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
      description: "Traumas físicos graves si HP < 30% o tras impactos brutales.",
    },
    resolvedTraumas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de traumas curados o entablillados." },
    newPhobias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (ej: 'claustrofobia', 'alucinacion_susurros')" },
          name: { type: Type.STRING, description: "Nombre de la afección mental (ej: 'Terror a la Sombra')" },
          description: { type: Type.STRING, description: "Efecto narrativo psicológico." },
          trigger: { type: Type.STRING, description: "Estímulo detonante (ej: 'Apagar la antorcha', 'Espacios angostos')" }
        },
        required: ["id", "name", "description", "trigger"]
      },
      description: "Fobias, paranoias o neurosis si Cordura < 50%.",
    },
    resolvedPhobias: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de fobias superadas." },
    newConditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID único (ej: 'hemorragia_muslo', 'intoxicacion_esporas', 'agotamiento_fardos', 'panico_sombra')" },
          name: { type: Type.STRING, description: "Nombre visible (ej: 'Hemorragia Profunda', 'Intoxicación por Miasma', 'Agotamiento', 'Pánico Desbocado')" },
          description: { type: Type.STRING, description: "Efecto táctico inmediato sobre el personaje." },
          type: { type: Type.STRING, enum: ['hemorragia', 'intoxicacion', 'agotamiento', 'panico'] },
          severity: { type: Type.STRING, enum: ['leve', 'moderada', 'critica'] }
        },
        required: ["id", "name", "description", "type", "severity"]
      },
      description: "Estados tácticos temporales de supervivencia si sufre desangrado, toxinas, sobrecarga o paroxismo."
    },
    resolvedConditions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "IDs de condiciones tácticas vendadas, purgadas o descansadas en este turno."
    },
    environmentContext: { 
      type: Type.STRING, 
      description: "MEMORIA ESPACIAL ESTRICTA: Ubicación física exacta, salidas, barreras, fuentes de luz y amenazas inmediatas del entorno. ACTUALIZA este campo en CADA turno para garantizar coherencia geográfica absoluta." 
    },
    suggestedActions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "2 a 4 opciones sugeridas que representen dilemas reales, riesgos tácticos o investigación con propósito. NUNCA acciones triviales ni aburridas." 
    },
    isGameOver: { type: Type.BOOLEAN, description: "True SI Y SOLO SI el personaje muere o sufre destrucción total irrecuperable." },
    challenge: {
      type: Type.OBJECT,
      description: "Opcional. Incluir SOLO si la acción del jugador es arriesgada y el resultado es incierto.",
      properties: {
        attribute: { type: Type.STRING, enum: ["fuerza", "destreza", "constitucion", "inteligencia", "sabiduria", "carisma"] },
        difficulty: { 
          type: Type.INTEGER, 
          description: "Clase de Dificultad (DC). El sistema suma Atributo Completo (5-19) + 1d20. Base: 15=Fácil, 22-25=Medio/Exigente, 30-35=Extremo. Si el jugador describe una táctica ingeniosa o usa una herramienta apropiada, reduce la DC entre 2 y 5 puntos." 
        },
        context: { type: Type.STRING, description: "Razón corta y visceral de la tirada, ej: 'Esquivar la estocada a traición'" }
      },
      required: ["attribute", "difficulty", "context"]
    }
  },
  required: ["narrative", "tensionLevel", "hpChange", "sanityChange", "inventoryAdd", "inventoryRemove", "newWorldFacts", "suggestedActions", "isGameOver", "environmentContext"],
};

const MASTER_SYSTEM_INSTRUCTION = `
Eres el Director de Juego (Game Master) y Narrador Supremo de "Crónicas de la Penumbra", una novela interactiva de BAJA FANTASÍA OSCURA (GRIMDARK), REALISMO SUCIO Y TERROR PSICOLÓGICO Y CORPORAL (inspirada en la prosa de Joe Abercrombie, George R.R. Martin, Cormac McCarthy y Kentaro Miura).

### 1. DIRECTRICES LITERARIAS SUPREMAS (LEYES INQUEBRANTABLES)
- PERSPECTIVA Y TIEMPO: Escribe SIEMPRE en SEGUNDA PERSONA DEL SINGULAR ("TÚ") y en TIEMPO PRESENTE ("Escuchas el crujido", "Avanzas", "El frío te entumece los dedos"). JAMÁS uses tercera persona ("él/ella/el personaje") ni tiempo pasado.
- CALIDAD LITERARIA Y ESTILO DIRECTO: Prosa afilada, visceral, clínica y atmosférica.
- PROHIBICIÓN ABSOLUTA DE RETÓRICA INFANTIL Y COMPARACIONES EN NEGATIVO:
  Está TERMINANTEMENTE PROHIBIDO usar fórmulas como "No era X, sino Y" o "El aire no olía a flores, sino a muerte". Lo que es, es; y lo que no es, no se menciona. Di directamente: "El aire apesta a cal viva y sangre seca". Sé asertivo, sensorial y rotundo.
- SENSORIALIDAD ("SHOW, DON'T TELL"): No te limites a decir "tienes miedo" o "el lugar es tétrico". Describe el temblor involuntario de la mandíbula, el sabor a bilis en la garganta, la condensación del aliento gélido, el tacto grasiento de los muros húmedos.
- RITMO Y DINAMISMO ADAPTATIVO:
  * En calma, misterio o sigilo: prosa envolvente, rica en detalles espaciales y tensión latente (2-3 párrafos inmersivos bien estructurados).
  * En peligro, combate o pánico: frases directas, viscerales, cortantes y de alto impacto.
  * En actos mundanos (recoger una moneda, beber un trago): concisión estricta (1 o 2 frases). Reserva la prosa expansiva para los momentos dramáticos.
- EL MUNDO ESTÁ VIVO Y TIENE INICIATIVA: El entorno no es un decorado inerte que espera al jugador. El tiempo corre, el fuego de las antorchas se consume, los enemigos patrullan o tienden emboscadas, los heridos sangran hasta morir y los PNJs persiguen sus propios intereses. Si el jugador titubea o no actúa con decisión, el mundo toma la iniciativa con consecuencias inmediatas.

### 2. FILTRO DE REALIDAD (BAJA FANTASÍA / REALISMO CRÚO)
- No hay superhéroes, no hay bolas de fuego mágicas, no hay tecnología moderna ni viajes dimensionales.
- La violencia es atroz, desprovista de gloria y deja secuelas permanentes.
- Si el jugador intenta acciones absurdas, poderes psíquicos o sacar tecnología moderna: REINTERPRETA la acción de inmediato como un delirio, una alucinación por fiebres o drogas, o el ridículo patético de un loco en el barro que atrae el peligro sobre sí.

### 3. CONTROL DE RITMO Y TENSIÓN DRAMÁTICA (tensionLevel)
Clasifica en cada turno el estado de la escena en uno de estos niveles:
- 'calma': Un momento efímero de respiro para vendarse, hablar o inspeccionar sin amenaza inmediata.
- 'sospecha': El ambiente se enrarece, un ruido no encaja, una pista inquietante, desconfianza hacia un PNJ.
- 'tension': Sigilo, cuenta atrás, oscuridad opresiva, el acecho de algo letal.
- 'peligro': Trampa activada, emboscada inminente, encrucijada letal o confrontación verbal violenta.
- 'combate': Violencia física directa, choque de acero, colmillos o piedras, lucha desesperada por la vida.
- 'agonico': Vida al límite (HP < 25%), colapso mental (Cordura < 25%), o agonía final.

### 4. DRAMATIS PERSONAE Y RELACIONES VIVAS (PNJS)
- PNJS CON ALMA Y MEMORIA: Cuando interactúes con un PNJ relevante (cómplice, guardia, mercader, agresor, testigo, inquisidor), REGÍSTRALO en 'newNpcs'.
- Si un PNJ existente es herido, cambia de lealtad, te traiciona, muere o huye, devuelve su cambio en 'npcUpdates'.
- Los PNJs no son estatuas: tienen miedo, rencor, intereses propios o deudas. Si un PNJ te vio matar a alguien, no lo olvidará. Si le salvaste la vida, recordará su deuda.

### 5. CARTOGRAFÍA SENSORIAL (locationUpdate)
- Devuelve siempre en 'locationUpdate' el nombre del lugar, su iluminación ('oscuridad_total' | 'penumbra' | 'antorchas' | 'luz_de_dia'), el peligro ('seguro' | 'inquietante' | 'letal') y las salidas físicas tangibles ('exits').

### 6. SALUD, CORDURA Y ESTADOS TÁCTICOS
- Salud (HP): Narra cortes profundos, huesos rotos y quemaduras. Si HP baja del 30%, genera un 'Trauma' físico con penalización mecánica estricta (ej: '-2 destreza'). Si HP llega a 0 ('isGameOver': true), narra la muerte sin compasión.
- Cordura: Se erosiona ante horrores aberrantes, mutilaciones intolerables o desesperación. Se recupera (+2 a +5) descansando en zonas seguras, bebiendo alcohol, consumiendo láudano o resolviendo un misterio vital. Si Cordura cae del 50%, genera una 'Phobia' con su detonante.
- Condiciones Tácticas de Supervivencia ('newConditions' / 'resolvedConditions'):
  * 'hemorragia': Cortes sangrantes que causan dolor y goteo constante. Si el jugador se venda con telas limpias o cauteriza la herida, resuélvela en 'resolvedConditions'.
  * 'intoxicacion': Por comer carroña podrida, beber agua ponzoñosa o respirar miasmas y veneno.
  * 'agotamiento': Por cargar peso excesivo o marchar sin descanso.
  * 'panico': Por colapso de cordura repentino.
- Entropía de Inventario: Todo se desgasta. Actualiza las etiquetas y descripciones de los objetos ('inventoryUpdates') cuando se usen o sufran desgaste.

### 7. CARTOGRAFÍA Y ECOS DEL PANTEÓN
- Red de Lugares: En 'locationUpdate.connectedLocations', especifica los nombres o IDs de lugares vecinos que conectan con la sala actual para nutrir el Atlas Mental.
- Ecos de Caídos: Si en el contexto se incluyen 'Ecos del Panteón', incorpora ocasionalmente sus restos descompuestos, grabados o reliquias en esas ubicaciones.

### 7. DESAFÍOS DE DADOS (challenge)
- Incluye un 'challenge' cuando la acción del jugador sea arriesgada y el éxito no esté garantizado.
- Dificultades base (DC): 15 (asequible), 22-25 (desafiante), 30-35 (hazaña extrema).
- Atributos válidos: fuerza, destreza, constitucion, inteligencia, sabiduria, carisma.
- Si el jugador describe una táctica inteligente o usa una herramienta apropiada, reduce la dificultad en 2 a 5 puntos.

### 8. ACCIONES SUGERIDAS (suggestedActions)
- Ofrece 2-4 opciones variadas, inteligentes y cargadas de intención dramática o táctica.
- PROHIBIDO ofrecer opciones banales como "Esperar", "Mirar la pared" o "Beber agua". Deben proponer dilemas, investigación de pistas, riesgos medidos o maniobras de supervivencia.
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, payload, customApiKey, model } = req.body || {};
  const activeModel = resolveModel(model);

  try {
    const ai = getAi(customApiKey);

    if (type === 'testConnection') {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: "Responde únicamente con: CONEXION_ESTABLECIDA",
      });
      return res.status(200).json({
        success: true,
        model: activeModel,
        sample: response.text?.trim() || "CONEXION_ESTABLECIDA"
      });
    }

    if (type === 'startAdventure') {
      const character = payload as Character;
      const prompt = `
CREACIÓN E INICIO DE LA AVENTURA (PASO 1):

DATOS DEL PERSONAJE:
- Nombre: "${character.name}"
- Arquetipo/Concepto: "${character.archetype}"
- Pasado / Tragedia: "${character.bio}"
- Atributos Base: ${JSON.stringify(character.attributes)}

OBJETIVOS DEL TURNO INICIAL (IN MEDIA RES):
1. PROHIBIDO COMENZAR DESPERTANDO O CON AMNESIA: El personaje sabe exactamente quién es, qué hace ahí y qué busca. Jamás comiences abriendo los ojos en un camastro o sin saber dónde está.
2. IN MEDIA RES (ACCIÓN INMEDIATA): Sitúalo en mitad de una acción tensa o conflicto congruente con su pasado (ej: huyendo bajo la lluvia helada, cosiendo una herida en la penumbra, ocultándose de guardias tras un asesinato, o desenterrando algo peligroso).
3. INVENTARIO INICIAL PERSONALIZADO: Asígnale de 2 a 4 objetos únicos y creíbles según su profesión/pasado, con descripciones materiales y etiquetas de desgaste (ej: 'Mellada', 'Oxidada', 'Húmeda'). Jamás asignes láudano a menos que sea un médico, adicto o alquimista.
4. CARTOGRAFÍA INICIAL: Rellena 'locationUpdate' y 'environmentContext' con precisión física absoluta: nombre del lugar, terreno, clima, iluminación, peligro y salidas inmediatas.
5. DRAMATIS PERSONAE INICIAL: Si en la escena inicial se menciona o interactúa con algún personaje relevante (un cómplice que huyó, un herido que agoniza, un guardia cercano), regístralo en 'newNpcs'.
6. TENSIÓN INICIAL ('tensionLevel'): Asígnalo coherentemente (generalmente 'tension' o 'sospecha').
7. OPCIONES SUGERIDAS ('suggestedActions'): Ofrece opciones cargadas de peligro e intriga para su primer movimiento.

Genera el JSON siguiendo el esquema estricto.
      `;

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction: MASTER_SYSTEM_INSTRUCTION,
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

      // 1. Contexto Mecánico y Estado enriquecido con PNJs, Condiciones y Ubicación
      const mechanicalContext = {
        personaje: {
          nombre: currentState.character.name,
          arquetipo: currentState.character.archetype,
          pasado: currentState.character.bio,
          atributos: currentState.character.attributes
        },
        estadoVital: {
          hp: `${currentState.hp}/${currentState.maxHp}`,
          cordura: `${currentState.sanity}/100`,
          traumasActivos: (currentState.traumas || []).map(t => `${t.name} (${t.effect})`),
          fobiasActivas: (currentState.phobias || []).map(p => `${p.name} [Detonante: ${p.trigger}]`),
          condicionesTacticas: (currentState.conditions || []).map(c => `${c.name} [Tipo: ${c.type}, Gravedad: ${c.severity}] - ${c.description}`)
        },
        inventario: (currentState.inventory || []).map(i => ({
          nombre: i.name,
          descripcion: i.description,
          tags: i.tags || []
        })),
        ubicacionActual: currentState.currentLocation ? {
          nombre: currentState.currentLocation.name,
          iluminacion: currentState.currentLocation.lighting,
          peligro: currentState.currentLocation.dangerLevel,
          salidasVisibles: currentState.currentLocation.exits,
          conexionesAdyacentes: currentState.currentLocation.connectedLocations || []
        } : (currentState.environmentContext || "Ubicación desconocida"),
        personajesConocidos: (currentState.npcs || []).map(n => ({
          id: n.id,
          nombre: n.name,
          rol: n.role,
          estado: n.status,
          relacion: n.relationship,
          notas: n.notes || "",
          ubicacion: n.location || "desconocida"
        })),
        tramasActivas: (currentState.activeThreads || []).map(t => `${t.title}: ${t.description}`),
        hechosConocidos: (currentState.worldFacts || []).slice(-10).map(f => f.text),
        tensionPrevia: currentState.tensionLevel || 'tension',
        turnoNumero: currentState.turnCount + 1
      };

      // 2. ALGORITMO DE MEMORIA PIRAMIDAL (CONSOLIDACIÓN PROFUNDA)
      const narrativeHistory = currentState.narrativeHistory || [];
      const userHistory = (currentState.history || []).filter(h => h.role === 'user');
      
      let chronicle = "=== MEMORIA PROFUNDA DE LA VIGILIA (CONSOLIDACIÓN PIRAMIDAL) ===\n\n";

      // Nivel 1: Ancla de Origen (Cómo y dónde comenzó la vigilia)
      if (narrativeHistory.length > 0) {
        chronicle += `[ANCLA DE ORIGEN - Pasaje 1]:\n${narrativeHistory[0].narrative.slice(0, 350)}...\n\n`;
      }

      // Nivel 2: Hitos Históricos y Cicatrices Permanentes
      const milestones: string[] = [];
      if (currentState.traumas?.length) {
        milestones.push(`Traumas Físicos: ${currentState.traumas.map(t => `${t.name} (${t.effect})`).join('; ')}`);
      }
      if (currentState.phobias?.length) {
        milestones.push(`Fobias y Terrores Mentales: ${currentState.phobias.map(p => `${p.name} [Detonante: ${p.trigger}]`).join('; ')}`);
      }
      const deadOrHostileNpcs = (currentState.npcs || []).filter(n => n.status === 'muerto' || n.relationship === 'hostil' || n.relationship === 'enemigo_mortal');
      if (deadOrHostileNpcs.length) {
        milestones.push(`PNJs Muertos u Hostiles: ${deadOrHostileNpcs.map(n => `${n.name} (${n.status}, ${n.relationship})`).join('; ')}`);
      }
      if (milestones.length > 0) {
        chronicle += `[HITOS HISTÓRICOS Y MARCAS DEL PASADO]:\n${milestones.map(m => `• ${m}`).join('\n')}\n\n`;
      }

      // Nivel 3: Ecos del Panteón (Almas caídas del pasado)
      const { ecosDelPanteon } = payload as { ecosDelPanteon?: Array<{ name: string; archetype: string; deathLocation?: string; legacyItem?: string }> };
      if (ecosDelPanteon && ecosDelPanteon.length > 0) {
        chronicle += `[ECOS DEL PANTEÓN - Almas Caídas en esta Tierra]:\n`;
        ecosDelPanteon.slice(0, 3).forEach(soul => {
          chronicle += `• ${soul.name} (${soul.archetype}), pereció en "${soul.deathLocation || 'las sombras'}". Dejó atrás: ${soul.legacyItem || 'un relicario agrietado'}.\n`;
        });
        chronicle += `(Si visitas esa zona o examinas restos antiguos, puedes incorporar detalles o vestigios de estos caídos).\n\n`;
      }

      // Nivel 4: Memoria Continua Inmediata (Últimos 5 pasajes con texto completo)
      const turnsToInclude = Math.min(5, narrativeHistory.length);
      const recentNarratives = narrativeHistory.slice(-turnsToInclude);

      chronicle += "--- CRÓNICA DE LOS PASAJES RECIENTES (MEMORIA INMEDIATA) ---\n";
      recentNarratives.forEach((turn, idx) => {
        const turnIndexInTotal = narrativeHistory.length - turnsToInclude + idx;
        const previousUserAction = userHistory[turnIndexInTotal - 1]?.content;
        
        if (previousUserAction) {
          chronicle += `[Pasaje ${turnIndexInTotal} - Acción del Jugador]: "${previousUserAction}"\n`;
        }
        chronicle += `[Pasaje ${turnIndexInTotal + 1} - Narración de la Penumbra]:\n${turn.narrative}\n\n`;
      });

      const userPrompt = `
${chronicle}
----------------------------------------------------------------------
ESTADO MECÁNICO, PERSONAJES Y CARTOGRAFÍA ACTUAL:
${JSON.stringify(mechanicalContext, null, 2)}

----------------------------------------------------------------------
NUEVA ACCIÓN DEL JUGADOR:
"${action}"
(Pasaje número: ${currentState.turnCount + 1})

DIRECTIVAS PARA ESTE TURNO:
1. CONTINUIDAD ABSOLUTA: Mantén estricta coherencia con los pasajes recientes. Si hay un PNJ presente (ej: ${mechanicalContext.personajesConocidos.map(p => p.nombre).join(', ') || 'ninguno registrado'}), debe reaccionar acorde a su personalidad y relación. Si un PNJ es herido o muere, actualízalo en 'npcUpdates'.
2. NUEVOS ENCUENTROS: Si entra en escena un nuevo PNJ con nombre o papel relevante, añádelo en 'newNpcs'.
3. CARTOGRAFÍA: Si el personaje se mueve o el entorno cambia, proporciona la nueva información en 'locationUpdate' y 'environmentContext'.
4. NARRATIVA VISCERAL: Resuelve la acción en segunda persona del singular, tiempo presente, con prosa cruda y sensorial. Sin rodeos negativos ni fórmulas infantiles.
5. INICIATIVA DEL MUNDO: Si el jugador titubea, avanza una amenaza ambiental o enemiga.
6. TENSIÓN DRAMÁTICA: Asigna el nuevo 'tensionLevel'.
7. REGLAS: Ajusta hpChange, sanityChange, desgaste de inventario y opcionalmente un 'challenge' de dados si la acción entraña un riesgo directo no resuelto.

Genera el JSON de respuesta.
      `;

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: userPrompt,
        config: {
          systemInstruction: MASTER_SYSTEM_INSTRUCTION,
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
    let msg = error?.message || "Internal Server Error";
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
      msg = "La clave de API de Gemini no es válida o ha caducado. Comprueba tus Ajustes de la Vigilia.";
    } else if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
      msg = "Cuota de la clave de Gemini agotada. Si usas la clave predeterminada, introduce tu propia clave gratuita en Ajustes para continuar sin límites.";
    }
    return res.status(500).json({ error: msg });
  }
}
