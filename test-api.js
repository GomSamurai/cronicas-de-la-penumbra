import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Hola, ¿funcionas?",
    });
    console.log("SUCCESS:", response.text);
  } catch (error) {
    console.error("ERROR:", error);
  }
}

test();
