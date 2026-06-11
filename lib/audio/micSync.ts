/**
 * Mic-based beat sync. Listens to the room audio (e.g. a TV backing track) via the
 * microphone, detects beats from low-frequency energy (kick drum ~60–200 Hz), derives
 * a stable BPM + phase, then fires onStable so the progression clock can launch aligned
 * to the next predicted beat.
 *
 * Key constraint: echo-cancellation and noise-suppression MUST be off — otherwise the
 * browser strips out the backing-track audio before we can analyse it.
 */

const FFT_SIZE = 2048;
const MIN_BEAT_INTERVAL_MS = 280;   // max ~215 BPM
const MAX_BEAT_INTERVAL_MS = 1600;  // min ~38 BPM
const STABILITY_BEATS = 4;          // beats needed before we consider BPM stable
const STABILITY_VARIANCE = 0.07;    // max relative deviation allowed (7%)
const HISTORY_SIZE = 16;            // beat timestamps kept for averaging

export type MicSyncCallbacks = {
  onBeat: () => void;                          // fires every detected beat (for flash)
  onBpmUpdate: (bpm: number) => void;          // fires as BPM estimate updates
  onStable: (bpm: number, startDelayMs: number) => void; // fires once when stable
};

export type MicSyncHandle = {
  stop: () => void;
};

export async function startMicSync(cb: MicSyncCallbacks): Promise<MicSyncHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      // These three are CRITICAL — default browser processing removes the backing
      // track from the mic input, making beat detection impossible.
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.0; // no smoothing — we want raw onset spikes
  source.connect(analyser);

  const binWidth = audioCtx.sampleRate / FFT_SIZE;
  const lowBin = Math.max(1, Math.floor(60 / binWidth));
  const highBin = Math.ceil(200 / binWidth);
  const bandSize = highBin - lowBin + 1;
  const freqData = new Uint8Array(analyser.frequencyBinCount);

  let longAvg = 0;          // slow-decaying energy baseline
  let lastBeatMs = 0;
  const beatTimes: number[] = [];
  let firedStable = false;
  let rafId = 0;

  function tick() {
    analyser.getByteFrequencyData(freqData);

    // RMS energy in the kick-drum band
    let sum = 0;
    for (let i = lowBin; i <= highBin; i++) sum += freqData[i] * freqData[i];
    const energy = Math.sqrt(sum / bandSize);

    // Adaptive baseline: exponential moving average with a ~250 ms time constant.
    // Using rAF ≈ 16 ms/frame → α = 1 - exp(-16/250) ≈ 0.062
    const alpha = 0.062;
    longAvg = longAvg === 0 ? energy : longAvg * (1 - alpha) + energy * alpha;

    const now = performance.now();
    const timeSinceLast = now - lastBeatMs;
    const ratio = longAvg > 1 ? energy / longAvg : 0;

    // Beat conditions: spike above baseline, minimum interval, non-silent
    if (
      ratio > 1.45 &&
      timeSinceLast > MIN_BEAT_INTERVAL_MS &&
      energy > 8
    ) {
      lastBeatMs = now;
      beatTimes.push(now);
      if (beatTimes.length > HISTORY_SIZE) beatTimes.shift();
      cb.onBeat();

      const bpm = computeBpm(beatTimes);
      if (bpm) {
        cb.onBpmUpdate(bpm);
        if (!firedStable && isStable(beatTimes)) {
          firedStable = true;
          const delayMs = predictNextBeatDelay(beatTimes);
          cb.onStable(bpm, delayMs);
        }
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function intervals(times: number[]): number[] {
  return times.slice(1).map((t, i) => t - times[i]);
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function computeBpm(times: number[]): number | null {
  if (times.length < 2) return null;
  const ivs = intervals(times).filter(
    (iv) => iv >= MIN_BEAT_INTERVAL_MS && iv <= MAX_BEAT_INTERVAL_MS,
  );
  if (ivs.length === 0) return null;
  const med = median(ivs);
  return Math.round(60000 / med);
}

function isStable(times: number[]): boolean {
  if (times.length < STABILITY_BEATS + 1) return false;
  const recent = times.slice(-(STABILITY_BEATS + 1));
  const ivs = intervals(recent);
  const avg = ivs.reduce((a, b) => a + b, 0) / ivs.length;
  return ivs.every((iv) => Math.abs(iv - avg) / avg < STABILITY_VARIANCE);
}

/** Milliseconds from now until the next predicted beat. Always positive (looks ahead). */
function predictNextBeatDelay(times: number[]): number {
  const recent = times.slice(-STABILITY_BEATS);
  const ivs = intervals(recent);
  const avgInterval = ivs.reduce((a, b) => a + b, 0) / ivs.length;
  const last = times[times.length - 1];
  const now = performance.now();
  let next = last + avgInterval;
  while (next <= now + 20) next += avgInterval; // ensure it's meaningfully in the future
  return next - now;
}
