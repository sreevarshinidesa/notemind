function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findTopChunks(questionEmbedding, chunks, topN = 3) {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map((item) => item.chunk);
}

function findTopScored(questionEmbedding, chunks, topN = 4) {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

module.exports = { cosineSimilarity, findTopChunks, findTopScored };
