import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const RATE = 48000;

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function env(n, attack, hold) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const a = Math.min(1, p / attack);
    const d = Math.exp(-((p - hold) * 8));
    out[i] = p < hold ? a : a * Math.max(0, d);
  }
  return out;
}

const sounds = {
  tick() {
    const n = Math.floor(RATE * 0.05);
    const e = env(n, 0.02, 0.08);
    return Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 2100 * (i / RATE)) * e[i] * 0.7);
  },
  click() {
    const n = Math.floor(RATE * 0.04);
    const e = env(n, 0.01, 0.05);
    let s = 0;
    return Array.from({ length: n }, (_, i) => {
      s = s * 0.4 + (Math.random() * 2 - 1) * 0.6;
      return s * e[i];
    });
  },
  ui() {
    const n = Math.floor(RATE * 0.12);
    return Array.from({ length: n }, (_, i) => {
      const t = i / RATE;
      const e = Math.exp(-t * 28);
      return (Math.sin(2 * Math.PI * 660 * t) * 0.6 + Math.sin(2 * Math.PI * 990 * t) * 0.25) * e;
    });
  },
  whoosh() {
    const n = Math.floor(RATE * 0.48);
    let lp = 0;
    return Array.from({ length: n }, (_, i) => {
      const p = i / n;
      const noise = Math.random() * 2 - 1;
      const cutoff = 0.04 + p * 0.45;
      lp += cutoff * (noise - lp);
      const e = Math.sin(Math.PI * p) ** 0.85;
      return lp * e * 1.4;
    });
  },
  chime() {
    const n = Math.floor(RATE * 0.45);
    return Array.from({ length: n }, (_, i) => {
      const t = i / RATE;
      const e = Math.exp(-t * 6);
      return (Math.sin(2 * Math.PI * 880 * t) * 0.55 + Math.sin(2 * Math.PI * 1320 * t) * 0.2) * e;
    });
  },
  thud() {
    const n = Math.floor(RATE * 0.32);
    return Array.from({ length: n }, (_, i) => {
      const t = i / RATE;
      const e = Math.exp(-t * 10);
      return (Math.sin(2 * Math.PI * 95 * t) * 0.9 + (Math.random() * 2 - 1) * 0.08 * Math.exp(-t * 40)) * e;
    });
  },
};

export function synthKit(dir) {
  mkdirSync(dir, { recursive: true });
  for (const [name, make] of Object.entries(sounds)) {
    const samples = make();
    let peak = 0;
    for (const s of samples) peak = Math.max(peak, Math.abs(s));
    const gain = peak > 0 ? 0.9 / peak : 1;
    writeFileSync(path.join(dir, `${name}.wav`), wav(samples.map((s) => s * gain)));
  }
  return dir;
}
