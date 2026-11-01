import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpegYolu from 'ffmpeg-static';

const calistir = promisify(execFile);

export function geciciKlasor(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ayikla-test-'));
}

function desenVerisi(renk: [number, number, number], tohum: number, b: number): Buffer {
  let s = tohum * 7919 + 17;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const kutular = Array.from({ length: 6 }, () => ({
    x: rnd(), y: rnd(), w: 0.1 + rnd() * 0.4, h: 0.1 + rnd() * 0.4, k: rnd() < 0.5 ? -70 : 70,
  }));
  const veri = Buffer.alloc(b * b * 3);
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      let ek = (((x * 7 + y * 13) % 17) - 8) * 3; // ince doku: netlik için
      for (const k of kutular) {
        if (x / b >= k.x && x / b < k.x + k.w && y / b >= k.y && y / b < k.y + k.h) ek += k.k;
      }
      for (let c = 0; c < 3; c++) veri[(y * b + x) * 3 + c] = Math.max(0, Math.min(255, renk[c] + ek));
    }
  }
  return veri;
}

/** Tohuma göre farklı kutular + ince doku içeren, net bir resim üretir. */
export async function desenliResim(
  yol: string,
  secenek: { renk: [number, number, number]; tohum: number; boyut?: number },
): Promise<void> {
  const b = secenek.boyut ?? 256;
  await sharp(desenVerisi(secenek.renk, secenek.tohum, b), { raw: { width: b, height: b, channels: 3 } })
    .jpeg({ quality: 92 })
    .toFile(yol);
}

export async function bulanikResim(yol: string, tohum: number): Promise<void> {
  await sharp(desenVerisi([120, 140, 160], tohum, 256), { raw: { width: 256, height: 256, channels: 3 } })
    .blur(12)
    .jpeg()
    .toFile(yol);
}

export async function karanlikResim(yol: string): Promise<void> {
  await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 3, g: 3, b: 3 } } })
    .jpeg()
    .toFile(yol);
}

export async function exifliResim(yol: string, exifTarihi: string): Promise<void> {
  await sharp({ create: { width: 64, height: 64, channels: 3, background: '#888888' } })
    .jpeg()
    .withExif({ IFD2: { DateTimeOriginal: exifTarihi } })
    .toFile(yol);
}

export async function ornekVideo(yol: string, renk = 'red', olusturma?: string): Promise<void> {
  const arg = ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=${renk}:s=128x96:d=2`];
  if (olusturma) arg.push('-metadata', `creation_time=${olusturma}`);
  arg.push('-pix_fmt', 'yuv420p', yol);
  await calistir(ffmpegYolu as unknown as string, arg);
}

/** Ortalaması karanlık ama ışıkları ve aydınlatılmış bir figürü olan gece resmi. */
export async function geceResmi(yol: string): Promise<void> {
  const b = 256;
  const v = Buffer.alloc(b * b * 3);
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      let d = 8 + ((x * 7 + y * 13) % 9) - 4;
      if (x >= 110 && x < 150 && y >= 120 && y < 200) d = 90; // aydınlatılmış kişi
      if ((x % 40) < 6 && (y % 40) < 6) d = 250; // ışık zinciri
      for (let c = 0; c < 3; c++) v[(y * b + x) * 3 + c] = d;
    }
  }
  await sharp(v, { raw: { width: b, height: b, channels: 3 } }).jpeg({ quality: 92 }).toFile(yol);
}
