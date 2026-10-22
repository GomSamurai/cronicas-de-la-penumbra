import { GameState } from '../types';

export const exportStoryToPDF = (gameState: GameState) => {
  const { 
    character, 
    narrativeHistory, 
    turnCount, 
    inventory, 
    hp, 
    maxHp, 
    sanity,
    traumas,
    phobias,
    activeThreads,
    worldFacts,
    diceLog,
    npcs,
    currentLocation,
    visitedLocations
  } = gameState;

  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const isDead = hp <= 0;
  
  // Logic Changes
  const docTitle = `Crónica: ${character.name}`;
  const statusTitle = isDead ? "Estado del Caído" : "Estado del Superviviente";

  // --- BIO GENERATION ---
  const defaultBio = "Una vida tranquila, hasta ahora...";
  let displayBio = character.bio;
  if (!displayBio || displayBio.trim() === defaultBio) {
    displayBio = `Esta es la crónica de ${character.name}, cuyas manos solían ocuparse de las labores de ${character.archetype.toLowerCase()}. El destino, caprichoso y cruel, ha decidido arrancar su nombre del anonimato para escribirlo en las páginas de la penumbra. Lo que sigue no es una historia de héroes, sino de supervivencia.`;
  }

  // --- HTML GENERATORS ---

  const attrList = Object.entries(character.attributes).map(([key, val]) => `
    <div class="stat-item">
      <div class="stat-value">${val}</div>
      <div class="stat-label">${key}</div>
    </div>
  `).join('');

  // INVENTORY REDESIGN: Grid with details
  const inventoryList = inventory.length > 0 
    ? inventory.map(i => {
        const tagsHtml = i.tags && i.tags.length > 0 
          ? `<div class="inv-tags">${i.tags.join(' • ')}</div>` 
          : '';
        return `
        <div class="inv-card">
           <div class="inv-header">
              <span class="inv-name">${i.name}</span>
              ${tagsHtml}
           </div>
           <div class="inv-desc">${i.description}</div>
        </div>`;
      }).join('')
    : '<div class="text-center italic text-dim">Sin posesiones terrenales.</div>';

  // Traumas & Phobias
  const traumasList = traumas && traumas.length > 0
    ? traumas.map(t => `<li class="affliction-item trauma"><strong>${t.name}:</strong> ${t.description} <span class="mech">(${t.effect})</span></li>`).join('')
    : '<li class="affliction-none">El cuerpo permaneció intacto.</li>';

  const phobiasList = phobias && phobias.length > 0
    ? phobias.map(p => `<li class="affliction-item phobia"><strong>${p.name}:</strong> ${p.description} <span class="mech">[Gatillo: ${p.trigger}]</span></li>`).join('')
    : '<li class="affliction-none">La mente conservó su forma.</li>';

  // Threads
  const threadsList = activeThreads && activeThreads.length > 0
    ? activeThreads.map(t => `
        <div class="thread-item">
          <span class="thread-icon">✦</span>
          <div>
            <div class="thread-title">${t.title}</div>
            <div class="thread-desc">${t.description}</div>
          </div>
        </div>`).join('')
    : '<div class="text-center italic text-dim">El destino fue breve.</div>';

  // FACTS REDESIGN: Numbered list for clarity
  const factsList = worldFacts && worldFacts.length > 0
    ? worldFacts.map((f, i) => `
      <div class="fact-item">
        <span class="fact-marker">${i + 1}.</span>
        <span>${f.text}</span>
      </div>`).join('')
    : '<div class="text-center italic text-dim">Nada se aprendió.</div>';

  // DRAMATIS PERSONAE
  const npcsList = npcs && npcs.length > 0
    ? npcs.map(npc => {
        const relLabelMap: Record<string, string> = {
          aliado: 'Aliado jurado',
          favorable: 'Favorable',
          neutral: 'Indiferente',
          sospechoso: 'Sospechoso',
          hostil: 'Hostil',
          enemigo_mortal: 'Enemigo mortal'
        };
        const relLabel = relLabelMap[npc.relationship] || npc.relationship;
        const statusLabelMap: Record<string, string> = {
          vivo: 'Con vida',
          herido: 'Malherido',
          inconsciente: 'Inconsciente',
          muerto: 'Caído / Finado',
          desaparecido: 'En paradero desconocido'
        };
        const statusLabel = statusLabelMap[npc.status] || npc.status;

        return `
        <div class="npc-card">
           <div class="npc-header">
              <span class="npc-name">${npc.name}</span>
              <span class="npc-badges">${npc.role ? `<span class="npc-role">${npc.role}</span> • ` : ''}<span class="npc-status status-${npc.status}">${statusLabel}</span></span>
           </div>
           <div class="npc-meta">Disposición: <strong>${relLabel}</strong>${npc.location ? ` • Visto en: <em>${npc.location}</em>` : ''}</div>
           <div class="npc-desc">${npc.description}</div>
           ${npc.notes ? `<div class="npc-notes">"${npc.notes}"</div>` : ''}
        </div>`;
      }).join('')
    : '<div class="text-center italic text-dim">No entablaste lazo ni enemistad duradera con alma alguna.</div>';

  // CARTOGRAPHY
  const currentLocHtml = currentLocation ? `
    <div class="loc-current-card">
      <div class="loc-title">📍 Último Paradero: <strong>${currentLocation.name}</strong></div>
      <div class="loc-details">
        <span>Iluminación: ${currentLocation.lighting.replace('_', ' ')}</span> • 
        <span>Peligro: <strong class="danger-${currentLocation.dangerLevel}">${currentLocation.dangerLevel.toUpperCase()}</strong></span>
      </div>
      <div class="loc-desc">${currentLocation.description}</div>
      ${currentLocation.exits && currentLocation.exits.length > 0 ? `
        <div class="loc-exits">
          <strong>Rutas adyacentes observadas:</strong> ${currentLocation.exits.map(e => `<em>${e}</em>`).join(' • ')}
        </div>
      ` : ''}
    </div>
  ` : '';

  const visitedListHtml = visitedLocations && visitedLocations.length > 0
    ? `<div class="visited-tags">${visitedLocations.map(v => `<span class="visited-pill">❖ ${v}</span>`).join(' ')}</div>`
    : '<div class="text-dim italic">Tus pasos quedaron sepultados en la sombra.</div>';

  // Dice Log Table - REVERSED FOR CHRONOLOGICAL ORDER
  const chronologicalDiceLog = diceLog ? [...diceLog].reverse() : [];
  
  const diceTableRows = chronologicalDiceLog.length > 0
    ? chronologicalDiceLog.map(log => {
        const resultClass = log.result === 'critical' || log.result === 'success' ? 'res-success' : 'res-fail';
        const resultLabel = log.result === 'critical' ? 'CRÍTICO' : log.result === 'fumble' ? 'PIFIA' : log.result === 'success' ? 'Éxito' : 'Fallo';
        return `
          <tr>
            <td class="col-turn">${log.turnIndex}</td>
            <td class="col-ctx">${log.context}<br><span class="ctx-sub">${log.attribute}</span></td>
            <td class="col-roll">D20(<strong>${log.roll}</strong>) + ${log.modifier} = <strong>${log.total}</strong></td>
            <td class="col-dc">DC ${log.difficulty}</td>
            <td class="col-res ${resultClass}">${resultLabel}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" class="text-center italic">El azar no fue invocado.</td></tr>';


  const printContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
        
        @page {
          size: A4;
          margin: 2cm 2cm;
        }

        :root {
          --c-text: #1a1a1a;
          --c-dim: #555;
          --c-light: #888;
          --c-accent: #a38456; /* Gold */
          --c-blood: #8a1c1c;
          --c-sanity: #4b5c85;
          --c-border: #eee;
        }

        body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 10.5pt;
          line-height: 1.4;
          color: var(--c-text);
          background-color: #fff;
          margin: 0;
        }

        h1, h2, h3, .font-display { font-family: 'Cinzel', serif; }
        .text-center { text-align: center; }
        .italic { font-style: italic; }
        .page-break { page-break-after: always; }
        
        /* --- COVER --- */
        .cover-page {
          height: 24cm; /* Fixed height fitting within A4 margins */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid var(--c-border);
          padding: 1cm;
          box-sizing: border-box;
          margin-bottom: 0; /* Prevent push */
        }
        .cover-title { font-size: 3.5rem; margin: 0; line-height: 1; text-transform: uppercase; letter-spacing: 0.05em; color: #000; }
        .cover-subtitle { font-size: 1.5rem; color: var(--c-accent); margin-top: 0.5cm; font-style: italic; }
        .cover-meta { margin-top: 4cm; color: var(--c-light); font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; }

        /* --- SECTIONS --- */
        .sheet-section { padding: 0.5cm 0; }
        .section-title {
          font-size: 1.2rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 1cm;
          color: #000;
          border-bottom: 2px solid var(--c-accent);
          display: inline-block;
          padding-bottom: 5px;
        }
        .center-title-container { text-align: center; margin-bottom: 0.5cm; }

        /* --- ATTRIBUTES --- */
        .attributes-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-bottom: 1.5cm;
          background: #fafafa;
          padding: 15px;
          border: 1px solid var(--c-border);
        }
        .stat-value { font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700; color: var(--c-accent); text-align: center; }
        .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-light); text-align: center; margin-top: 2px; }

        /* --- AFFLICTIONS --- */
        .afflictions-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5cm;
          margin-bottom: 1.5cm;
        }
        .aff-col h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 1px solid var(--c-border); padding-bottom: 2px; }
        .aff-col.trauma h3 { color: var(--c-blood); }
        .aff-col.phobia h3 { color: var(--c-sanity); }
        
        .aff-list { list-style: none; padding: 0; margin: 0; font-size: 0.9rem; }
        .affliction-item { margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed var(--c-border); }
        .affliction-none { color: var(--c-light); font-style: italic; font-size: 0.9rem; }
        .mech { font-size: 0.75rem; font-family: sans-serif; color: var(--c-light); }

        /* --- INVENTORY (NEW) --- */
        .inventory-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 12px;
           margin-top: 10px;
        }
        .inv-card {
           border: 1px solid var(--c-border);
           padding: 8px;
           background: #fcfcfc;
           page-break-inside: avoid;
        }
        .inv-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 4px; }
        .inv-name { font-weight: 700; font-family: 'Cinzel', serif; font-size: 0.85rem; color: #222; }
        .inv-tags { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-dim); }
        .inv-desc { font-size: 0.85rem; font-style: italic; color: #444; line-height: 1.2; }

        /* --- LORE / CODEX (UPDATED) --- */
        .codex-layout { margin-bottom: 1cm; }
        .codex-h3 { font-family: 'Cinzel'; font-size: 1rem; border-bottom: 1px solid var(--c-border); padding-bottom: 5px; margin-top: 1cm; margin-bottom: 0.5cm; color: var(--c-accent); }
        
        .threads-container { margin-bottom: 1cm; }
        .thread-item { margin-bottom: 10px; display: flex; gap: 8px; page-break-inside: avoid; }
        .thread-icon { color: var(--c-accent); font-size: 1rem; }
        .thread-title { font-weight: bold; font-family: 'Cinzel'; font-size: 0.85rem; }
        .thread-desc { font-size: 0.85rem; color: var(--c-dim); font-style: italic; }

        .facts-columns {
           column-count: 2;
           column-gap: 1.5cm;
        }
        .fact-item { 
           margin-bottom: 10px; 
           color: #333; 
           page-break-inside: avoid;
           text-align: left;
           display: flex;
           gap: 8px;
           font-size: 0.9rem;
           border-bottom: 1px dotted #f0f0f0;
           padding-bottom: 6px;
        }
        .fact-marker {
           color: var(--c-accent);
           font-family: 'Cinzel', serif;
           font-weight: bold;
           font-size: 0.7rem;
           flex-shrink: 0;
           width: 1.8em;
           margin-top: 2px;
        }

        /* --- NPCS (DRAMATIS PERSONAE) --- */
        .npc-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 12px;
           margin-top: 10px;
        }
        .npc-card {
           border: 1px solid var(--c-border);
           padding: 10px;
           background: #fdfdfd;
           page-break-inside: avoid;
        }
        .npc-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 4px; }
        .npc-name { font-weight: 700; font-family: 'Cinzel', serif; font-size: 0.9rem; color: #222; }
        .npc-badges { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-dim); }
        .npc-role { color: var(--c-accent); font-weight: 600; }
        .npc-status { font-weight: bold; }
        .npc-status.status-muerto { color: var(--c-blood); }
        .npc-status.status-herido { color: #b86500; }
        .npc-status.status-vivo { color: #2e6040; }
        .npc-meta { font-size: 0.75rem; color: var(--c-dim); margin-bottom: 6px; }
        .npc-desc { font-size: 0.85rem; color: #444; line-height: 1.25; margin-bottom: 4px; }
        .npc-notes { font-size: 0.8rem; font-style: italic; color: #555; border-left: 2px solid var(--c-accent); padding-left: 6px; margin-top: 4px; }

        /* --- CARTOGRAPHY --- */
        .loc-current-card {
           border: 1px solid var(--c-border);
           background: #faf8f5;
           padding: 10px 14px;
           margin-bottom: 12px;
           page-break-inside: avoid;
        }
        .loc-title { font-family: 'Cinzel', serif; font-size: 0.95rem; color: #222; margin-bottom: 3px; }
        .loc-details { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-dim); margin-bottom: 5px; }
        .loc-details .danger-mortal, .loc-details .danger-alto { color: var(--c-blood); font-weight: bold; }
        .loc-desc { font-size: 0.85rem; font-style: italic; color: #444; margin-bottom: 6px; }
        .loc-exits { font-size: 0.75rem; color: var(--c-dim); border-top: 1px dashed var(--c-border); padding-top: 4px; }
        .visited-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; margin-bottom: 12px; }
        .visited-pill { background: #f0ede8; font-family: 'Cinzel', serif; font-size: 0.7rem; padding: 3px 8px; border-radius: 2px; color: #333; border: 1px solid #e2ddd5; }

        /* --- NARRATIVE --- */
        .narrative-text p { text-indent: 1.5em; margin: 0 0 10px 0; text-align: justify; }
        .turn-divider { text-align: center; margin: 15px 0; color: var(--c-accent); font-family: 'Cinzel'; font-size: 0.7rem; opacity: 0.6; }
        .drop-cap { float: left; font-size: 3rem; line-height: 0.8; font-family: 'Cinzel'; color: var(--c-accent); margin-right: 6px; }
        .the-end {
           text-align: center;
           margin-top: 2cm;
           margin-bottom: 1cm;
           color: var(--c-accent);
        }
        .end-ornament { font-size: 1.5rem; margin-bottom: 0.5cm; }
        .end-text { font-family: 'Cinzel', serif; font-size: 0.9rem; letter-spacing: 0.3em; text-transform: uppercase; font-weight: bold; }

        /* --- DICE TABLE --- */
        table.dice-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .dice-table th { text-align: left; border-bottom: 1px solid #000; padding: 6px; font-family: 'Cinzel'; font-weight: bold; color: #444; }
        .dice-table td { border-bottom: 1px solid var(--c-border); padding: 6px; vertical-align: top; }
        .col-turn { width: 30px; text-align: center; color: var(--c-light); }
        .col-roll { font-family: monospace; }
        .ctx-sub { font-size: 0.7rem; color: var(--c-light); text-transform: uppercase; }
        .res-success { color: var(--c-accent); font-weight: bold; }
        .res-fail { color: var(--c-blood); }

      </style>
    </head>
    <body>

      <!-- PAGE 1: COVER -->
      <div class="cover-page">
        <div class="cover-meta">Crónica de la Vigilia</div>
        <h1 class="cover-title">${character.name}</h1>
        <div class="cover-subtitle">${character.archetype}</div>
        <div style="margin-top: 2cm; font-size: 2rem; color: var(--c-accent);">❖</div>
        <div class="cover-meta" style="margin-top: auto;">${date} • Turnos: ${turnCount}</div>
      </div>
      
      <div class="page-break"></div>

      <!-- PAGE 2: STATUS & AFFLICTIONS -->
      <div class="sheet-section">
        <div class="center-title-container">
          <h2 class="section-title">${statusTitle}</h2>
        </div>

        <p class="text-center italic" style="margin-bottom: 1cm; padding: 0 1cm; color: var(--c-dim);">
          "${displayBio}"
        </p>

        <div class="attributes-grid">
          ${attrList}
        </div>

        <div style="text-align: center; margin-bottom: 1cm; font-family: 'Cinzel'; font-size: 0.9rem;">
          <span style="margin: 0 15px;">Vitalidad Final: <strong>${hp}/${maxHp}</strong></span>
          <span style="margin: 0 15px;">Cordura Final: <strong>${sanity}%</strong></span>
        </div>

        <div class="afflictions-container">
          <div class="aff-col trauma">
            <h3>Traumas (Físico)</h3>
            <ul class="aff-list">
              ${traumasList}
            </ul>
          </div>
          <div class="aff-col phobia">
            <h3>Fobias (Mental)</h3>
            <ul class="aff-list">
              ${phobiasList}
            </ul>
          </div>
        </div>

        <div class="center-title-container" style="margin-top: 0.5cm;">
           <h3 style="font-family: 'Cinzel'; font-size: 0.9rem; letter-spacing: 0.1em; border-bottom: 1px solid #ccc; display: inline-block; padding-bottom: 2px;">Inventario</h3>
        </div>
        <div class="inventory-grid">
           ${inventoryList}
        </div>
      </div>

      <div class="page-break"></div>

      <!-- PAGE 3: CODEX & CARTOGRAPHY -->
      <div class="sheet-section">
         <div class="center-title-container">
          <h2 class="section-title">El Códice y Cartografía</h2>
        </div>

        <div class="codex-layout">
           <div class="codex-h3">Cartografía y Pasos de la Penumbra</div>
           ${currentLocHtml}
           <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-dim); margin-top: 8px;">Senderos Explorados:</div>
           ${visitedListHtml}

           <div class="codex-h3">Hilos del Destino</div>
           <div class="threads-container">
              ${threadsList}
           </div>

           <div class="codex-h3">Recuerdos del Mundo</div>
           <div class="facts-columns">
              ${factsList}
           </div>
        </div>
      </div>

      <div class="page-break"></div>

      <!-- PAGE 4: DRAMATIS PERSONAE -->
      <div class="sheet-section">
        <div class="center-title-container">
          <h2 class="section-title">Dramatis Personae: Almas de la Penumbra</h2>
        </div>
        <div class="npc-grid">
          ${npcsList}
        </div>
      </div>

      <div class="page-break"></div>

      <!-- PAGE 5+: NARRATIVE -->
      <div class="sheet-section">
        <div class="center-title-container">
          <h2 class="section-title">La Historia</h2>
        </div>
        
        <div class="narrative-text">
           ${narrativeHistory.map((turn, index) => {
            const paragraphs = turn.narrative.split('\n').filter(p => p.trim());
            return `
              ${index > 0 ? `<div class="turn-divider">Pasaje ${index + 1}</div>` : ''}
              ${paragraphs.map((p, pIdx) => {
                const formatted = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                if (index === 0 && pIdx === 0) {
                  const firstLetter = formatted.charAt(0);
                  const rest = formatted.slice(1);
                  return `<p><span class="drop-cap">${firstLetter}</span>${rest}</p>`;
                }
                return `<p>${formatted}</p>`;
              }).join('')}
            `;
          }).join('')}

          <div class="the-end">
             <div class="end-ornament">❖</div>
             <div class="end-text">Fin de la Crónica</div>
          </div>
        </div>
      </div>

      <div class="page-break"></div>

      <!-- APPENDIX: DICE LOG -->
      <div class="sheet-section">
         <div class="center-title-container">
          <h2 class="section-title">Apéndice: Registro del Azar</h2>
        </div>
        
        <table class="dice-table">
          <thead>
            <tr>
              <th width="5%">#</th>
              <th width="40%">Contexto</th>
              <th width="25%">Cálculo</th>
              <th width="15%">DC</th>
              <th width="15%">Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${diceTableRows}
          </tbody>
        </table>
      </div>

      <script>
        window.onload = () => { setTimeout(() => window.print(), 500); };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
};