import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 8787;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '12mb' }));

app.post('/api/analyze', async (req, res) => {
  const { image, genre = 'Fantasy', tone = 'Cinematic', format = 'profile' } = req.body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) return res.status(400).json({ error: 'A valid image is required.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' });

  const task = format === 'narrative' ? 'Write a vivid short narrative inspired only by the visible evidence in the image.' : format === 'both' ? 'Create a character profile and then a short narrative scene featuring them.' : 'Create a fictional character profile.';
  const prompt = `You are image2char, a careful visual storytelling engine. ${task}\nGenre: ${genre}. Tone: ${tone}.\nInfer only visible, non-sensitive visual cues for the description. Do not identify real people, guess protected traits, age, health, sexuality, or private facts. Make the backstory and personality explicitly fictional inventions inspired by the composition. If age is unclear, describe the character as an adult only when the user has established that; otherwise keep age unspecified. Return valid JSON only with this shape: {"title":"","summary":"","appearance":"","personality":"","backstory":"","motivations":[],"narrative":"","visualCues":[],"uncertainties":[],"contentNote":""}. Keep it richly specific but non-graphic; do not sexualize minors or real people.`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.VISION_MODEL || 'gpt-4o-mini', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image, detail: 'high' } }] }], max_tokens: 1800, temperature: 0.9 }) });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Vision provider request failed.' });
    return res.json(JSON.parse(data.choices?.[0]?.message?.content || '{}'));
  } catch (error) { return res.status(500).json({ error: error.message || 'Unable to analyze image.' }); }
});

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
app.listen(port, () => console.log(`image2char API listening on http://localhost:${port}`));
