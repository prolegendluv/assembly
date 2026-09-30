// Web Audio API Sound Effects Synthesizer for Tactical Field Operations & Simulation

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

// 1. Tactical Walkie-Talkie / Push-To-Talk Chirp
export function playRadioChirp(type: "open" | "close" = "open") {
    try {
        const ctx = getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        if (type === "open") {
            // High upward chirp: 1200Hz -> 1800Hz
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(1900, now + 0.07);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.09);
        } else {
            // Downward double chirp
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.09);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.11);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
    } catch (e) {
        console.warn("Audio chirp failed:", e);
    }
}

// 2. Emergency Evacuation Siren
let sirenInterval: any = null;
let sirenActive = false;

export function playEmergencyAlarm() {
    if (sirenActive) return;
    sirenActive = true;
    const ctx = getContext();

    function step() {
        if (!sirenActive) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        // Sweeping European/Industrial siren: 650Hz -> 980Hz -> 650Hz
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.linearRampToValueAtTime(980, now + 0.45);
        osc.frequency.linearRampToValueAtTime(650, now + 0.9);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.2, now + 0.85);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.9);

        // Low-pass filter to smooth harshness
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1800;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.92);
    }

    step();
    sirenInterval = setInterval(step, 950);
}

export function stopEmergencyAlarm() {
    sirenActive = false;
    if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
    }
}

export function isEmergencyAlarmActive(): boolean {
    return sirenActive;
}

// 3. Heavy Industrial Ambient Background Noise Simulator
// Simulates factory machinery hum, ventilation drones, diesel engines
let noiseNode: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;

export function startIndustrialNoise(volume: number = 0.15) {
    stopIndustrialNoise();
    try {
        const ctx = getContext();
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Generate pink-ish/brown filtered noise
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        // Machinery low pass & resonant rumble
        const lowPass = ctx.createBiquadFilter();
        lowPass.type = "lowpass";
        lowPass.frequency.value = 320;
        lowPass.Q.value = 3.5; // slight metallic resonance

        noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume, ctx.currentTime);

        noiseNode.connect(lowPass);
        lowPass.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseNode.start();
    } catch (e) {
        console.warn("Noise simulation failed:", e);
    }
}

export function setIndustrialNoiseVolume(vol: number) {
    if (noiseGain && audioCtx) {
        noiseGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime);
    }
}

export function stopIndustrialNoise() {
    if (noiseNode) {
        try {
            noiseNode.stop();
            noiseNode.disconnect();
        } catch { }
        noiseNode = null;
    }
    if (noiseGain) {
        try {
            noiseGain.disconnect();
        } catch { }
        noiseGain = null;
    }
}
