import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { pipeline, env } from '@huggingface/transformers';
import './styles.css';

env.allowLocalModels = false;
env.useBrowserCache = true;
const MODEL = 'onnx-community/SmolVLM-256M-Instruct-ONNX';
const KEY = 'image2char:profiles';

function promptFor(genre, tone, format) {
  return `You are image2char, a fictional storytelling tool. Study only the visible evidence in this image, then invent a richly specific but non-graphic ${format === 'narrative' ? 'short narrative scene' : format === 'both' ? 'character profile and short narrative' : 'character profile'} in a ${genre} genre with a ${tone} tone. Do not identify people or claim private facts. Do not guess age, ethnicity, health, sexuality, or other sensitive traits. Clearly label inventions as fiction. Return plain text with these headings: TITLE, VISUAL CUES, APPEARANCE, PERSONALITY, BACKSTORY, MOTIVATIONS, NARRATIVE, UNCERTAINTIES. Keep it suitable for a general audience.`;
}

function parse(text) {
  const section = (name) => { const next = text.match(new RegExp(`${name}\\s*:?\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Z ]{2,}:|$)`, 'i')); return next?.[1]?.trim() || ''; };
  return { title: section('TITLE') || 'The Image-Born Character', summary: section('VISUAL CUES'), appearance: section('APPEARANCE'), personality: section('PERSONALITY'), backstory: section('BACKSTORY'), motivations: section('MOTIVATIONS'), narrative: section('NARRATIVE'), uncertainties: section('UNCERTAINTIES') };
}

function App() {
  const [src, setSrc] = useState(''), [file, setFile] = useState(null), [genre, setGenre] = useState('Fantasy'), [tone, setTone] = useState('Cinematic'), [format, setFormat] = useState('profile'), [result, setResult] = useState(null), [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(KEY) || '[]')), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const worker = useRef(null);
  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(history.slice(0, 10))), [history]);
  async function choose(e) { const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return; if (src) URL.revokeObjectURL(src); setFile(f); setSrc(URL.createObjectURL(f)); setResult(null); setError(''); }
  async function generate() {
    if (!file) return; setBusy(true); setError('');
    try {
      if (!worker.current) { setStatus('Loading the offline vision model… first use may take a few minutes.'); worker.current = await pipeline('image-text-to-text', MODEL, { device: 'webgpu', dtype: 'q4f16' }).catch(async () => { setStatus('WebGPU unavailable; switching to compatibility mode…'); return pipeline('image-text-to-text', MODEL, { device: 'wasm', dtype: 'q8' }); }); }
      setStatus('Reading the image and writing a fictional story…');
      const messages = [{ role: 'user', content: [{ type: 'image', url: src }, { type: 'text', text: promptFor(genre, tone, format) }] }];
      const out = await worker.current(messages, { max_new_tokens: 700, do_sample: true, temperature: 0.8 });
      const raw = out?.[0]?.generated_text?.at(-1)?.content || out?.[0]?.generated_text || String(out);
      const parsed = parse(typeof raw === 'string' ? raw : JSON.stringify(raw)); setResult(parsed); setHistory(h => [parsed, ...h].slice(0, 10)); setStatus('Generated locally. The image was not uploaded.');
    } catch (e) { setError(`Local model could not run: ${e.message}. Try Chrome on Android, enable hardware acceleration, or use a smaller image.`); setStatus(''); }
    finally { setBusy(false); }
  }
  const json = result ? JSON.stringify(result, null, 2) : '';
  function perchance() { const r = result || {}; return `// Paste into a Perchance JavaScript section\nlet character = ${JSON.stringify({ name: r.title || 'Image-born character', appearance: r.appearance || '', personality: r.personality || '', backstory: r.backstory || '', motivations: r.motivations || '', narrative: r.narrative || '' }, null, 2)};\n`; }
  async function copy(text) { await navigator.clipboard.writeText(text); setStatus('Copied to clipboard.'); }
  function exportFile() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'image2char-profile.json'; a.click(); }
  return <main className="shell"><header><div className="mark">✦</div><div><p className="eyebrow">PRIVATE IN-BROWSER VISION</p><h1>image<span>2</span>char</h1></div><div className="header-note">NO API KEY<br/><b>IMAGE STAYS LOCAL</b></div></header><section className="intro"><p className="eyebrow">ONE IMAGE. A WHOLE LIFE.</p><h2>Let the image<br/><em>start the story.</em></h2><p className="lede">No account, prompt, or API key required. The model downloads once, then analyzes images directly on your device.</p></section><div className="grid"><section className="panel controls"><div className="section-title"><span>01</span><h3>Source image</h3></div><label className="dropzone">{src ? <img src={src} alt="Selected source"/> : <><strong>Drop an image here</strong><span>or tap to browse · JPG, PNG, WEBP</span></>}<input type="file" accept="image/*" onChange={choose}/></label><div className="split"><label className="field"><span>Genre</span><select value={genre} onChange={e=>setGenre(e.target.value)}>{['Fantasy','Sci-fi','Contemporary','Mystery','Historical','Horror'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>Tone</span><select value={tone} onChange={e=>setTone(e.target.value)}>{['Cinematic','Whimsical','Noir','Tender','Unsettling','Epic'].map(x=><option key={x}>{x}</option>)}</select></label></div><label className="field"><span>Output</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="profile">Character profile</option><option value="narrative">Narrative scene</option><option value="both">Profile + narrative</option></select></label><p className="notice"><b>Android tip:</b> use Chrome, keep the tab open during the first model download, and choose images under 4 MB. Generation is local and may be slower on phones.</p><button className="primary" disabled={!file || busy} onClick={generate}>{busy ? 'Working locally…' : 'Generate from image'} <span>↗</span></button>{status&&<p className="status">{status}</p>}{error&&<p className="error">{error}</p>}</section><section className="panel result"><div className="section-title"><span>02</span><h3>Generated story</h3>{result&&<div className="actions"><button onClick={()=>copy(json)}>Copy JSON</button><button onClick={()=>copy(perchance())}>Perchance</button><button onClick={exportFile}>Export</button></div>}</div>{result?<div className="profile"><p className="eyebrow">{result.summary}</p><h2>{result.title}</h2>{[['Appearance',result.appearance],['Personality',result.personality],['Backstory',result.backstory],['Motivations',result.motivations],['Narrative',result.narrative],['Uncertainties',result.uncertainties]].map(([title,text])=><article key={title}><h4>{title}</h4><p>{text||'Not provided.'}</p></article>)}</div>:<div className="empty"><div className="empty-icon">✧</div><h3>Give it one image.</h3><p>No caption, prompt, context, account, or API key needed.</p></div>}</section></div>{history.length>0&&<section className="history"><div className="section-title"><span>03</span><h3>Recent profiles</h3></div><div className="history-list">{history.slice(0,6).map((x,i)=><button key={i} onClick={()=>setResult(x)}><b>{x.title}</b><span>{x.summary}</span></button>)}</div></section>}<footer><span>image2char · runs in your browser</span><span>Fictional storytelling, not identity inference.</span></footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
