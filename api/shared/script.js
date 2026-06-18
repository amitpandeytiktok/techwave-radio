// Hindi-RJ script writer for TechWave Radio.
//
// Turns one ranked tech/AI story into a short, energetic Hinglish radio segment
// — Devanagari Hindi sentences the way a real Indian RJ speaks, with English
// tech terms (AI, startup, GPU, model, chip, funding, IPO, launch …) kept in
// English. Groq writes it; on any failure we fall back to a clean templated
// line built from the story's own Hindi title, so the station never goes silent.

const { groqChat, hasGroq } = require('./groq');

const SYSTEM = [
  'तुम "TechWave Radio" के RJ हो — भारत का चौबीसों घंटे चलने वाला technology और AI रेडियो स्टेशन।',
  'तुम्हें एक खबर देकर बोला जाएगा; उसे on-air सुनाने के लिए 2 से 3 छोटे, energetic वाक्य लिखो,',
  'बिल्कुल वैसे जैसे कोई असली Indian radio jockey बोलता है — साफ़, friendly और थोड़ा dramatic।',
  'नियम:',
  '• हिंदी (Devanagari) में लिखो, पर tech के शब्द — AI, startup, GPU, model, chip, app, funding, IPO, launch, update, feature — English में ही रखो।',
  '• कोई emoji नहीं, कोई hashtag नहीं, कोई English translation नहीं, कोई URL नहीं।',
  '• सिर्फ़ बोलने वाली script दो — कोई heading, label या quotation mark नहीं।',
  '• स्टोरी को अपने शब्दों में बताओ, headline को हू-ब-हू मत दोहराओ।',
].join('\n');

function clip(s, n) { return String(s || '').slice(0, n); }

// Clean an LLM (or fallback) line so it is safe to feed to TTS.
function sanitize(line) {
  let s = String(line || '')
    .replace(/```[\s\S]*?```/g, ' ')          // stray code fences
    .replace(/[*_#>`]+/g, ' ')                  // markdown
    .replace(/https?:\/\/\S+/g, ' ')            // any leaked URL
    .replace(/^\s*(RJ|Anchor|Script|Host)\s*[:\-]\s*/i, '')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')  // wrapping quotes/space
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

// Deterministic fallback when Groq is unavailable or errors.
function fallbackLine(story) {
  const t = sanitize(story.titleHi || story.title || '');
  const src = sanitize(story.source || '');
  if (!t) return 'अगली खबर tech और AI की दुनिया से।';
  return src ? `अगली खबर — ${t}। ये report ${src} से है।` : `अगली खबर — ${t}।`;
}

/**
 * Write one Hindi-RJ segment for a story. Always resolves to a non-empty,
 * TTS-safe string (Groq result or templated fallback).
 */
async function rjLine(story) {
  const fb = fallbackLine(story);
  if (!hasGroq()) return fb;
  const user = [
    `Headline: ${clip(story.title, 220)}`,
    story.titleHi ? `Hindi headline: ${clip(story.titleHi, 220)}` : '',
    story.summary ? `Summary: ${clip(story.summary, 600)}` : '',
    story.source ? `Source: ${clip(story.source, 60)}` : '',
    story.beat ? `Beat: ${clip(story.beat, 40)}` : '',
  ].filter(Boolean).join('\n');
  try {
    const out = await groqChat({ system: SYSTEM, user, max_tokens: 200, temperature: 0.75 });
    const line = sanitize(out);
    // Guard against junk / too-short / wrong-script output.
    const hasDeva = /[\u0900-\u097F]/.test(line);
    if (line.length >= 20 && hasDeva) return clip(line, 600);
    return fb;
  } catch (e) {
    console.warn('[script] rjLine fell back:', e.message);
    return fb;
  }
}

// Pre-written station bumpers (no LLM). Idents open the hour, segues bridge
// stories, the sign-off plays just before the loop restarts.
const BUMPERS = {
  ident: [
    'ये है TechWave Radio — technology और AI की दुनिया, चौबीसों घंटे, हिंदी में। चलिए शुरू करते हैं।',
    'आप सुन रहे हैं TechWave Radio, जहाँ tech की हर बड़ी खबर सबसे पहले, सबसे साफ़।',
    'TechWave Radio — दुनिया भर के newsroom से tech और AI की ताज़ा खबरें, सीधे आपके कानों तक।',
  ],
  segue: [
    'चलिए, अगली खबर की ओर।',
    'और अब, tech की दुनिया से एक और update।',
    'रुकिए मत — खबरें जारी हैं।',
    'आगे बढ़ते हैं, ये भी सुन लीजिए।',
  ],
  signoff: [
    'फ़िलहाल इतनी खबरें — TechWave Radio पर बने रहिए, हम लौटते हैं और भी updates के साथ।',
    'ये थीं अभी तक की top tech खबरें। TechWave Radio, हमेशा आपके साथ — सुनते रहिए।',
  ],
};

// Light category lead-ins so good/bad/ugly stories carry the right tone.
const CAT_LEAD = {
  good: 'एक अच्छी खबर — ',
  bad: 'अब एक चिंता वाली खबर — ',
  ugly: 'और ये रही दिन की एक serious खबर — ',
};

function pick(arr, seed) {
  if (!arr.length) return '';
  const i = Math.abs(seed | 0) % arr.length;
  return arr[i];
}

module.exports = { rjLine, fallbackLine, sanitize, BUMPERS, CAT_LEAD, pick };
