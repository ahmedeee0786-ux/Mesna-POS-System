const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dynamic import of transformers to avoid load-time lag on main server thread
let pipeline = null;
let transcriber = null;

async function getTranscriber() {
  if (!transcriber) {
    console.log('[Voice AI] Loading Whisper-Tiny model weights locally...');
    // Lazy load the ESM module transformers inside CommonJS wrapper
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    
    // We use the multilingual 'Xenova/whisper-tiny' model
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          console.log(`[Voice AI] Downloading weights: ${progress.file} (${Math.round(progress.loaded / progress.total * 100)}%)`);
        }
      }
    });
    console.log('[Voice AI] Whisper-Tiny loaded successfully.');
  }
  return transcriber;
}

// Helper to map text representation of numbers to digits (English & Urdu/Hindi)
const numberMap = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'paanch': 5, 'chey': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'gyarah': 11, 'barah': 12, 'tera': 13, 'chauda': 14, 'pandra': 15, 'bees': 20, 'tees': 30, 'chalis': 40, 'pachaas': 50
};

function extractNumber(text) {
  // Try finding raw digit
  const digitMatch = text.match(/\d+/);
  if (digitMatch) return parseInt(digitMatch[0]);

  // Try matching words
  const words = text.split(/\s+/);
  for (const word of words) {
    if (numberMap[word] !== undefined) {
      return numberMap[word];
    }
  }
  return null;
}

// POST /api/voice/command - expects raw float32 PCM audio buffer in request body
// ── Security: limit audio body to 10 MB (10_485_760 bytes) to prevent DoS ─────
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

router.post('/command', async (req, res) => {
  try {
    const rawData = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_AUDIO_BYTES) {
        aborted = true;
        req.destroy();
        if (!res.headersSent) {
          res.status(413).json({ error: 'Audio payload too large (max 10 MB)' });
        }
        return;
      }
      rawData.push(chunk);
    });
    req.on('end', async () => {
      if (aborted) return;
      const buffer = Buffer.concat(rawData);
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'No audio data received' });
      }

      // Convert buffer to Float32Array (16kHz mono raw PCM)
      // Slice the buffer's ArrayBuffer to align and isolate the data, preventing RangeErrors
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      const audioData = new Float32Array(arrayBuffer);

      // Guard: minimum 0.5 seconds of audio at 16kHz = 8000 samples
      // Very short clips cause Whisper to hallucinate random words
      if (audioData.length < 8000) {
        console.log(`[Voice AI] Audio too short: ${audioData.length} samples (< 8000). Ignoring.`);
        return res.json({ success: true, text: '', action: 'none' });
      }

      console.log(`[Voice AI] Processing audio: ${audioData.length} samples (~${(audioData.length / 16000).toFixed(1)}s at 16kHz)`);

      const recognizeSpeech = await getTranscriber();

      // Use whisper-tiny optimized settings for short command audio (< 30s clips)
      // Do NOT pass chunk_length_s / stride_length_s for clips shorter than 30s — 
      // it causes over-segmentation artifacts. Let Whisper handle it as one pass.
      const result = await recognizeSpeech(audioData, {
        task: 'transcribe',
        // language: null means Whisper auto-detects language (English, Urdu, Hindi supported)
        // For best results with Urdu/Hindi on whisper-tiny, keep it null for auto-detect
        language: null,
        return_timestamps: false,
      });

      const text = (result.text || '').trim();
      
      // Filter out hallucination artifacts that whisper-tiny produces for noise/silence
      // These are common hallucinations when audio is unclear
      const hallucinationPhrases = [
        'thank you', 'thanks for watching', 'subscribe', 'please subscribe',
        'you', 'the', 'i', '.', ',', '...', 'uh', 'um'
      ];
      const isHallucination = !text || 
        (text.length <= 3 && !/\w{2,}/.test(text)) ||
        hallucinationPhrases.includes(text.toLowerCase());

      if (isHallucination) {
        console.log(`[Voice AI] Filtered hallucination/empty: "${text}"`);
        return res.json({ success: true, text: '', action: 'none' });
      }

      console.log(`[Voice AI] Transcribed: "${text}"`);
      const command = await parseCommand(text);
      res.json({ success: true, text, ...command });
    });
  } catch (error) {
    console.error('[Voice AI] Error transcribing voice:', error);
    res.status(500).json({ error: 'Failed to transcribe audio. Ensure backend dependencies are built.' });
  }
});


// Parse speech transcripts into structured POS commands
async function parseCommand(text) {
  const normalized = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

  // 1. Discount commands (e.g. "discount 10 percent", "discount pachaas percent", "das percent discount")
  if (normalized.includes('discount') || normalized.includes('riayat') || normalized.includes('kam')) {
    const num = extractNumber(normalized);
    if (num !== null) {
      return { action: 'discount', value: num };
    }
  }

  // 2. Clear command (e.g. "clear cart", "clear", "khali karo", "saaf")
  if (normalized.includes('clear') || normalized.includes('empty') || normalized.includes('khali') || normalized.includes('saaf')) {
    return { action: 'clear' };
  }

  // 3. Checkout command (e.g. "checkout", "confirm", "payment", "bill banao", "pay karo")
  if (normalized.includes('checkout') || normalized.includes('confirm') || normalized.includes('pay') || normalized.includes('bill') || normalized.includes('khatam') || normalized.includes('final')) {
    let method = 'cash';
    if (normalized.includes('card') || normalized.includes('cc')) {
      method = 'card';
    }
    return { action: 'checkout', method };
  }

  // 4. Remove item (e.g. "remove milk", "doodh delete karo", "cheeni nikaalo")
  if (normalized.includes('remove') || normalized.includes('delete') || normalized.includes('nikaalo') || normalized.includes('nikal') || normalized.includes('cancel')) {
    let productSearch = normalized
      .replace(/(remove|delete|nikaalo|nikal|cancel|karo|do)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (productSearch.length > 1 && productSearch.length <= 100) {
      // Find matches in DB
      const product = await prisma.product.findFirst({
        where: {
          name: {
            contains: productSearch
          }
        }
      });
      if (product) {
        return { action: 'remove', product };
      }
    }
  }

  // 5. Add item (e.g. "add milk", "doodh add karo", "saib dalo")
  // Extract item query by cleaning up command verbs
  let productQuery = normalized;
  if (normalized.includes('add') || normalized.includes('daalo') || normalized.includes('dalo') || normalized.includes('karo') || normalized.includes('shamil')) {
    productQuery = normalized
      .replace(/(add|daalo|dalo|karo|shamil|do|pleae|please)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (productQuery.length > 1) {
    // Search DB using case-insensitive substring match
    const products = await prisma.product.findMany();
    // Simple fuzzier search: check if query is contained in product name
    const found = products.find(p => 
      p.name.toLowerCase().includes(productQuery) || 
      productQuery.includes(p.name.toLowerCase())
    );

    if (found) {
      return { action: 'add', product: found };
    }
  }

  return { action: 'unknown', text };
}

module.exports = router;
