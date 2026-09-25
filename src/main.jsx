import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'image2char:profiles';
const emptyProfile = { name: 'Unnamed Character', role: 'Wanderer', age: 'Adult', setting: 'A world shaped by the image', appearance: '', personality: '', backstory: '', motivations: '', tags: [] };

function makeProfile({ file, notes, genre, tone, mature }) {
  const subject = notes.trim() || 'the central figure';
  const mode = mature ? 'mature, non-graphic themes' : 'all-ages themes';
  return {
    ...emptyProfile,
    name: subject.length < 34 ? subject.replace(/\.$/, '') : 'The Image-Bearer',
    role: genre === 'Fantasy' ? 'Warden of a hidden frontier' : genre === 'Sci-fi' ? 'Independent orbital scout' : 'Keeper of a complicated secret',
    setting: `${genre} setting with a ${tone.toLowerCase()} atmosphere`,
    appearance: `Visual cues to develop: ${subject}. Preserve the image's apparent palette, silhouette, posture, setting, lighting, and notable accessories. Avoid inventing certainty where the image is ambiguous.`,
    personality: `A ${tone.toLowerCase()} person who notices details others miss. They are observant, self-possessed, and shaped by the tension between what they show and what they protect.`,
    backstory: `In a ${genre.toLowerCase()} world, ${subject} became entangled with an event that made ordinary life impossible. Their past is defined by one choice they still defend—and one consequence they cannot outrun. The image becomes a remembered moment just before their next decisive move.`,
    motivations: `Find the truth behind the image's central mystery; protect someone vulnerable; decide whether the old rules still deserve loyalty. Output mode: ${mode}.`,
    tags: [genre, tone, mature ? 'adult themes' : 'general audience', file ? file.type.split('/')[1] || 'image' : 'visual prompt']
  };
}

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [tone, setTone] = useState('Cinematic');
  const [mature, setMature] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  const [copied, setCopied] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 12))), [history]);
  const canUseMature = adultConfirmed && mature;

  function chooseImage(event) {
    const selected = event.target.files?.[0];
    if (!selected || !selected.type.startsWith('image/')) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected));
  }
  function generate() {
    if (mature && !adultConfirmed) return;
    const next = makeProfile({ file, notes, genre, tone, mature: canUseMature });
    setProfile(next); setHistory(old => [next, ...old.filter(item => item.name !== next.name)]);
  }
  const output = useMemo(() => profile ? JSON.stringify(profile, null, 2) : '', [profile]);
  function download() {
    const blob = new Blob([output], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'image2char-profile.json'; a.click(); URL.revokeObjectURL(a.href);
  }
  async function copy() { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  function perchance() {
    const p = profile || emptyProfile;
    return `// image2char profile export\nlet character = {\n  name: ${JSON.stringify(p.name)},\n  role: ${JSON.stringify(p.role)},\n  appearance: ${JSON.stringify(p.appearance)},\n  personality: ${JSON.stringify(p.personality)},\n  backstory: ${JSON.stringify(p.backstory)},\n  motivations: ${JSON.stringify(p.motivations)},\n  tags: ${JSON.stringify(p.tags)}\n};\n\n// Use in Perchance: {{character.name}} / {{character.backstory}}`;
  }
  async function copyPerchance() { await navigator.clipboard.writeText(perchance()); setCopied(true); setTimeout(() => setCopied(false), 1400); }

  return <main className="shell">
    <header><div className="mark">✦</div><div><p className="eyebrow">CREATIVE VISION WORKBENCH</p><h1>image<span>2</span>char</h1></div><div className="header-note">LOCAL-FIRST<br/><b>PRIVATE BY DEFAULT</b></div></header>
    <section className="intro"><p className="eyebrow">IMAGE → CHARACTER</p><h2>Turn visual cues into a story<br /><em>worth remembering.</em></h2><p className="lede">Upload an image, add context, and shape a character profile for your next story or generator.</p></section>
    <div className="grid">
      <section className="panel controls"><div className="section-title"><span>01</span><h3>Source image</h3></div>
        <label className="dropzone">{preview ? <img src={preview} alt="Selected source" /> : <><strong>Drop an image here</strong><span>or click to browse · JPG, PNG, WEBP · 10 MB max</span></>}<input type="file" accept="image/*" onChange={chooseImage} /></label>
        <label className="field"><span>Context & visual notes</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe anything the image alone cannot establish: names, relationships, world details…" /></label>
        <div className="split"><label className="field"><span>Genre</span><select value={genre} onChange={e => setGenre(e.target.value)}>{['Fantasy','Sci-fi','Contemporary','Mystery','Historical','Horror'].map(x => <option key={x}>{x}</option>)}</select></label><label className="field"><span>Tone</span><select value={tone} onChange={e => setTone(e.target.value)}>{['Cinematic','Whimsical','Noir','Tender','Unsettling','Epic'].map(x => <option key={x}>{x}</option>)}</select></label></div>
        <div className="mature"><label><input type="checkbox" checked={mature} onChange={e => setMature(e.target.checked)} /> Enable mature, non-graphic themes</label>{mature && <label className="confirm"><input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} /> I confirm I am 18 or older</label>}<small>Explicit sexual content, minors, non-consensual sexual content, and sexualized real-person profiles are not supported.</small></div>
        <button className="primary" onClick={generate} disabled={mature && !adultConfirmed}>Generate profile <span>↗</span></button>
      </section>
      <section className="panel result"><div className="section-title"><span>02</span><h3>Character profile</h3><div className="actions">{profile && <><button onClick={copy}>{copied ? 'Copied!' : 'Copy JSON'}</button><button onClick={download}>Export</button><button onClick={copyPerchance}>Perchance</button></>}</div></div>{profile ? <div className="profile"><div className="profile-top"><div><p className="eyebrow">{profile.role}</p><h2>{profile.name}</h2></div><div className="tags">{profile.tags.map(t => <span key={t}>#{t}</span>)}</div></div>{[['Appearance',profile.appearance],['Personality',profile.personality],['Backstory',profile.backstory],['Motivations',profile.motivations]].map(([title,text]) => <article key={title}><h4>{title}</h4><p>{text}</p></article>)}</div> : <div className="empty"><div className="empty-icon">✧</div><h3>Your character is waiting.</h3><p>Upload a source image and generate a profile. Everything stays in this browser until you export it.</p></div>}</section>
    </div>
    {history.length > 0 && <section className="history"><div className="section-title"><span>03</span><h3>Recent profiles</h3></div><div className="history-list">{history.slice(0,6).map((item,i) => <button key={i} onClick={() => setProfile(item)}><b>{item.name}</b><span>{item.role}</span></button>)}</div></section>}
    <footer><span>image2char · local-first creative tooling</span><span>For fictional characters and consenting adults only.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
