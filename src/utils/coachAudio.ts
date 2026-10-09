// Preserve the sampling position across chunks, including non-integer rate ratios.
export class Pcm16Encoder {
  private pending: number[] = [];
  private position = 0;
  constructor(private readonly inputRate: number, private readonly outputRate = 16000) {
    if (inputRate < outputRate || !Number.isFinite(inputRate)) throw new Error("Unsupported sample rate");
  }
  encode(chunk: Float32Array): string {
    this.pending.push(...chunk);
    const samples: number[] = [];
    const ratio = this.inputRate / this.outputRate;
    while (this.position + 1 < this.pending.length) {
      const index = Math.floor(this.position), fraction = this.position - index;
      const sample = Math.max(-1, Math.min(1, this.pending[index] * (1 - fraction) + this.pending[index + 1] * fraction));
      samples.push(Math.round(sample * (sample < 0 ? 32768 : 32767)));
      this.position += ratio;
    }
    const used = Math.min(Math.floor(this.position), this.pending.length);
    this.pending = this.pending.slice(used);
    this.position -= used;
    const bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
    samples.forEach((sample, index) => view.setInt16(index * 2, sample, true));
    return btoa(String.fromCharCode(...bytes));
  }
}
export function decodePcm16(base64: string) {
  if (base64.length > 1400000) throw new Error("Invalid PCM audio");
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  if (bytes.length % 2 || bytes.length > 1024 * 1024) throw new Error("Invalid PCM audio");
  const view = new DataView(bytes.buffer), samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}
