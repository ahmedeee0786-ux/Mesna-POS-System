import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function VoiceAssistant({ onCommand, showToast }) {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const samplesRef = useRef([]);
  const nativeSampleRateRef = useRef(44100); // will be set when AudioContext starts

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) processorRef.current.disconnect();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  /**
   * Resample a Float32Array from one sample rate to 16kHz using OfflineAudioContext.
   * This is the reliable, browser-native way to do sample-rate conversion.
   */
  const resampleTo16kHz = async (float32Array, fromSampleRate) => {
    const targetSampleRate = 16000;
    if (fromSampleRate === targetSampleRate) return float32Array;

    const numOutputSamples = Math.ceil(float32Array.length * targetSampleRate / fromSampleRate);

    // Create an offline context at the TARGET sample rate
    const offlineCtx = new OfflineAudioContext(1, numOutputSamples, targetSampleRate);

    // Create a source buffer at the NATIVE sample rate
    const audioBuffer = offlineCtx.createBuffer(1, float32Array.length, fromSampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampled = await offlineCtx.startRendering();
    return resampled.getChannelData(0);
  };

  const startRecording = async () => {
    // Check if browser context is secure (getUserMedia is blocked on HTTP from non-localhost IPs)
    if (!window.isSecureContext) {
      showToast('error', '🎙️ Voice blocked: Microphone requires HTTPS or localhost. For LAN access, enable Chrome flag: chrome://flags/#unsafely-treat-insecure-origin-as-secure');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('error', '🎙️ Microphone API not supported by your browser.');
      return;
    }

    try {
      samplesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Use browser's native sample rate – we'll resample to 16kHz later via OfflineAudioContext
      // Do NOT force sampleRate: 16000 here – browsers often silently ignore it
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioCtxRef.current = audioContext;

      // Save the native sample rate so we can resample correctly later
      nativeSampleRateRef.current = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);

      // ScriptProcessorNode is deprecated but still works universally in all browsers offline
      // bufferSize of 4096 gives ~93ms chunks at 44.1kHz – stable and low-dropout
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        // Clone the data immediately – the underlying buffer is recycled by the browser
        const channelData = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(channelData)); // ← copy, not reference
      };

      source.connect(processor);
      // Must connect to destination for ScriptProcessor to fire onaudioprocess
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showToast('error', '🎙️ Microphone access denied. Please click Allow when the browser asks.');
      } else if (err.name === 'NotFoundError') {
        showToast('error', '🎙️ No microphone found. Please connect a microphone and try again.');
      } else {
        showToast('error', `🎙️ Microphone error: ${err.message}`);
      }
    }
  };

  const stopRecording = async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      await audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setProcessing(true);

    // Merge all captured Float32 chunks into a single array
    const chunks = samplesRef.current;
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

    if (totalLength === 0) {
      setProcessing(false);
      showToast('error', '⚠ No audio captured. Is your microphone muted?');
      return;
    }

    const rawAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      rawAudio.set(chunk, offset);
      offset += chunk.length;
    }

    try {
      showToast('success', '🤖 Analyzing voice command locally...');

      // Resample from browser's native rate (usually 44100 or 48000) → 16000 Hz
      // This is what Whisper expects
      const audio16k = await resampleTo16kHz(rawAudio, nativeSampleRateRef.current);

      // IMPORTANT: float32Array.buffer may be a SHARED ArrayBuffer if the Float32Array
      // was created as a subview. We must slice it to get an owned copy for transfer.
      const ownedBuffer = audio16k.buffer.slice(
        audio16k.byteOffset,
        audio16k.byteOffset + audio16k.byteLength
      );

      const response = await axios.post('/api/voice/command', ownedBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });

      if (response.data && response.data.success) {
        if (response.data.action && response.data.action !== 'unknown' && response.data.action !== 'none') {
          onCommand(response.data);
        } else if (response.data.text && response.data.text.trim()) {
          showToast('error', `⚠ Unrecognized command: "${response.data.text}"`);
        } else {
          showToast('error', '⚠ Could not understand speech. Please speak clearly and try again.');
        }
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      if (err.response) {
        showToast('error', `❌ Backend error ${err.response.status}: ${err.response.data?.error || 'Unknown error'}`);
      } else if (err.code === 'ERR_NETWORK') {
        showToast('error', '❌ Cannot connect to backend. Make sure the POS server is running on port 3001.');
      } else {
        showToast('error', '❌ Voice processing error. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end">
      
      {/* Help tooltip with voice instructions */}
      {showTips && (
        <div className="mb-3 bg-slate-900 border border-surface-border text-slate-200 p-4 rounded-2xl shadow-2xl w-64 text-xs animate-slide-up select-none">
          <h4 className="font-bold text-slate-100 mb-2 border-b border-surface-border pb-1 flex items-center gap-1.5">
            <span>🎙️</span> AI Voice POS Commands
          </h4>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
            <li><strong>Add Product:</strong> <span className="text-brand-300">"Add Milk"</span> or just <span className="text-brand-300">"Coca Cola"</span></li>
            <li><strong>Apply Discount:</strong> <span className="text-brand-300">"Discount 10 percent"</span> or <span className="text-brand-300">"Das percent discount"</span></li>
            <li><strong>Remove Item:</strong> <span className="text-brand-300">"Remove bread"</span> or <span className="text-brand-300">"Nikaalo doodh"</span></li>
            <li><strong>Payment:</strong> <span className="text-brand-300">"Payment card"</span> or <span className="text-brand-300">"Checkout bill"</span></li>
            <li><strong>Clear Cart:</strong> <span className="text-brand-300">"Clear cart"</span> or <span className="text-brand-300">"Khali karo"</span></li>
          </ul>
          <p className="text-[10px] text-slate-500 mt-2 italic text-center">Supports English, Urdu &amp; Hindi</p>
          <p className="text-[10px] text-sky-500 mt-1 text-center font-semibold">Click mic → speak → click again to submit</p>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="flex items-center gap-2.5">
        
        {/* Toggle hints indicator */}
        <button
          onClick={() => setShowTips(!showTips)}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
            showTips 
              ? 'bg-slate-800 border-slate-700 text-slate-200' 
              : 'bg-surface-card border-surface-border text-slate-500 hover:text-slate-350'
          }`}
          title="Show voice command tips"
        >
          ?
        </button>

        {/* Microphone triggering button */}
        <button
          onClick={toggleRecording}
          disabled={processing}
          className={`flex items-center gap-2 px-4 py-3 rounded-full border transition-all shadow-xl duration-300 select-none ${
            isRecording 
              ? 'bg-red-600/20 border-red-500 text-red-400 shadow-red-900/30 shadow-lg scale-105 animate-pulse-soft' 
              : processing 
                ? 'bg-brand-900/20 border-brand-500/40 text-brand-400 cursor-wait' 
                : 'bg-surface-card border-surface-border text-slate-300 hover:border-brand-500 hover:text-brand-400 hover:shadow-brand-900/20 hover:shadow-lg active:scale-95'
          }`}
        >
          {isRecording ? (
            <>
              {/* Sound waves animation */}
              <div className="flex items-center gap-0.5 h-3 w-5">
                <span className="w-0.5 h-1 bg-red-400 rounded-full animate-bounce delay-75" style={{ animationDuration: '0.6s' }} />
                <span className="w-0.5 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDuration: '0.4s' }} />
                <span className="w-0.5 h-2 bg-red-400 rounded-full animate-bounce delay-150" style={{ animationDuration: '0.5s' }} />
                <span className="w-0.5 h-4 bg-red-400 rounded-full animate-bounce delay-100" style={{ animationDuration: '0.3s' }} />
                <span className="w-0.5 h-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDuration: '0.4s' }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Listening...</span>
            </>
          ) : processing ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full inline-block" />
              <span className="text-xs font-bold uppercase tracking-wider">Processing...</span>
            </>
          ) : (
            <>
              <span className="text-sm">🎙️</span>
              <span className="text-xs font-bold uppercase tracking-wider">Voice POS</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
