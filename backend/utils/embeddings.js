const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  return response.embeddings[0].values;
}

module.exports = getEmbedding;

