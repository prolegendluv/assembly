// 24kHz PCM16 helpers for AssemblyAI Voice Agent API.
// Mic: Float32 -> Int16 @24kHz -> base64 JSON {type:"input.audio"}
// Playback: reply.audio `data` base64 PCM16 -> AudioContext queue.

export function floatTo16BitPCM(input: Float32Array): Int16Array {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
}

export function base64EncodePCM16(samples: Int16Array): string {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

export function base64DecodePCM16(b64: string): Int16Array {
    try {
        const bin = atob(b64);
        const len = bin.length - (bin.length % 2);
        if (len <= 0) return new Int16Array(0);
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return new Int16Array(bytes.buffer, bytes.byteOffset, len / 2);
    } catch (e) {
        console.warn("base64DecodePCM16 error:", e);
        return new Int16Array(0);
    }
}

// Resample arbitrary input rate -> 24kHz mono.
export function resampleTo24k(input: Float32Array, inRate: number): Float32Array {
    if (inRate === 24000) return input;
    const ratio = inRate / 24000;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const pos = i * ratio;
        const i0 = Math.floor(pos);
        const frac = pos - i0;
        const a = input[i0] ?? 0;
        const b = input[i0 + 1] ?? a;
        out[i] = a + (b - a) * frac;
    }
    return out;
}

export class PlaybackQueue {
    public ctx: AudioContext;
    private cursor = 0;
    private gain: GainNode;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.gain = ctx.createGain();
        this.gain.gain.value = 1.0;
        this.gain.connect(ctx.destination);
    }

    enqueue(pcm16: Int16Array) {
        if (!pcm16 || pcm16.length === 0) return;
        const buf = this.ctx.createBuffer(1, pcm16.length, 24000);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < pcm16.length; i++) ch[i] = pcm16[i] / 32768;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.gain);
        const now = Math.max(this.ctx.currentTime, this.cursor);
        src.start(now);
        this.cursor = now + buf.duration;
    }

    // Call on barge-in (reply.done status=interrupted) to drop queued speech.
    flush() {
        this.cursor = this.ctx.currentTime;
        try {
            this.gain.disconnect();
        } catch { }
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 1.0;
        this.gain.connect(this.ctx.destination);
    }

    close() {
        try {
            this.gain.disconnect();
            if (this.ctx.state !== "closed") {
                this.ctx.close();
            }
        } catch { }
    }
}