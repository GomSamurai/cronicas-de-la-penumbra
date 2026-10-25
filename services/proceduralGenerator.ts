/**
 * proceduralGenerator.ts - Generador Procedimental Infinito para Personajes
 * Crónicas de la Penumbra
 * 
 * Genera miles de nombres, roles y tragedias góticas sin repeticiones,
 * combinando lexemas de baja fantasía oscura y época victoriana decadente.
 */

const FIRST_NAMES = [
  "Silas", "Merrick", "Thaddeus", "Bartholomew", "Cassian", "Gideon", "Morvath",
  "Corvus", "Kaspar", "Elias", "Lucian", "Bramwell", "Barnaby", "Kaelen", "Percival",
  "Jeremiah", "Ignatius", "Valerius", "Althea", "Isolde", "Rowena", "Vespera",
  "Beatrice", "Elowen", "Hester", "Maeve", "Lottie", "Sybil", "Cordelia", "Agatha",
  "Tabitha", "Constance", "Miriam", "Lavinia", "Morrigan", "Ophelia", "Gwyneira",
  "Roderick", "Balthazar", "Cyprian", "Osmund", "Wolfram", "Malachi", "Dorian"
];

const EPITHETS = [
  '"El Topo"', '"Manos de Cera"', '"El Mudo"', '"La Sepultada"', '"El Desollador"',
  '"Ojos de Vidrio"', '"La Sangradora"', '"El Tuerto"', '"Dientes de Plomo"',
  '"El Sin Alma"', '"La Cuerva"', '"El Renegado"', '"La Excomulgada"', '"El Cojo"',
  '"Piel de Ceniza"', '"El Verdugo"', '"La Costurera"', '"El Hereje"', '"Siete Vidas"',
  '"El Funerario"', '"La Envenenadora"', '"El Ratero"', '"El Ahogado"', '"Sombra Gris"'
];

const SURNAMES = [
  "Graves", "Thorne", "Blackwood", "Grimm", "Nacht", "Vane", "Crow", "Crowley",
  "Ravenscroft", "Ashworth", "Mallory", "Morvath", "Hollister", "Mortensen",
  "Barrow", "Fenwick", "Craven", "Cromwell", "Wycliffe", "Winterfall", "Faust",
  "Cross", "Bell", "Croft", "Oakes", "Underwood", "Bleakley", "Harrow", "Mire"
];

const ROLES_BASE = [
  "Boticario", "Inquisidor", "Ladrón de Criptas", "Balsamero", "Verdugo",
  "Monje Apóstata", "Cazador de Alimañas", "Cirujano de Trinchera", "Navegante de Cloacas",
  "Herrero de Grilletes", "Tatuador de Herejes", "Carroñero", "Copista Ciego",
  "Ventrílocuo", "Taxidermista", "Mendigo Espía", "Alquimista Clandestino",
  "Guardián de Osario", "Peletero de Ratas", "Matón de Callejón", "Desenterrador",
  "Fabricante de Candiles", "Barbero Sangrador", "Custodio de Leprosos"
];

const ROLES_MODIFIERS = [
  "de las Fosas Comunes", "Renegado", "de Cadáveres Frescos", "Ciego", "Deshonrado",
  "del Santo Oficio", "Nocturno", "de Niebla", "de la Peste", "del Pozo Negro",
  "sin Parroquia", "del Muelle Fangoso", "Condenado", "de la Horca", "Excomulgado"
];

const SINS_ACTIONS = [
  "Envenené las hostias consagradas",
  "Arranqué los dientes de oro a los muertos de la fosa",
  "Vendí a mi propio hermano a los guardias de la inquisición",
  "Prendí fuego al hospicio de los mendigos",
  "Asfixié al anciano barón mientras dormía",
  "Hui de la trinchera dejando atrás a mis camaradas moribundos",
  "Desenterré el ataúd de mi propia prometida",
  "Suministré cicuta en vez de jarabe a los huérfanos",
  "Falsifiqué el testamento de mi mentor agonizante",
  "Robé las reliquias de plata de la catedral durante el asedio",
  "Corté la soga de mi compañero de escalada en las catacumbas",
  "Denuncié a la curandera como bruja para cobrar la recompensa",
  "Cargué los dados en la taberna y degollé al herrero cuando me descubrió"
];

const SINS_REASONS = [
  "por un puñado de monedas de cobre para saldar mis deudas de opio.",
  "para comprar la medicina que mi hija enferma escupió antes de morir.",
  "porque sus susurros nocturnos amenazaban con revelar quién era yo en realidad.",
  "para quedarme con su anillo de esmeraldas y poder pagar un pasaje que nunca llegó.",
  "convencido de que las voces de la niebla me prometían riquezas eternas.",
  "presa del pánico ciego y el barro que me tragaba las rodillas.",
  "para pagar a los matones del muelle que amenazaban con desollarme vivo.",
  "porque la envidia me consumía las entrañas cada vez que lo veía rezar con fervor."
];

const SINS_CONSEQUENCES = [
  "Aún escucho sus uñas arañando la madera en mis pesadillas.",
  "Sus ojos vidriosos me persiguen cada vez que cierro los párpados.",
  "El olor a carne quemada nunca se ha ido de mis ropas.",
  "Mis manos tiemblan desde entonces con el peso de la culpa.",
  "Sé que sus espectros me aguardan en algún rincón de esta penumbra.",
  "El frío de su último aliento todavía me hiela la garganta cada amanecer.",
  "Llevo su amuleto en el bolsillo para recordarme qué clase de monstruo soy."
];

export const generateProceduralName = (): string => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const hasEpithet = Math.random() < 0.45;
  if (hasEpithet) {
    const epithet = EPITHETS[Math.floor(Math.random() * EPITHETS.length)];
    return `${first} ${epithet} ${surname}`;
  }
  return `${first} ${surname}`;
};

export const generateProceduralArchetype = (): string => {
  const base = ROLES_BASE[Math.floor(Math.random() * ROLES_BASE.length)];
  const withMod = Math.random() < 0.6;
  if (withMod) {
    const mod = ROLES_MODIFIERS[Math.floor(Math.random() * ROLES_MODIFIERS.length)];
    return `${base} ${mod}`;
  }
  return base;
};

export const generateProceduralSin = (characterName?: string, role?: string): string => {
  const action = SINS_ACTIONS[Math.floor(Math.random() * SINS_ACTIONS.length)];
  const reason = SINS_REASONS[Math.floor(Math.random() * SINS_REASONS.length)];
  const consequence = SINS_CONSEQUENCES[Math.floor(Math.random() * SINS_CONSEQUENCES.length)];
  return `${action} ${reason} ${consequence}`;
};
