"use client";

let audioContext: AudioContext | null = null;
let ambientCleanup: (() => void) | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const browserWindow = window as AudioWindow;
  const AudioContextCtor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  audioContext = new AudioContextCtor();
  return audioContext;
}

async function resumeAudio() {
  const context = getAudioContext();
  if (!context) return null;

  try {
    if (context.state === "suspended") await context.resume();
  } catch {
    return null;
  }

  return context;
}

export async function playAlienCue(kind: "activate" | "select" | "success" = "select") {
  const context = await resumeAudio();
  if (!context) return;

  const now = context.currentTime;
  const duration = kind === "success" ? 0.5 : kind === "activate" ? 0.58 : 0.34;
  const peak = kind === "success" ? 0.055 : 0.04;

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(peak, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, now);
  filter.frequency.exponentialRampToValueAtTime(1300, now + duration);
  filter.connect(master);

  const lead = context.createOscillator();
  lead.type = "sine";
  lead.frequency.setValueAtTime(kind === "activate" ? 190 : 240, now);
  lead.frequency.exponentialRampToValueAtTime(kind === "success" ? 780 : 620, now + duration * 0.62);
  lead.frequency.exponentialRampToValueAtTime(kind === "success" ? 540 : 410, now + duration);
  lead.connect(filter);

  const shimmer = context.createOscillator();
  shimmer.type = "triangle";
  shimmer.detune.setValueAtTime(-18, now);
  shimmer.frequency.setValueAtTime(kind === "activate" ? 380 : 470, now);
  shimmer.frequency.exponentialRampToValueAtTime(kind === "success" ? 1180 : 920, now + duration * 0.72);
  shimmer.frequency.exponentialRampToValueAtTime(kind === "success" ? 820 : 680, now + duration);
  shimmer.connect(filter);

  lead.start(now);
  shimmer.start(now);
  lead.stop(now + duration + 0.02);
  shimmer.stop(now + duration + 0.02);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function scheduleAmbientPulse(context: AudioContext, output: GainNode, timer: { id: number | null; active: boolean }) {
  if (!timer.active) return;

  const now = context.currentTime + 0.04;
  const duration = randomBetween(1.8, 4.2);
  const base = randomBetween(110, 180);
  const glide = randomBetween(240, 520);

  const drone = context.createOscillator();
  drone.type = Math.random() > 0.55 ? "sine" : "triangle";
  drone.frequency.setValueAtTime(base, now);
  drone.frequency.exponentialRampToValueAtTime(glide, now + duration * 0.62);
  drone.frequency.exponentialRampToValueAtTime(base * randomBetween(1.1, 1.35), now + duration);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(randomBetween(0.008, 0.017), now + randomBetween(0.18, 0.4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(randomBetween(900, 1500), now);
  filter.Q.setValueAtTime(randomBetween(0.7, 1.4), now);

  drone.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  drone.start(now);
  drone.stop(now + duration + 0.05);

  timer.id = window.setTimeout(() => scheduleAmbientPulse(context, output, timer), (duration + randomBetween(0.15, 0.8)) * 1000);
}

function playCommunicationChirp(context: AudioContext, output: GainNode) {
  const now = context.currentTime + 0.02;
  const duration = randomBetween(0.12, 0.3);
  const carrier = context.createOscillator();
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(randomBetween(650, 1050), now);
  carrier.frequency.exponentialRampToValueAtTime(randomBetween(1500, 2600), now + duration * 0.55);
  carrier.frequency.exponentialRampToValueAtTime(randomBetween(500, 900), now + duration);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(randomBetween(0.006, 0.012), now + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(randomBetween(1100, 1900), now);
  filter.Q.setValueAtTime(randomBetween(1.6, 3), now);

  carrier.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  carrier.start(now);
  carrier.stop(now + duration + 0.03);
}

function playNeuralCrackle(context: AudioContext, output: GainNode) {
  const duration = 0.22;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    const progress = i / Math.max(1, length - 1);
    const fadeIn = Math.min(1, progress / 0.14);
    const fadeOut = Math.min(1, (1 - progress) / 0.32);
    const envelope = fadeIn * fadeOut;
    channel[i] = (Math.random() * 2 - 1) * envelope * 0.55;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(randomBetween(900, 1800), context.currentTime);
  filter.Q.setValueAtTime(0.7, context.currentTime);

  const envelope = context.createGain();
  const now = context.currentTime;
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(randomBetween(0.0009, 0.0022), now + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  source.onended = () => {
    try {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    } catch {}
  };
  source.start();
}

export async function startNeuralAmbient() {
  if (ambientCleanup) return true;

  const context = await resumeAudio();
  if (!context) return false;

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.82, context.currentTime + 1.2);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2100, context.currentTime);
  filter.Q.setValueAtTime(0.6, context.currentTime);
  master.connect(filter);
  filter.connect(context.destination);

  const lowDrone = context.createOscillator();
  lowDrone.type = "sine";
  lowDrone.frequency.setValueAtTime(52, context.currentTime);
  lowDrone.frequency.linearRampToValueAtTime(66, context.currentTime + 7);
  lowDrone.connect(master);
  lowDrone.start();

  const slowPulse = context.createOscillator();
  slowPulse.type = "triangle";
  slowPulse.frequency.setValueAtTime(0.12, context.currentTime);

  const slowPulseGain = context.createGain();
  slowPulseGain.gain.setValueAtTime(0.002, context.currentTime);
  slowPulse.connect(slowPulseGain);
  slowPulseGain.connect(master);
  slowPulse.start();

  const pulseTimer = { id: null as number | null, active: true };
  const chatterTimer = { id: null as number | null, active: true };

  scheduleAmbientPulse(context, master, pulseTimer);

  const scheduleChatter = () => {
    if (!chatterTimer.active) return;
    const next = randomBetween(4500, 11500);
    if (Math.random() > 0.28) playCommunicationChirp(context, master);
    if (Math.random() > 0.48) window.setTimeout(() => {
      if (chatterTimer.active) playNeuralCrackle(context, master);
    }, randomBetween(180, 520));
    chatterTimer.id = window.setTimeout(scheduleChatter, next);
  };
  scheduleChatter();

  ambientCleanup = () => {
    pulseTimer.active = false;
    chatterTimer.active = false;
    if (pulseTimer.id !== null) window.clearTimeout(pulseTimer.id);
    if (chatterTimer.id !== null) window.clearTimeout(chatterTimer.id);

    const stopAt = context.currentTime + 0.45;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    lowDrone.stop(stopAt);
    slowPulse.stop(stopAt);

    window.setTimeout(() => {
      try {
        master.disconnect();
        filter.disconnect();
      } catch {}
    }, 650);

    ambientCleanup = null;
  };

  return true;
}

export function stopNeuralAmbient() {
  ambientCleanup?.();
}

export function isNeuralAmbientRunning() {
  return Boolean(ambientCleanup);
}

export function hasNeuralAudioSupport() {
  if (typeof window === "undefined") return false;
  const browserWindow = window as AudioWindow;
  return Boolean(window.AudioContext ?? browserWindow.webkitAudioContext);
}
