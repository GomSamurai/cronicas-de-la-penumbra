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
- **Motor de IA**: Gemini 2.5 Flash (Google GenAI SDK).
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

---
**Nota para el usuario**: Siempre que me pidas algo nuevo, usaré este contexto para mantener la esencia oscura del juego y la seguridad de la arquitectura.
