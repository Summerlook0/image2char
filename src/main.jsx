import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { env, pipeline } from '@huggingface/transformers';
import './styles.css';

env.allowLocalModels = false;
env.useBrowserCache = true;
const MODEL_CANDIDATES = [
  'onnx-community/SmolVLM-256M-Instruct-ONNX',
  'Xenova/SmolVLM2-500M-Instruct',
  'Xenova/vit-gpt2'
];
const HISTORY_KEY = 'image2char:profiles:v2';

function promptFor(genre, tone, format, mature) {
  const mode = mature
    ? 'The user confirmed they are 18 or older. Mature mode may include adult relationships, danger, horror, profanity, and sensual themes, but keep sexual content non-graphic, never sexualize minors, and never identify or sexualize a real person.'
    : 'Keep the result suitable for a general audience: no graphic violence, profanity, or sexual content.';
  return `You are image2char, an offline image understanding and fiction tool. ${mode}
First inspect the image carefully. Detect every visible text region, sign, caption, subtitle, UI label, and chat/message bubble. Transcribe text exactly in its original script and language; do not invent text. Then provide a faithful English translation for each detected item. If there is no readable text, say none. Do not identify people or infer sensitive personal traits.
After the OCR section, create a fictional character profile based only on visible, non-sensitive cues. Clearly separate observation from invention.
Genre: ${genre}. Tone: ${tone}. Format: ${format}.
Return exactly these headings:
OCR LANGUAGE: <detected languages or none>
DETECTED TEXT:
- ORIGINAL: <text> | ENGLISH: <translation> | LOCATION: <where it appears>
VISUAL CUES: <observable details>
TITLE: <title>
APPEARANCE: <fictional description>
PERSONALITY: <fictional personality>
BACKSTORY: <fictional backstory>
${format === 'narrative' || format === 'both' ? 'NARRATIVE: <short scene>\n' : ''}${format === 'profile' || format === 'both' ? 'MOTIVATIONS: <fictional motivations>\n' : ''}`;
}

function section(text, name, nextNames) {
  const boundary = nextNames.join('|');
  const match = text.match(new RegExp(`${name}\\s*:?\\s*([\\s\\S]*?)(?=\\n(?:${boundary})\\s*:?|$)`, 'i'));
  return match?.[1]?.trim() || '';
}

function parse(raw) {
  return {
    ocrLanguage: section(raw, 'OCR LANGUAGE', ['DETECTED TEXT', 'VISUAL CUES']),
    detectedText: section(raw, 'DETECTED TEXT', ['VISUAL CUES', 'TITLE']),
    summary: section(raw, 'VISUAL CUES', ['TITLE', 'APPEARANCE']),
    title: section(raw, 'TITLE', ['APPEARANCE']) || 'The Image-Born Character',
    appearance: section(raw, 'APPEARANCE', ['PERSONALITY']),
    personality: section(raw, 'PERSONALITY', ['BACKSTORY']),
    backstory: section(raw, 'BACKSTORY', ['NARRATIVE', 'MOTIVATIONS']),
    narrative: section(raw, 'NARRATIVE', ['MOTIVATIONS']),
    motivations: section(raw, 'MOTIVATIONS', [])
  };
}

async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

function App() {
  const [image, setImage] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [tone, setTone] = useState('Dark');
  const [format, setFormat] = useState('both');
  const [mature, setMature] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready — all processing stays on this device.');
  const [error, setError] = useState('');
  const worker = useRef(null);

  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10))), [history]);

  async function choose(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try { setImage(await prepareImage(file)); setResult(null); setError(''); setStatus('Image ready.'); }
    catch (e) { setError(`Could not read image: ${e.message}`); }
  }

  async function generate() {
    if (!image || (mature && !ageConfirmed)) return;
    setBusy(true); setError('');
    try {
      if (!worker.current) {
        setStatus('Loading a browser-compatible vision model…');
        let lastError = null;
        for (const modelName of MODEL_CANDIDATES) {
          try {
            worker.current = await pipeline('image-to-text', modelName, { device: 'webgpu', dtype: 'q4' });
            break;
          } catch (e) {
            lastError = e;
          }
        }
        if (!worker.current) {
          for (const modelName of MODEL_CANDIDATES) {
            try {
              worker.current = await pipeline('image-to-text', modelName, { device: 'wasm', dtype: 'q4' });
              break;
            } catch (e) {
              lastError = e;
            }
          }
        }
        if (!worker.current) throw lastError || new Error('No compatible image model was available in this browser.');
      }
      setStatus('Reading text bubbles and translating them locally…');
      const output = await worker.current([{ role: 'user', content: [
        { type: 'image', url: image },
        { type: 'text', text: promptFor(genre, tone, format, mature) }
      ] }], { max_new_tokens: 900, do_sample: false });
      const raw = output?.[0]?.generated_text?.at(-1)?.content || output?.[0]?.generated_text || String(output);
      const parsed = parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
      setResult(parsed); setHistory(items => [parsed, ...items].slice(0, 10));
      setStatus('Complete. No image or text was sent to an API.');
    } catch (e) { setError(`The local model could not run: ${e.message}. Try Chrome with hardware acceleration or a smaller image.`); setStatus(''); }
    finally { setBusy(false); }
  }

  async function copy(text) { await navigator.clipboard.writeText(text); setStatus('Copied to clipboard.'); }
  function exportResult() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'image2char-result.json'; link.click(); URL.revokeObjectURL(link.href);
  }

  return <main className="shell">
    <header><div className="mark">✦</div><div><p className="eyebrow">PRIVATE · OFFLINE · NO API KEY</p><h1>image<span>2</span>char</h1></div></header>
    <p className="lede">Read text and chat bubbles in images, translate them to English, and turn visual cues into a character profile — directly in your browser.</p>
    <section className="card controls">
      <label className="upload">{image ? <img src={image} alt="Selected preview" /> : <span>📷<br />Choose an image</span>}<input type="file" accept="image/*" onChange={choose} /></label>
      <div className="fields"><label>Genre<select value={genre} onChange={e => setGenre(e.target.value)}>{['Fantasy','Sci-fi','Mystery','Romance','Horror','Adventure'].map(x => <option key={x}>{x}</option>)}</select></label><label>Tone<select value={tone} onChange={e => setTone(e.target.value)}>{['Cinematic','Playful','Dark','Wholesome','Noir'].map(x => <option key={x}>{x}</option>)}</select></label><label>Output<select value={format} onChange={e => setFormat(e.target.value)}><option value="profile">Profile</option><option value="narrative">Narrative</option><option value="both">Both</option></select></label></div>
      <label className="mature"><input type="checkbox" checked={mature} onChange={e => { setMature(e.target.checked); if (!e.target.checked) setAgeConfirmed(false); }} /> Mature mode (18+)</label>
      {mature && <label className="age"><input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} /> I confirm I am 18 or older.</label>}
      <button disabled={!image || busy || (mature && !ageConfirmed)} onClick={generate}>{busy ? 'Working locally…' : 'Analyze image'}</button><p className="status">{status}</p>{error && <p className="error">{error}</p>}
    </section>
    {result && <section className="card result"><div className="result-head"><div><p className="eyebrow">RESULT</p><h2>{result.title}</h2></div><div><button className="secondary" onClick={() => copy(JSON.stringify(result, null, 2))}>Copy</button><button className="secondary" onClick={exportResult}>Export</button></div></div><article><h3>Detected text · English translation</h3><p className="preserve">{result.ocrLanguage || 'Language not confidently detected'}{result.detectedText ? `\n${result.detectedText}` : '\nNo readable text detected.'}</p><h3>Visual cues</h3><p>{result.summary}</p>{[['Appearance', result.appearance], ['Personality', result.personality], ['Backstory', result.backstory], ['Motivations', result.motivations], ['Narrative', result.narrative]].filter(([, value]) => value).map(([name, value]) => <div key={name}><h3>{name}</h3><p className="preserve">{value}</p></div>)}</article></section>}
    <footer>Models are downloaded and cached by your browser. OCR quality depends on image clarity and the languages supported by the local vision model. Mature mode is for fictional, non-graphic adult themes only.</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
