# Instrucciones para el Agente Especializado (Antigravity)

Este documento sirve como "memoria" y configuración para cualquier asistente de IA (como yo) que trabaje en el proyecto **Crónicas de la Penumbra**. 

## 1. Identidad del Proyecto
- **Nombre**: Crónicas de la Penumbra
- **Género**: Aventura interactiva de texto / Novela interactiva.
- **Tono**: Baja Fantasía (Low Fantasy), terror, realista, crudo, oscuro ("Grimdark"). 
- **Reglas del Mundo**: Sin magia espectacular, sin viajes interdimensionales, sin tecnología moderna. La muerte es permanente y realista.

## 2. Stack Tecnológico
- **Frontend**: React (19) con TypeScript, construido con Vite.
- **Backend / AI**: Vercel Serverless Functions (`/api/game.ts`).
- **Motor de IA**: Gemini 3.8 Flash (Google GenAI SDK con memoria continua multiturno y systemInstruction dedicada).
- **Despliegue**: GitHub + Vercel.

## 3. Protocolos de Seguridad Críticos
- **NUNCA** exponer la variable de entorno `GEMINI_API_KEY` en el cliente (frontend).
- Toda llamada a la API de Gemini **DEBE** hacerse desde `/api/game.ts` (entorno Node.js seguro de Vercel).
- El cliente (frontend) se comunica con el backend mediante peticiones `fetch('/api/game', ...)`.

## 4. Flujo de Trabajo (Workflow)
Cuando el usuario pida añadir una característica, modificar la historia o arreglar un bug:
1. **Analizar**: Revisar `types.ts` y la función serverless en `api/game.ts` para asegurar que el prompt de Gemini encaja con el modelo de datos.
2. **Implementar**: Modificar el código frontend o backend según sea necesario.
3. **Verificar**: Asegurarse de que el proyecto compila y funciona (localmente).
4. **Desplegar**: 
   - Ejecutar `git add .`
   - Ejecutar `git commit -m "Descripción de los cambios"`
   - Ejecutar `git push`
   - *Nota: Al hacer push a GitHub, Vercel detectará el cambio y compilará la nueva versión automáticamente.*

## 5. Mantenimiento del Prompt Narrativo
El "Game Master" está definido en `api/game.ts`. Cualquier ajuste en el tono del juego, la dificultad, el control de inventario o el formato de las respuestas (JSON), debe realizarse modificando los prompts dentro de este archivo.

## 6. Los Cuatro Pilares de la Renovación (Arquitectura V4)
1. **Pilar 1 — Motor Narrativo Élite**:
   - `gemini-3.8-flash` con `systemInstruction` dedicada para erradicar amnesias y clichés.
   - Crónica multiturno continua (ventana deslizante de turnos recientes + estado mecánico inyectado).
   - Control de ritmo dramático mediante `tensionLevel` (`calma`, `sospecha`, `tension`, `peligro`, `combate`, `agonico`).
2. **Pilar 2 — Dramatis Personae & Cartografía Sensorial**:
   - Registro dinámico de PNJs (`NPC`: estado vital, afinidad, notas, ubicación) con dossier interactivo (Hablar, Examinar, Intimidar, Atacar, Acción libre).
   - Cartografía táctica (`LocationInfo`: iluminación, peligro, salidas interactivas con click-to-action).
   - Exportación de crónicas en PDF con árbol genealógico de almas conocidas y mapa de pasos recorridos.
3. **Pilar 3 — UI/UX & Atmósfera Reactiva**:
   - Viñetas de pantalla y marco de crónica que reaccionan visualmente en tiempo real a la tensión.
   - Controles de velocidad de lectura (`1x`, `2x`, `Directo` con persistencia en `localStorage`) y atajos de teclado (`Espacio`/`Enter` para saltar).
   - Atajos numéricos directos `[1]`, `[2]`, `[3]`, `[4]` para decisiones tácticas y susurros narrativos durante la carga.
4. **Pilar 4 — Audio Adaptativo & Procedural (Web Audio API)**:
   - Sintetizador puro multi-capa (Drone, Cuerdas, Piano, Materia, Campanas, Coro, Subbass).
   - Tambores de guerra procedurales automáticos en combates.
   - Filtro acústico de shock/túnel auditivo en agonía y golpes disonantes en escaladas de peligro.
   - Selector y mezclador interactivo en cabecera con palanca de Dramatismo Reactivo.

---
**Nota para el usuario**: Siempre que me pidas algo nuevo, usaré este contexto para mantener la esencia oscura del juego y la seguridad de la arquitectura.
