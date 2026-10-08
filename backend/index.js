require('dotenv').config();
const Note = require('./models/Note');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const requireAuth = require('./middleware/auth');
const upload = require('./middleware/upload');
const Document = require('./models/Document');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const app = express();
const { GoogleGenAI } = require('@google/genai');
const chunkText = require('./utils/chunking');
const getEmbedding = require('./utils/embeddings');
const Chunk = require('./models/Chunk');
const { findTopChunks, findTopScored } = require('./utils/similarity');


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, userId: newUser._id, email: newUser.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/documents', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    await parser.destroy();

    const newDoc = await Document.create({
      title: req.body.title || req.file.originalname,
      filename: req.file.originalname,
      filePath: req.file.path,
      extractedText: result.text,
      owner: req.userId,
    });

    const chunks = chunkText(result.text);
    for (const chunkStr of chunks) {
      const embedding = await getEmbedding(chunkStr);
      await Chunk.create({
        text: chunkStr,
        embedding,
        document: newDoc._id,
        owner: req.userId,
      });
    }

    res.status(201).json(newDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/notes', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newNote = await Note.create({ title, content, owner: req.userId });
    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login',async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, userId: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/chat', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const allChunks = await Chunk.find({ owner: req.userId }).populate('document', 'filename');
    if (allChunks.length === 0) {
      return res.json({ answer: 'You have no indexed documents yet. Upload a PDF first.', sources: [] });
    }

    const questionEmbedding = await getEmbedding(question);
    const MIN_SCORE = 0.55;
    const scored = findTopScored(questionEmbedding, allChunks, 4)
  .filter((s) => s.score >= MIN_SCORE);

if (scored.length === 0) {
  return res.json({ answer: "I couldn't find anything relevant in your documents.", sources: [] });
}

const topChunks = scored.map((s) => s.chunk);

    const context = topChunks
      .map((c) => `[Source: ${c.document?.filename}]\n${c.text}`)
      .join('\n\n---\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Answer the question using ONLY the excerpts below. If the answer is not in the excerpts, say you couldn't find it in the user's documents.\n\nExcerpts:\n${context}\n\nQuestion: ${question}`,
    });

    const sources = [...new Set(topChunks.map((c) => c.document?.filename))];
    res.json({ answer: response.text, sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/documents/:id/chat', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;

    const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const questionEmbedding = await getEmbedding(question);
    console.log('Question embedding length:', questionEmbedding.length);

    const allChunks = await Chunk.find({ document: doc._id, owner: req.userId });
    console.log('Number of chunks found:', allChunks.length);

    const topChunks = findTopChunks(questionEmbedding, allChunks, 3);
    console.log('Number of top chunks selected:', topChunks.length);

    const context = topChunks.map((c) => c.text).join('\n\n---\n\n');
    console.log('Context being sent (first 200 chars):', context.slice(0, 200));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Here are the most relevant excerpts from a document:\n\n${context}\n\nBased on these excerpts, answer the following question:\n${question}`,
    });

    res.json({ answer: response.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/notes', requireAuth, async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/notes/:id', requireAuth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/documents', requireAuth, async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/notes/:id', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { title, content },
      { new: true, runValidators: true }
    );
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(updatedNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/notes/:id', requireAuth, async (req, res) => {
  try {
    const deletedNote = await Note.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!deletedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted', deletedNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});