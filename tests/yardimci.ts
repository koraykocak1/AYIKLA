import { mkdtemp, writeFile } from 'node:fs/promises';
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

/** Gürültülü (iyi sıkışmayan) bir JPEG: boyutu genişlik×yükseklikle büyür. */
export async function gurultuJpeg(genislik: number, yukseklik: number, tohum = 1): Promise<Buffer> {
  const v = Buffer.alloc(genislik * yukseklik * 3);
  let s = tohum * 2654435761;
  for (let i = 0; i < v.length; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    v[i] = s >>> 24;
  }
  return sharp(v, { raw: { width: genislik, height: yukseklik, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
}

/**
 * Nikon NEF yapısını taklit eden küçük bir TIFF: IFD0'da yön (Orientation) ve SubIFD listesi;
 * bir SubIFD ham görüntünün boyutunu, diğerleri gömülü JPEG önizlemeleri taşır.
 */
export async function sahteNef(
  yol: string,
  s: { jpegler: Buffer[]; yon?: number; genislik?: number; yukseklik?: number },
): Promise<void> {
  const k = s.jpegler.length;
  const ifd0Boyu = 2 + 4 * 12 + 4;
  const altBoyu = 2 + 3 * 12 + 4;
  const ifd0 = 8;
  const dizi = ifd0 + ifd0Boyu;
  const hamIfd = dizi + (k + 1) * 4;
  const jpegIfd = (i: number) => hamIfd + altBoyu * (i + 1);
  let veriOfs = hamIfd + altBoyu * (k + 1);
  const jpegOfs = s.jpegler.map((j) => {
    const o = veriOfs;
    veriOfs += j.length;
    return o;
  });
  const b = Buffer.alloc(veriOfs);
  b.write('II', 0, 'latin1');
  b.writeUInt16LE(42, 2);
  b.writeUInt32LE(ifd0, 4);
  const ifd = (o: number, girisler: [number, number, number][]) => {
    b.writeUInt16LE(girisler.length, o);
    girisler.forEach(([etiket, tip, deger], i) => {
      const e = o + 2 + i * 12;
      b.writeUInt16LE(etiket, e);
      b.writeUInt16LE(tip, e + 2);
      b.writeUInt32LE(etiket === 0x14a ? k + 1 : 1, e + 4);
      if (tip === 3) b.writeUInt16LE(deger, e + 8);
      else b.writeUInt32LE(deger, e + 8);
    });
    b.writeUInt32LE(0, o + 2 + girisler.length * 12);
  };
  ifd(ifd0, [[0x100, 4, 160], [0x101, 4, 120], [0x112, 3, s.yon ?? 1], [0x14a, 4, dizi]]);
  b.writeUInt32LE(hamIfd, dizi);
  s.jpegler.forEach((_, i) => b.writeUInt32LE(jpegIfd(i), dizi + 4 * (i + 1)));
  ifd(hamIfd, [[0x100, 4, s.genislik ?? 6000], [0x101, 4, s.yukseklik ?? 4000], [0x103, 3, 34713]]);
  s.jpegler.forEach((j, i) => {
    ifd(jpegIfd(i), [[0x103, 3, 6], [0x201, 4, jpegOfs[i]], [0x202, 4, j.length]]);
    j.copy(b, jpegOfs[i]);
  });
  await writeFile(yol, b);
}
