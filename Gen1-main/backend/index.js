const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SYSTEM_PROMPT = `You are an AI tutor for the GenAI Learning Platform. Your role is to:

1. Generate structured, educational lessons from curriculum outlines or topics
2. Create personalized learning content adapted to different learning styles
3. Provide clear explanations with examples
4. Break down complex topics into digestible sections
5. Suggest interactive exercises and practice questions
6. Maintain an encouraging and supportive tone

When a user provides a topic or curriculum outline:
- Create a structured lesson plan with clear sections
- Include learning objectives
- Provide explanations with real-world examples
- Suggest practice exercises or questions
- Offer tips for better understanding

Format your responses with clear headings, bullet points, and structured content that's easy to read and follow.`;

app.post('/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required', answer: null });
    }

    const prompt = `${SYSTEM_PROMPT}\n\nUser Question/Topic: ${question}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiAnswer = response.text();
    const formattedAnswer = formatEducationalResponse(aiAnswer);

    res.json({ answer: formattedAnswer, success: true });

  } catch (error) {
    console.error('Error with Gemini API:', error);
    let errorMessage = 'Sorry, I encountered an error while processing your request.';
    
    if (error.message.includes('API key')) errorMessage = 'API configuration error. Please check the server configuration.';
    else if (error.message.includes('quota')) errorMessage = 'API quota exceeded. Please try again later.';
    else if (error.message.includes('safety')) errorMessage = 'Content filtered for safety. Please rephrase your question.';

    res.status(500).json({ error: errorMessage, answer: null });
  }
});

function formatEducationalResponse(text) {
  let formatted = text
    .replace(/^(#{1,3})\s*(.+)$/gm, '<strong style="color: #2563eb; font-size: 1.1em;">$2</strong>')
    .replace(/^\* (.+)$/gm, '• $1')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n\n/g, '\n\n')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<strong>$1.</strong> $2');

  return formatted;
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GenAI Learning Backend is running', timestamp: new Date().toISOString() });
});

app.get('/test-ai', async (req, res) => {
  try {
    const result = await model.generateContent('Hello, can you help me learn?');
    const response = await result.response;
    const text = response.text();
    
    res.json({ success: true, message: 'Gemini API connection successful', sample_response: text.substring(0, 100) + '...' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gemini API connection failed', error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', answer: null });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', answer: null });
});

app.listen(PORT, () => {
  console.log(`🚀 GenAI Learning Backend running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Test AI: http://localhost:${PORT}/test-ai`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
});

module.exports = app;
