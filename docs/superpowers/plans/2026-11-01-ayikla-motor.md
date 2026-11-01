# AYIKLA Motor — Yapım Planı (Plan 1/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bir klasördeki fotoğraf ve videoları okuyup tarihlendiren, yapay zekâ ile sahneye göre gruplayan, kopya/bulanık/karanlık olanları işaretleyen ve istenirse düzenli klasörlere kopyalayan, ekransız çalışan bir "motor" ve onu deneyen bir komut satırı aracı.

**Architecture:** Node.js + TypeScript. Her iş kendi küçük dosyasında (`src/motor/*`): tarayıcı, tarih, önizleme, kalite, parmak izi, sahne puanı, sahne modeli, kayıt, işçi, dışa aktarma. `isci.ts` hepsini sırayla çalıştırır ve olay akışı yayar; Plan 2'deki Electron arayüzü bu olaylarla animasyonu besleyecek. Yapay zekâ modeli bir arayüz (`SahneModeli`) arkasında olduğu için testlerde sahte model kullanılır.

**Tech Stack:** Node 26, TypeScript, tsx (çalıştırma), vitest (test), sharp, exifr, ffmpeg-static + ffprobe-static, heic-convert, @huggingface/transformers 4.x (CLIP: `Xenova/clip-vit-base-patch32`, çeviri: `Xenova/opus-mt-tr-en` — ikisi de Hugging Face'te mevcut, 1 Kasım 2026'da kontrol edildi).

**Tasarım belgesi:** `docs/superpowers/specs/2026-11-01-ayikla-tasarim.md`
**Tasarımdan tek sapma:** Önbellek SQLite yerine **JSON dosyası** (`kayit.json`). Sebep: better-sqlite3 Node 26'da yerel derleme (Visual Studio) isteyebilir; JSON hiçbir kurulum istemez ve birkaç bin dosya için yeterli.

**Kurallar (her görevde geçerli):**
- Kod hiçbir kullanıcı dosyasını silmez, taşımaz, değiştirmez. Yazma yalnızca çalışma klasörüne (`~/.ayikla`) ve dışa aktarma hedefine yapılır.
- Kod içi adlar Türkçe (ASCII), ekrana çıkan metinler Türkçe karakterli.
- Her görev sonunda ilgili testler yeşil olmalı, sonra commit.

---

## Dosya haritası

```
AYIKLA/
  package.json                 bağımlılıklar ve komutlar
  tsconfig.json
  vitest.config.ts
  src/
    turler.d.ts                heic-convert ve ffprobe-static tip bildirimleri
    motor/
      tipler.ts                ortak tipler (MedyaDosyasi, IslenmisMedya, Grup, IsciOlayi…)
      tarayici.ts              klasörde medya dosyalarını bulur
      ffmpeg.ts                video bilgisi (ffprobe) ve kare çıkarma (ffmpeg)
      tarih.ts                 çekim tarihi (EXIF → video → Takeout → dosya adı → dosya tarihi)
      onizleme.ts              küçük resim üretir (HEIC yedeği dahil)
      kalite.ts                netlik ve parlaklık ölçer
      parmakizi.ts             dHash parmak izi, mesafe, kopya kümeleri
      gruplar.ts               hazır gruplar, kullanıcı grubu, ekran görüntüsü adı kontrolü
      sahne-puan.ts            vektör matematiği ve grup seçimi (saf fonksiyonlar)
      sahne-model.ts           CLIP modelini yükler; Türkçe→İngilizce çeviri
      kayit.ts                 JSON önbellek
      isci.ts                  tüm akışı yönetir, olay yayar
      disari-aktar.ts          kopyaları Grup/Yıl/Ay klasörlerine çıkarır
    cli.ts                     komut satırından deneme aracı
  tests/
    yardimci.ts                test resmi/videosu üreten yardımcılar
    tarayici.test.ts  ffmpeg.test.ts  tarih.test.ts  onizleme.test.ts  kalite.test.ts
    parmakizi.test.ts  gruplar.test.ts  sahne-puan.test.ts  kayit.test.ts
    isci.test.ts  disari-aktar.test.ts
```

---

### Task 1: Proje iskeleti

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/turler.d.ts`, `src/motor/tipler.ts`

- [ ] **Step 1: package.json oluştur**

```json
{
  "name": "ayikla",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "ayikla": "tsx src/cli.ts",
    "tip": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Bağımlılıkları kur**

Run (proje klasöründe):
```bash
npm install sharp exifr ffmpeg-static ffprobe-static heic-convert @huggingface/transformers@^4
```
```bash
npm install -D typescript tsx vitest @types/node
```
Expected: hatasız biter, `node_modules` oluşur.

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
```

- [ ] **Step 4: vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 30000, include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5: .gitignore**

```
node_modules/
dist/
*.log
```

- [ ] **Step 6: src/turler.d.ts**

```ts
declare module 'heic-convert' {
  interface Secenek { buffer: Buffer; format: 'JPEG' | 'PNG'; quality?: number }
  export default function convert(secenek: Secenek): Promise<ArrayBuffer>;
}

declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
```

- [ ] **Step 7: src/motor/tipler.ts**

```ts
export type MedyaTuru = 'foto' | 'video';

export interface MedyaDosyasi {
  yol: string;
  tur: MedyaTuru;
  boyut: number;
  degisme: number; // mtimeMs
}

export type TarihKaynagi = 'exif' | 'video' | 'takeout' | 'dosya-adi' | 'dosya-tarihi';

export interface TarihSonucu {
  tarih: Date;
  kaynak: TarihKaynagi;
  tahmini: boolean;
}

export interface KaliteSonucu {
  netlik: number;
  parlaklik: number;
  bulanik: boolean;
  karanlik: boolean;
}

export interface Grup {
  id: string;
  ad: string;
  tarifler: string[]; // CLIP'e verilen İngilizce tarifler
  kullanici?: boolean;
}

export type ElemeNedeni = 'kopya' | 'bulanik' | 'karanlik';

export interface IslenmisMedya {
  anahtar: string;
  yol: string;
  tur: MedyaTuru;
  boyut: number;
  degisme: number;
  tarih: string; // ISO
  tarihKaynagi: TarihKaynagi;
  tahmini: boolean;
  onizlemeler: string[];
  genislik: number;
  yukseklik: number;
  kalite: KaliteSonucu;
  parmakizi: string; // 16 haneli hex
  vektor: number[]; // normalize CLIP vektörü
  grupId: string;
  eleme: ElemeNedeni | null;
  elleGrup?: string;
}

export interface SahneModeli {
  cihaz: string;
  resimVektoru(yol: string): Promise<number[]>;
  metinVektorleri(metinler: string[]): Promise<number[][]>;
}

export type IsciOlayi =
  | { tur: 'basladi'; toplam: number }
  | { tur: 'dosya'; medya: IslenmisMedya; sira: number; toplam: number }
  | { tur: 'okunamadi'; yol: string; hata: string }
  | { tur: 'kopyalar'; anahtarlar: string[] }
  | { tur: 'bitti'; sonuc: IslenmisMedya[] };
```

- [ ] **Step 8: Tip kontrolü**

Run: `npm run tip`
Expected: hata yok.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: motor iskeleti ve ortak tipler"
```

---

### Task 2: Test yardımcıları

**Files:**
- Create: `tests/yardimci.ts`

- [ ] **Step 1: Yardımcıları yaz**

```ts
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
```

- [ ] **Step 2: Tip kontrolü**

Run: `npm run tip`
Expected: hata yok.

- [ ] **Step 3: Commit**

```bash
git add tests/yardimci.ts
git commit -m "test: test resmi ve videosu üreten yardımcılar"
```

---

### Task 3: Tarayıcı

**Files:**
- Create: `src/motor/tarayici.ts`
- Test: `tests/tarayici.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tara, turBul } from '../src/motor/tarayici';
import { geciciKlasor } from './yardimci';

describe('tarayici', () => {
  it('uzantıdan türü bulur', () => {
    expect(turBul('a/IMG_1.JPG')).toBe('foto');
    expect(turBul('a/b.heic')).toBe('foto');
    expect(turBul('a/v.MOV')).toBe('video');
    expect(turBul('a/not.txt')).toBeNull();
  });

  it('alt klasörler dahil medyayı bulur, gizli ve diğer dosyaları atlar', async () => {
    const k = await geciciKlasor();
    await mkdir(join(k, 'alt'));
    await mkdir(join(k, '.gizli'));
    await writeFile(join(k, 'a.jpg'), 'x');
    await writeFile(join(k, 'alt', 'b.mp4'), 'xy');
    await writeFile(join(k, 'not.txt'), 'x');
    await writeFile(join(k, '.gizli', 'c.jpg'), 'x');
    const sonuc = await tara([k]);
    expect(sonuc.map((d) => d.tur)).toEqual(['foto', 'video']);
    expect(sonuc[1].boyut).toBe(2);
  });

  it('aynı dosya iki kez verilirse bir kez sayar; tek dosya da kabul eder', async () => {
    const k = await geciciKlasor();
    await writeFile(join(k, 'a.jpg'), 'x');
    const sonuc = await tara([k, join(k, 'a.jpg')]);
    expect(sonuc).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run tests/tarayici.test.ts`
Expected: FAIL — `Cannot find module '../src/motor/tarayici'`

- [ ] **Step 3: Kodu yaz**

```ts
import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { MedyaDosyasi, MedyaTuru } from './tipler';

const FOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const VIDEO = new Set(['.mp4', '.mov', '.3gp', '.m4v']);

export function turBul(yol: string): MedyaTuru | null {
  const e = extname(yol).toLowerCase();
  if (FOTO.has(e)) return 'foto';
  if (VIDEO.has(e)) return 'video';
  return null;
}

export async function tara(girdiler: string[]): Promise<MedyaDosyasi[]> {
  const sonuc: MedyaDosyasi[] = [];
  const gorulen = new Set<string>();

  async function gez(yol: string): Promise<void> {
    if (basename(yol).startsWith('.')) return;
    let s;
    try {
      s = await stat(yol);
    } catch {
      return;
    }
    if (s.isDirectory()) {
      for (const oge of await readdir(yol)) await gez(join(yol, oge));
      return;
    }
    const tur = turBul(yol);
    if (!tur || gorulen.has(yol)) return;
    gorulen.add(yol);
    sonuc.push({ yol, tur, boyut: s.size, degisme: s.mtimeMs });
  }

  for (const g of girdiler) await gez(g);
  return sonuc.sort((a, b) => a.yol.localeCompare(b.yol));
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npx vitest run tests/tarayici.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/tarayici.ts tests/tarayici.test.ts
git commit -m "feat(motor): klasör tarayıcı"
```

---

### Task 4: FFmpeg yardımcıları

**Files:**
- Create: `src/motor/ffmpeg.ts`
- Test: `tests/ffmpeg.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { videoBilgisi, kareCikar } from '../src/motor/ffmpeg';
import { geciciKlasor, ornekVideo } from './yardimci';

describe('ffmpeg', () => {
  it('süre, boyut ve oluşturma tarihini okur', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'v.mp4');
    await ornekVideo(v, 'red', '2022-05-06T07:08:09Z');
    const b = await videoBilgisi(v);
    expect(b.sure).toBeGreaterThan(1.5);
    expect(b.genislik).toBe(128);
    expect(b.yukseklik).toBe(96);
    expect(b.olusturma?.toISOString()).toBe('2022-05-06T07:08:09.000Z');
  });

  it('tarih etiketi yoksa olusturma null', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'v.mp4');
    await ornekVideo(v);
    expect((await videoBilgisi(v)).olusturma).toBeNull();
  });

  it('videodan kare çıkarır', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'v.mp4');
    await ornekVideo(v);
    const hedef = join(k, 'kare.jpg');
    await kareCikar(v, 1, hedef);
    expect((await stat(hedef)).size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/ffmpeg.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegYolu from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const calistir = promisify(execFile);

export interface VideoBilgisi {
  sure: number;
  genislik: number;
  yukseklik: number;
  olusturma: Date | null;
}

export async function videoBilgisi(yol: string): Promise<VideoBilgisi> {
  const { stdout } = await calistir(ffprobe.path, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', yol,
  ]);
  const j = JSON.parse(stdout);
  const v = (j.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === 'video') ?? {};
  const etiket: string | undefined = j.format?.tags?.creation_time ?? v.tags?.creation_time;
  let olusturma: Date | null = etiket ? new Date(etiket) : null;
  if (olusturma && (Number.isNaN(olusturma.getTime()) || olusturma.getFullYear() < 1990)) olusturma = null;
  return {
    sure: Number(j.format?.duration ?? 0),
    genislik: Number(v.width ?? 0),
    yukseklik: Number(v.height ?? 0),
    olusturma,
  };
}

export async function kareCikar(yol: string, saniye: number, hedef: string): Promise<void> {
  await calistir(ffmpegYolu as unknown as string, [
    '-y', '-v', 'error', '-ss', saniye.toFixed(2), '-i', yol, '-frames:v', '1', '-vf', 'scale=384:-2', hedef,
  ]);
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/ffmpeg.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/ffmpeg.ts tests/ffmpeg.test.ts
git commit -m "feat(motor): video bilgisi ve kare çıkarma"
```

---

### Task 5: Tarih bulma

**Files:**
- Create: `src/motor/tarih.ts`
- Test: `tests/tarih.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { writeFile, stat } from 'node:fs/promises';
import { tarihDosyaAdindan, tarihBul } from '../src/motor/tarih';
import { geciciKlasor, exifliResim, ornekVideo } from './yardimci';

const yerel = (y: number, ay: number, g: number, s = 0, d = 0, sn = 0) => new Date(y, ay - 1, g, s, d, sn);

describe('tarihDosyaAdindan', () => {
  it.each([
    ['IMG_20240812_153000.jpg', yerel(2024, 8, 12, 15, 30, 0)],
    ['PXL_20231101_101112345.jpg', yerel(2023, 11, 1, 10, 11, 12)],
    ['Screenshot_20220304-050607.png', yerel(2022, 3, 4, 5, 6, 7)],
    ['WhatsApp Image 2024-08-12 at 15.30.00.jpeg', yerel(2024, 8, 12, 15, 30, 0)],
    ['IMG-20210102-WA0001.jpg', yerel(2021, 1, 2)],
    ['tatil 2019-07-15.jpg', yerel(2019, 7, 15)],
  ])('%s', (ad, beklenen) => {
    expect(tarihDosyaAdindan(ad)?.getTime()).toBe(beklenen.getTime());
  });

  it('geçersiz tarihleri reddeder', () => {
    expect(tarihDosyaAdindan('IMG_20241399_000000.jpg')).toBeNull();
    expect(tarihDosyaAdindan('foto.jpg')).toBeNull();
    expect(tarihDosyaAdindan('12345678.jpg')).toBeNull();
  });
});

describe('tarihBul', () => {
  it('EXIF tarihini kullanır', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'IMG_20200101_000000.jpg');
    await exifliResim(f, '2023:07:01 10:20:30');
    const s = await stat(f);
    const t = await tarihBul({ yol: f, tur: 'foto', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('exif');
    expect(t.tarih.getTime()).toBe(yerel(2023, 7, 1, 10, 20, 30).getTime());
    expect(t.tahmini).toBe(false);
  });

  it('video oluşturma tarihini kullanır', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'v.mp4');
    await ornekVideo(v, 'red', '2022-05-06T07:08:09Z');
    const s = await stat(v);
    const t = await tarihBul({ yol: v, tur: 'video', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('video');
    expect(t.tarih.toISOString()).toBe('2022-05-06T07:08:09.000Z');
  });

  it('Google Takeout json dosyasını kullanır', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'a.jpg');
    await writeFile(f, 'bozuk-jpeg');
    await writeFile(f + '.supplemental-metadata.json', JSON.stringify({ photoTakenTime: { timestamp: '1600000000' } }));
    const s = await stat(f);
    const t = await tarihBul({ yol: f, tur: 'foto', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('takeout');
    expect(t.tarih.getTime()).toBe(1600000000 * 1000);
  });

  it('dosya adına, en son dosya tarihine düşer', async () => {
    const k = await geciciKlasor();
    const a = join(k, 'IMG_20240812_153000.jpg');
    await writeFile(a, 'x');
    const sa = await stat(a);
    expect((await tarihBul({ yol: a, tur: 'foto', boyut: 1, degisme: sa.mtimeMs })).kaynak).toBe('dosya-adi');

    const b = join(k, 'isimsiz.jpg');
    await writeFile(b, 'x');
    const sb = await stat(b);
    const t = await tarihBul({ yol: b, tur: 'foto', boyut: 1, degisme: sb.mtimeMs });
    expect(t.kaynak).toBe('dosya-tarihi');
    expect(t.tahmini).toBe(true);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/tarih.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import exifr from 'exifr';
import { videoBilgisi } from './ffmpeg';
import type { MedyaDosyasi, TarihSonucu } from './tipler';

function gecerliTarih(y: number, ay: number, g: number, s = 0, d = 0, sn = 0): Date | null {
  if (y < 1990 || y > 2100 || ay < 1 || ay > 12 || g < 1 || g > 31 || s > 23 || d > 59 || sn > 59) return null;
  const t = new Date(y, ay - 1, g, s, d, sn);
  return t.getMonth() === ay - 1 ? t : null;
}

const KALIPLAR: RegExp[] = [
  // IMG_20240812_153000, PXL_20231101_101112345, Screenshot_20220304-050607
  /(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/,
  // WhatsApp Image 2024-08-12 at 15.30.00
  /((?:19|20)\d{2})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})/,
  // 2019-07-15 / 2019_07_15
  /((?:19|20)\d{2})[-_](\d{2})[-_](\d{2})/,
  // IMG-20210102-WA0001
  /(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})(?:\D|$)/,
];

export function tarihDosyaAdindan(ad: string): Date | null {
  for (const k of KALIPLAR) {
    const m = ad.match(k);
    if (!m) continue;
    const s = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
    const t = gecerliTarih(s[0], s[1], s[2], s[3] ?? 0, s[4] ?? 0, s[5] ?? 0);
    if (t) return t;
  }
  return null;
}

async function exifTarihi(yol: string): Promise<Date | null> {
  try {
    const v = await exifr.parse(yol, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const t = v?.DateTimeOriginal ?? v?.CreateDate;
    return t instanceof Date && !Number.isNaN(t.getTime()) && t.getFullYear() >= 1990 ? t : null;
  } catch {
    return null;
  }
}

async function takeoutTarihi(yol: string): Promise<Date | null> {
  for (const aday of [`${yol}.supplemental-metadata.json`, `${yol}.json`]) {
    try {
      const j = JSON.parse(await readFile(aday, 'utf8'));
      const sn = Number(j?.photoTakenTime?.timestamp);
      if (sn > 0) return new Date(sn * 1000);
    } catch {
      // dosya yok veya bozuk: sıradakine geç
    }
  }
  return null;
}

export async function tarihBul(d: MedyaDosyasi): Promise<TarihSonucu> {
  if (d.tur === 'foto') {
    const t = await exifTarihi(d.yol);
    if (t) return { tarih: t, kaynak: 'exif', tahmini: false };
  } else {
    try {
      const t = (await videoBilgisi(d.yol)).olusturma;
      if (t) return { tarih: t, kaynak: 'video', tahmini: false };
    } catch {
      // okunamayan video: sıradaki yönteme geç
    }
  }
  const tk = await takeoutTarihi(d.yol);
  if (tk) return { tarih: tk, kaynak: 'takeout', tahmini: false };
  const ad = tarihDosyaAdindan(basename(d.yol));
  if (ad) return { tarih: ad, kaynak: 'dosya-adi', tahmini: false };
  return { tarih: new Date(d.degisme), kaynak: 'dosya-tarihi', tahmini: true };
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/tarih.test.ts`
Expected: PASS.
Eğer yalnızca "EXIF tarihini kullanır" testi `kaynak: 'dosya-adi'` ile düşerse, sharp `withExif` ile IFD2 yazamıyor demektir. O zaman `tests/yardimci.ts` içindeki `exifliResim` satırını `.withExif({ IFD0: { DateTime: exifTarihi } })` yap, `tarih.ts`'de `pick` listesine `'ModifyDate'` ekle ve `const t = v?.DateTimeOriginal ?? v?.CreateDate ?? v?.ModifyDate;` kullan; testi tekrar çalıştır.

- [ ] **Step 5: Commit**

```bash
git add src/motor/tarih.ts tests/tarih.test.ts tests/yardimci.ts
git commit -m "feat(motor): çekim tarihini bulma (EXIF, video, Takeout, dosya adı)"
```

---

### Task 6: Önizleme

**Files:**
- Create: `src/motor/onizleme.ts`
- Test: `tests/onizleme.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fotoOnizleme, ONIZLEME_BOYUT } from '../src/motor/onizleme';
import { geciciKlasor, desenliResim } from './yardimci';

describe('onizleme', () => {
  it('küçük resim üretir, orijinal boyutu döndürür', async () => {
    const k = await geciciKlasor();
    const kaynak = join(k, 'b.jpg');
    await desenliResim(kaynak, { renk: [100, 150, 200], tohum: 1, boyut: 1000 });
    const hedef = join(k, 'o.jpg');
    const b = await fotoOnizleme(kaynak, hedef);
    expect(b).toEqual({ genislik: 1000, yukseklik: 1000 });
    expect((await sharp(hedef).metadata()).width).toBe(ONIZLEME_BOYUT);
  });

  it('bozuk dosyada hata fırlatır', async () => {
    const k = await geciciKlasor();
    const kaynak = join(k, 'bozuk.jpg');
    await writeFile(kaynak, 'degil');
    await expect(fotoOnizleme(kaynak, join(k, 'o.jpg'))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/onizleme.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

export const ONIZLEME_BOYUT = 384;

function heicMi(yol: string): boolean {
  const e = extname(yol).toLowerCase();
  return e === '.heic' || e === '.heif';
}

async function heicCevir(yol: string): Promise<Buffer> {
  const convert = (await import('heic-convert')).default;
  const cikti = await convert({ buffer: await readFile(yol), format: 'JPEG', quality: 0.9 });
  return Buffer.from(cikti);
}

async function yaz(kaynak: string | Buffer, hedef: string): Promise<{ genislik: number; yukseklik: number }> {
  const m = await sharp(kaynak).metadata();
  await sharp(kaynak)
    .rotate()
    .resize(ONIZLEME_BOYUT, ONIZLEME_BOYUT, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(hedef);
  const dondu = (m.orientation ?? 1) >= 5;
  const g = m.width ?? 0;
  const y = m.height ?? 0;
  return dondu ? { genislik: y, yukseklik: g } : { genislik: g, yukseklik: y };
}

/** Fotoğraftan küçük resim üretir; orijinalin (döndürülmüş) boyutunu döndürür. */
export async function fotoOnizleme(yol: string, hedef: string): Promise<{ genislik: number; yukseklik: number }> {
  try {
    return await yaz(yol, hedef);
  } catch (hata) {
    if (!heicMi(yol)) throw hata;
    return yaz(await heicCevir(yol), hedef);
  }
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/onizleme.test.ts`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/onizleme.ts tests/onizleme.test.ts
git commit -m "feat(motor): küçük resim üretme (HEIC yedeği dahil)"
```

---

### Task 7: Kalite ölçümü

**Files:**
- Create: `src/motor/kalite.ts`
- Test: `tests/kalite.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { kaliteOlc } from '../src/motor/kalite';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim } from './yardimci';

describe('kalite', () => {
  it('net resmi net sayar', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'n.jpg');
    await desenliResim(f, { renk: [120, 130, 140], tohum: 3 });
    const q = await kaliteOlc(f);
    expect(q.bulanik).toBe(false);
    expect(q.karanlik).toBe(false);
  });

  it('bulanık resmi yakalar', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'b.jpg');
    await bulanikResim(f, 3);
    const q = await kaliteOlc(f);
    expect(q.bulanik).toBe(true);
    expect(q.karanlik).toBe(false);
  });

  it('karanlık resmi yakalar, bulanık demez', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'k.jpg');
    await karanlikResim(f);
    const q = await kaliteOlc(f);
    expect(q.karanlik).toBe(true);
    expect(q.bulanik).toBe(false);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/kalite.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import sharp from 'sharp';
import type { KaliteSonucu } from './tipler';

export const BULANIK_ESIK = 80; // Laplace varyansı (256 px gri)
export const KARANLIK_ESIK = 28; // ortalama parlaklık (0-255)

export async function kaliteOlc(onizleme: string): Promise<KaliteSonucu> {
  const { data, info } = await sharp(onizleme)
    .greyscale()
    .resize(256, 256, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let toplam = 0;
  for (let i = 0; i < data.length; i++) toplam += data[i];
  const parlaklik = toplam / data.length;

  // Welford yöntemi: Laplace değerlerinin varyansı, tek geçişte
  let n = 0;
  let ort = 0;
  let m2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
      n++;
      const fark = l - ort;
      ort += fark / n;
      m2 += fark * (l - ort);
    }
  }
  const netlik = n > 0 ? m2 / n : 0;
  const karanlik = parlaklik < KARANLIK_ESIK;
  return { netlik, parlaklik, karanlik, bulanik: !karanlik && netlik < BULANIK_ESIK };
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/kalite.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/kalite.ts tests/kalite.test.ts
git commit -m "feat(motor): netlik ve parlaklık ölçümü"
```

---

### Task 8: Parmak izi ve kopyalar

**Files:**
- Create: `src/motor/parmakizi.ts`
- Test: `tests/parmakizi.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parmakiziHesapla, mesafe, kopyalariBul, KOPYA_ESIK } from '../src/motor/parmakizi';
import { geciciKlasor, desenliResim } from './yardimci';

describe('parmakizi', () => {
  it('aynı resmin farklı boyutları yakın, farklı resimler uzak', async () => {
    const k = await geciciKlasor();
    const a = join(k, 'a.jpg');
    const aBuyuk = join(k, 'a2.jpg');
    const b = join(k, 'b.jpg');
    await desenliResim(a, { renk: [120, 120, 120], tohum: 5, boyut: 256 });
    await desenliResim(aBuyuk, { renk: [120, 120, 120], tohum: 5, boyut: 600 });
    await desenliResim(b, { renk: [120, 120, 120], tohum: 99, boyut: 256 });
    const [pa, pa2, pb] = await Promise.all([a, aBuyuk, b].map(parmakiziHesapla));
    expect(pa).toMatch(/^[0-9a-f]{16}$/);
    expect(mesafe(pa, pa2)).toBeLessThanOrEqual(KOPYA_ESIK);
    expect(mesafe(pa, pb)).toBeGreaterThan(KOPYA_ESIK);
  });

  it('mesafe bit farkını sayar', () => {
    expect(mesafe('0000000000000000', '0000000000000000')).toBe(0);
    expect(mesafe('0000000000000000', '000000000000000f')).toBe(4);
  });

  it('kopya kümesinde en yüksek puanlıyı bırakır', () => {
    const liste = [
      { ad: 'kucuk', parmakizi: '0000000000000000', puan: 1 },
      { ad: 'buyuk', parmakizi: '0000000000000001', puan: 5 },
      { ad: 'baska', parmakizi: 'ffffffffffffffff', puan: 1 },
    ];
    const elenen = kopyalariBul(liste, (x) => x.puan);
    expect([...elenen].map((x) => x.ad)).toEqual(['kucuk']);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/parmakizi.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import sharp from 'sharp';

export const KOPYA_ESIK = 6; // 64 bitten en fazla bu kadar fark → kopya

/** dHash: 9x8 gri resimde yan yana piksellerin karşılaştırması → 64 bit. */
export async function parmakiziHesapla(onizleme: string): Promise<string> {
  const { data } = await sharp(onizleme)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let deger = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      deger = (deger << 1n) | (data[y * 9 + x] < data[y * 9 + x + 1] ? 1n : 0n);
    }
  }
  return deger.toString(16).padStart(16, '0');
}

export function mesafe(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Birbirine çok benzeyenleri kümeler; her kümede en yüksek puanlı kalır, gerisi döner. */
export function kopyalariBul<T extends { parmakizi: string }>(liste: T[], puan: (t: T) => number): Set<T> {
  const elenen = new Set<T>();
  const ziyaret = new Set<number>();
  for (let i = 0; i < liste.length; i++) {
    if (ziyaret.has(i)) continue;
    ziyaret.add(i);
    const kume = [i];
    for (let j = i + 1; j < liste.length; j++) {
      if (!ziyaret.has(j) && mesafe(liste[i].parmakizi, liste[j].parmakizi) <= KOPYA_ESIK) {
        kume.push(j);
        ziyaret.add(j);
      }
    }
    if (kume.length > 1) {
      const enIyi = kume.reduce((a, b) => (puan(liste[b]) > puan(liste[a]) ? b : a));
      for (const k of kume) if (k !== enIyi) elenen.add(liste[k]);
    }
  }
  return elenen;
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/parmakizi.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/parmakizi.ts tests/parmakizi.test.ts
git commit -m "feat(motor): görsel parmak izi ve kopya bulma"
```

---

### Task 9: Gruplar ve sahne puanı

**Files:**
- Create: `src/motor/gruplar.ts`, `src/motor/sahne-puan.ts`
- Test: `tests/gruplar.test.ts`, `tests/sahne-puan.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/gruplar.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { HAZIR_GRUPLAR, kullaniciGrubu, ekranGoruntusuAdiMi } from '../src/motor/gruplar';

describe('gruplar', () => {
  it('hazır listede 10 grup var, id’ler benzersiz', () => {
    expect(HAZIR_GRUPLAR).toHaveLength(10);
    expect(new Set(HAZIR_GRUPLAR.map((g) => g.id)).size).toBe(10);
  });

  it('kullanıcı grubu Türkçe adı korur, İngilizce tarif üretir', () => {
    expect(kullaniciGrubu('Araba', 'car')).toEqual({
      id: 'k-araba', ad: 'Araba', tarifler: ['a photo of a car', 'car'], kullanici: true,
    });
  });

  it('Türkçe karakterli adlardan güvenli id üretir', () => {
    expect(kullaniciGrubu('Düğün Şöleni', 'wedding').id).toBe('k-dugun-soleni');
  });

  it('ekran görüntüsü dosya adlarını tanır', () => {
    expect(ekranGoruntusuAdiMi('Screenshot_20240101-101010.png')).toBe(true);
    expect(ekranGoruntusuAdiMi('Ekran Görüntüsü 2024-01-01.png')).toBe(true);
    expect(ekranGoruntusuAdiMi('IMG_1234.jpg')).toBe(false);
  });
});
```

`tests/sahne-puan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalize, benzerlik, grupSec, ortalamaVektor } from '../src/motor/sahne-puan';
import { DIGER_ID } from '../src/motor/gruplar';

describe('sahne-puan', () => {
  it('normalize birim uzunluk verir', () => {
    const v = normalize([3, 4]);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
  });

  it('benzerlik iç çarpımdır', () => {
    expect(benzerlik([1, 0], [0, 1])).toBe(0);
    expect(benzerlik([1, 0], [1, 0])).toBe(1);
  });

  const gruplar = [
    { grupId: 'kirmizi', vektorler: [[1, 0, 0]] },
    { grupId: 'mavi', vektorler: [[0, 0, 1]] },
  ];

  it('en benzer grubu seçer', () => {
    expect(grupSec(normalize([0.9, 0.1, 0.1]), gruplar).grupId).toBe('kirmizi');
  });

  it('iki grup arasında kararsız kalırsa Diğer der', () => {
    expect(grupSec(normalize([1, 0, 1]), gruplar).grupId).toBe(DIGER_ID);
  });

  it('grup yoksa Diğer', () => {
    expect(grupSec([1, 0, 0], []).grupId).toBe(DIGER_ID);
  });

  it('ortalama vektör normalizedir', () => {
    expect(ortalamaVektor([[1, 0], [0, 1]])[0]).toBeCloseTo(Math.SQRT1_2);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/gruplar.test.ts tests/sahne-puan.test.ts`
Expected: FAIL — modüller bulunamadı.

- [ ] **Step 3: gruplar.ts**

```ts
import type { Grup } from './tipler';

export const DIGER_ID = 'diger';
export const EKRAN_ID = 'ekran';

export const HAZIR_GRUPLAR: Grup[] = [
  { id: 'deniz', ad: 'Deniz / Plaj', tarifler: ['a photo of the sea', 'a photo of a beach', 'ocean waves and sand', 'people swimming in the sea'] },
  { id: 'orman', ad: 'Orman / Doğa', tarifler: ['a photo of a forest', 'trees and green nature', 'a hiking trail in the woods', 'a green park with grass'] },
  { id: 'dag', ad: 'Dağ', tarifler: ['a photo of mountains', 'a mountain landscape', 'a rocky mountain peak'] },
  { id: 'sehir', ad: 'Şehir', tarifler: ['a photo of a city street', 'buildings in a city', 'a town square', 'a historic building'] },
  { id: 'kar', ad: 'Kar', tarifler: ['a snowy landscape', 'a photo of snow', 'winter with snow and ice'] },
  { id: 'gece', ad: 'Gece', tarifler: ['a photo taken at night', 'city lights at night', 'a dark night sky'] },
  { id: 'yemek', ad: 'Yemek', tarifler: ['a photo of food', 'a plate of food on a table', 'a cup of coffee or a drink', 'a restaurant meal'] },
  { id: 'insanlar', ad: 'İnsanlar / Selfie', tarifler: ['a selfie', 'a portrait of a person', 'a group of friends posing', 'people smiling at the camera'] },
  { id: 'hayvan', ad: 'Hayvanlar', tarifler: ['a photo of a cat', 'a photo of a dog', 'an animal', 'a bird'] },
  { id: EKRAN_ID, ad: 'Ekran görüntüsü', tarifler: ['a screenshot of a phone screen', 'a screenshot of an app with text', 'a screenshot of a chat conversation'] },
];

const HARF: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/** Kullanıcının eklediği grup. `ingilizce`, adın İngilizce karşılığıdır (çeviri modelinden gelir). */
export function kullaniciGrubu(ad: string, ingilizce: string): Grup {
  const temiz = ad.trim();
  const ing = ingilizce.trim().toLowerCase();
  const kok = temiz
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (h) => HARF[h])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const tanimli = /^(a|an|the) /.test(ing) ? ing : `a ${ing}`;
  return { id: `k-${kok}`, ad: temiz, tarifler: [`a photo of ${tanimli}`, ing], kullanici: true };
}

export function ekranGoruntusuAdiMi(dosyaAdi: string): boolean {
  return /screenshot|screen[ _-]?shot|ekran g[öo]r[üu]nt[üu]s[üu]|screen_recording/i.test(dosyaAdi);
}
```

- [ ] **Step 4: sahne-puan.ts**

```ts
import { DIGER_ID } from './gruplar';

export interface GrupVektoru {
  grupId: string;
  vektorler: number[][];
}

export const DIGER_ESIK = 0.3; // en iyi grubun olasılığı bunun altındaysa "Diğer"
export const KARARSIZ_FARK = 0.1; // en iyi iki grup bu kadar yakınsa "Diğer"

export function normalize(v: ArrayLike<number>): number[] {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

export function benzerlik(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function ortalamaVektor(vs: number[][]): number[] {
  const t = new Array<number>(vs[0].length).fill(0);
  for (const v of vs) v.forEach((x, i) => (t[i] += x));
  return normalize(t);
}

/** CLIP usulü: benzerlik ×100 → softmax. Kararsız veya zayıf eşleşme "Diğer" olur. */
export function grupSec(resim: number[], gruplar: GrupVektoru[], esik = DIGER_ESIK): { grupId: string; olasilik: number } {
  if (gruplar.length === 0) return { grupId: DIGER_ID, olasilik: 0 };
  const puanlar = gruplar.map((g) => 100 * Math.max(...g.vektorler.map((t) => benzerlik(resim, t))));
  const enBuyuk = Math.max(...puanlar);
  const us = puanlar.map((p) => Math.exp(p - enBuyuk));
  const toplam = us.reduce((a, b) => a + b, 0);
  let en = 0;
  for (let i = 1; i < us.length; i++) if (us[i] > us[en]) en = i;
  const olasilik = us[en] / toplam;
  const sirali = [...us].sort((a, b) => b - a);
  const fark = sirali.length > 1 ? (sirali[0] - sirali[1]) / toplam : 1;
  if (olasilik < esik || fark < KARARSIZ_FARK) return { grupId: DIGER_ID, olasilik };
  return { grupId: gruplar[en].grupId, olasilik };
}
```

- [ ] **Step 5: Geçtiğini gör**

Run: `npx vitest run tests/gruplar.test.ts tests/sahne-puan.test.ts`
Expected: PASS (10 test)

- [ ] **Step 6: Commit**

```bash
git add src/motor/gruplar.ts src/motor/sahne-puan.ts tests/gruplar.test.ts tests/sahne-puan.test.ts
git commit -m "feat(motor): hazır gruplar ve sahne puanlama"
```

---

### Task 10: Kayıt (JSON önbellek)

**Files:**
- Create: `src/motor/kayit.ts`
- Test: `tests/kayit.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { KayitDeposu, anahtarUret } from '../src/motor/kayit';
import { geciciKlasor } from './yardimci';
import type { IslenmisMedya } from '../src/motor/tipler';

const ornek = (anahtar: string): IslenmisMedya => ({
  anahtar, yol: 'C:/a.jpg', tur: 'foto', boyut: 1, degisme: 1, tarih: '2024-01-01T00:00:00.000Z',
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: [], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0000000000000000',
  vektor: [1, 0], grupId: 'diger', eleme: null,
});

describe('kayit', () => {
  it('anahtar yol, boyut ve tarihe bağlıdır', () => {
    const a = anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 });
    expect(a).toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 }));
    expect(a).not.toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 2, degisme: 1 }));
  });

  it('kaydeder ve geri yükler; kullanıcı gruplarını tutar', async () => {
    const dosya = join(await geciciKlasor(), 'alt', 'kayit.json');
    const d1 = new KayitDeposu(dosya);
    await d1.yukle();
    d1.koy(ornek('a'));
    d1.veri.kullaniciGruplari.push({ id: 'k-araba', ad: 'Araba', tarifler: ['car'], kullanici: true });
    await d1.kaydet();

    const d2 = new KayitDeposu(dosya);
    await d2.yukle();
    expect(d2.al('a')?.yol).toBe('C:/a.jpg');
    expect(d2.veri.kullaniciGruplari[0].ad).toBe('Araba');
  });

  it('dosya yoksa boş başlar', async () => {
    const d = new KayitDeposu(join(await geciciKlasor(), 'yok.json'));
    await d.yukle();
    expect(d.al('a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/kayit.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Grup, IslenmisMedya, MedyaDosyasi } from './tipler';

export interface KayitVerisi {
  surum: 1;
  medya: Record<string, IslenmisMedya>;
  kullaniciGruplari: Grup[];
}

export function anahtarUret(d: MedyaDosyasi): string {
  return createHash('sha1').update(`${d.yol}|${d.boyut}|${Math.round(d.degisme)}`).digest('hex');
}

export class KayitDeposu {
  readonly dosya: string;
  veri: KayitVerisi = { surum: 1, medya: {}, kullaniciGruplari: [] };

  constructor(dosya: string) {
    this.dosya = dosya;
  }

  async yukle(): Promise<void> {
    try {
      const v = JSON.parse(await readFile(this.dosya, 'utf8')) as KayitVerisi;
      if (v.surum === 1) this.veri = v;
    } catch {
      // ilk açılış veya bozuk dosya: boş kayıtla devam
    }
  }

  al(anahtar: string): IslenmisMedya | undefined {
    return this.veri.medya[anahtar];
  }

  koy(m: IslenmisMedya): void {
    this.veri.medya[m.anahtar] = m;
  }

  /** Önce geçici dosyaya yazar, sonra yerine koyar: yarıda kesilirse eski kayıt bozulmaz. */
  async kaydet(): Promise<void> {
    await mkdir(dirname(this.dosya), { recursive: true });
    const gecici = `${this.dosya}.tmp`;
    await writeFile(gecici, JSON.stringify(this.veri));
    await rename(gecici, this.dosya);
  }
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/kayit.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/kayit.ts tests/kayit.test.ts
git commit -m "feat(motor): JSON önbellek"
```

---

### Task 11: İşçi (tüm akış)

**Files:**
- Create: `src/motor/isci.ts`
- Test: `tests/isci.test.ts`

- [ ] **Step 1: Başarısız testi yaz** (sahte yapay zekâ modeliyle: resmin ortalama rengini vektör yapar)

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ayikla } from '../src/motor/isci';
import { normalize } from '../src/motor/sahne-puan';
import { KayitDeposu } from '../src/motor/kayit';
import type { IsciOlayi, SahneModeli } from '../src/motor/tipler';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim, ornekVideo } from './yardimci';

function sahteModel() {
  const sayac = { resim: 0 };
  const model: SahneModeli = {
    cihaz: 'sahte',
    async resimVektoru(yol) {
      sayac.resim++;
      const s = await sharp(yol).stats();
      return normalize(s.channels.slice(0, 3).map((c) => c.mean));
    },
    async metinVektorleri(metinler) {
      return metinler.map((m) => (m === 'kirmizi' ? [1, 0, 0] : m === 'mavi' ? [0, 0, 1] : [0, 1, 0]));
    },
  };
  return { model, sayac };
}

const GRUPLAR = [
  { id: 'k', ad: 'Kırmızı', tarifler: ['kirmizi'] },
  { id: 'm', ad: 'Mavi', tarifler: ['mavi'] },
];

describe('isci', () => {
  it('gruplar, eler, kopyaları bulur ve önbelleği kullanır', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await desenliResim(join(girdi, 'IMG_20240812_100000.jpg'), { renk: [220, 40, 40], tohum: 1 });
    await desenliResim(join(girdi, 'IMG_20240812_100001.jpg'), { renk: [220, 40, 40], tohum: 1, boyut: 512 });
    await desenliResim(join(girdi, 'IMG_20230105_100000.jpg'), { renk: [40, 40, 220], tohum: 2 });
    await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
    await karanlikResim(join(girdi, 'karanlik.jpg'));
    await ornekVideo(join(girdi, 'video.mp4'), 'red', '2022-05-06T07:08:09Z');
    await writeFile(join(girdi, 'bozuk.jpg'), 'degil');

    const { model, sayac } = sahteModel();
    const olaylar: IsciOlayi[] = [];
    const calisma = join(kok, 'calisma');
    const sonuc = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: (o) => olaylar.push(o) });

    const bul = (ad: string) => sonuc.find((m) => m.yol.endsWith(ad))!;
    expect(sonuc).toHaveLength(6);
    expect(olaylar[0]).toEqual({ tur: 'basladi', toplam: 7 });
    expect(olaylar.some((o) => o.tur === 'okunamadi' && o.yol.endsWith('bozuk.jpg'))).toBe(true);
    expect(olaylar.at(-1)?.tur).toBe('bitti');

    expect(bul('IMG_20230105_100000.jpg').grupId).toBe('m');
    expect(bul('video.mp4').grupId).toBe('k');
    expect(bul('video.mp4').onizlemeler).toHaveLength(3);
    expect(bul('bulanik.jpg').eleme).toBe('bulanik');
    expect(bul('karanlik.jpg').eleme).toBe('karanlik');

    // İki kırmızı kopyadan büyük olan kalır, küçük olan "kopya" olur
    expect(bul('IMG_20240812_100001.jpg').eleme).toBeNull();
    expect(bul('IMG_20240812_100001.jpg').grupId).toBe('k');
    expect(bul('IMG_20240812_100000.jpg').eleme).toBe('kopya');

    // İkinci çalıştırma: hiçbir resim yeniden işlenmez
    const ilk = sayac.resim;
    const sonuc2 = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(sayac.resim).toBe(ilk);
    expect(sonuc2).toHaveLength(6);
  });

  it('elle seçilen grup yapay zekânın önüne geçer', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await desenliResim(join(girdi, 'a.jpg'), { renk: [220, 40, 40], tohum: 1 });
    const { model } = sahteModel();
    const calisma = join(kok, 'calisma');
    const ilk = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ilk[0].grupId).toBe('k');

    const d = new KayitDeposu(join(calisma, 'kayit.json'));
    await d.yukle();
    Object.values(d.veri.medya)[0].elleGrup = 'm';
    await d.kaydet();

    const ikinci = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ikinci[0].grupId).toBe('m');
  });

  it('durdurulunca hiçbir dosyayı işlemez', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, 'a.jpg'), { renk: [220, 40, 40], tohum: 1 });
    const { model, sayac } = sahteModel();
    const durdur = new AbortController();
    durdur.abort();
    const sonuc = await ayikla({
      girdiler: [kok], calismaKlasoru: join(kok, 'calisma'), gruplar: GRUPLAR, model, olay: () => {}, durdur: durdur.signal,
    });
    expect(sonuc).toHaveLength(0);
    expect(sayac.resim).toBe(0);
  });
});
```

Not: Üçüncü testte `calisma` klasörü girdi klasörünün içinde olsa da önizlemeler `ayikla` başladıktan sonra yazılır ve tarama daha önce biter; ayrıca test durdurulmuş başladığı için önizleme hiç yazılmaz.

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/isci.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tara } from './tarayici';
import { tarihBul } from './tarih';
import { fotoOnizleme } from './onizleme';
import { videoBilgisi, kareCikar } from './ffmpeg';
import { kaliteOlc } from './kalite';
import { parmakiziHesapla, kopyalariBul } from './parmakizi';
import { grupSec, ortalamaVektor, type GrupVektoru } from './sahne-puan';
import { DIGER_ID, EKRAN_ID, ekranGoruntusuAdiMi } from './gruplar';
import { KayitDeposu, anahtarUret } from './kayit';
import type { Grup, IsciOlayi, IslenmisMedya, MedyaDosyasi, SahneModeli } from './tipler';

export interface IsciAyarlari {
  girdiler: string[];
  calismaKlasoru: string;
  gruplar: Grup[];
  model: SahneModeli;
  olay: (o: IsciOlayi) => void;
  durdur?: AbortSignal;
}

export async function grupVektorleriHazirla(gruplar: Grup[], model: SahneModeli): Promise<GrupVektoru[]> {
  const sonuc: GrupVektoru[] = [];
  for (const g of gruplar) sonuc.push({ grupId: g.id, vektorler: await model.metinVektorleri(g.tarifler) });
  return sonuc;
}

export function grupBelirle(m: IslenmisMedya, gv: GrupVektoru[]): string {
  if (m.elleGrup) return m.elleGrup;
  if (m.tur === 'foto' && ekranGoruntusuAdiMi(basename(m.yol)) && gv.some((g) => g.grupId === EKRAN_ID)) return EKRAN_ID;
  return grupSec(m.vektor, gv).grupId;
}

async function dosyayiIsle(d: MedyaDosyasi, anahtar: string, klasor: string, model: SahneModeli): Promise<IslenmisMedya> {
  const tarih = await tarihBul(d);
  const onizlemeler: string[] = [];
  let genislik = 0;
  let yukseklik = 0;

  if (d.tur === 'foto') {
    const hedef = join(klasor, `${anahtar}.jpg`);
    const b = await fotoOnizleme(d.yol, hedef);
    genislik = b.genislik;
    yukseklik = b.yukseklik;
    onizlemeler.push(hedef);
  } else {
    const v = await videoBilgisi(d.yol);
    genislik = v.genislik;
    yukseklik = v.yukseklik;
    const anlar = v.sure > 0 ? [0.1, 0.5, 0.9].map((o) => v.sure * o) : [0];
    for (let k = 0; k < anlar.length; k++) {
      const hedef = join(klasor, `${anahtar}-${k}.jpg`);
      await kareCikar(d.yol, anlar[k], hedef);
      onizlemeler.push(hedef);
    }
  }

  const ana = onizlemeler[Math.floor(onizlemeler.length / 2)];
  const kalite = await kaliteOlc(ana);
  const parmakizi = await parmakiziHesapla(ana);
  const vektorler: number[][] = [];
  for (const o of onizlemeler) vektorler.push(await model.resimVektoru(o));

  return {
    anahtar, yol: d.yol, tur: d.tur, boyut: d.boyut, degisme: d.degisme,
    tarih: tarih.tarih.toISOString(), tarihKaynagi: tarih.kaynak, tahmini: tarih.tahmini,
    onizlemeler, genislik, yukseklik, kalite, parmakizi,
    vektor: ortalamaVektor(vektorler), grupId: DIGER_ID, eleme: null,
  };
}

function kopyalariIsaretle(liste: IslenmisMedya[]): string[] {
  const anahtarlar: string[] = [];
  for (const tur of ['foto', 'video'] as const) {
    const adaylar = liste.filter((m) => m.tur === tur && m.eleme === null);
    const elenen = kopyalariBul(adaylar, (m) => m.genislik * m.yukseklik + m.kalite.netlik);
    for (const m of elenen) {
      m.eleme = 'kopya';
      anahtarlar.push(m.anahtar);
    }
  }
  return anahtarlar;
}

export async function ayikla(a: IsciAyarlari): Promise<IslenmisMedya[]> {
  const dosyalar = await tara(a.girdiler);
  a.olay({ tur: 'basladi', toplam: dosyalar.length });
  if (a.durdur?.aborted) return [];

  const kayit = new KayitDeposu(join(a.calismaKlasoru, 'kayit.json'));
  await kayit.yukle();
  const onizlemeKlasoru = join(a.calismaKlasoru, 'onizleme');
  await mkdir(onizlemeKlasoru, { recursive: true });
  const gv = await grupVektorleriHazirla(a.gruplar, a.model);

  const sonuc: IslenmisMedya[] = [];
  for (let i = 0; i < dosyalar.length; i++) {
    if (a.durdur?.aborted) break;
    const d = dosyalar[i];
    const anahtar = anahtarUret(d);
    try {
      let m = kayit.al(anahtar);
      if (!m) {
        m = await dosyayiIsle(d, anahtar, onizlemeKlasoru, a.model);
        kayit.koy(m);
      }
      m.grupId = grupBelirle(m, gv);
      m.eleme = m.tur === 'foto' ? (m.kalite.karanlik ? 'karanlik' : m.kalite.bulanik ? 'bulanik' : null) : null;
      sonuc.push(m);
      a.olay({ tur: 'dosya', medya: m, sira: i + 1, toplam: dosyalar.length });
    } catch (h) {
      a.olay({ tur: 'okunamadi', yol: d.yol, hata: h instanceof Error ? h.message : String(h) });
    }
    if ((i + 1) % 25 === 0) await kayit.kaydet();
  }

  if (a.durdur?.aborted) {
    await kayit.kaydet();
    return sonuc;
  }
  a.olay({ tur: 'kopyalar', anahtarlar: kopyalariIsaretle(sonuc) });
  await kayit.kaydet();
  a.olay({ tur: 'bitti', sonuc });
  return sonuc;
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/isci.test.ts`
Expected: PASS (3 test). Kırmızı kopya testi geçmezse önce iki dosyanın aynı `tohum` (1) ile üretildiğini kontrol et; `KOPYA_ESIK`'i değiştirme.

- [ ] **Step 5: Tüm testler**

Run: `npm test`
Expected: Tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add src/motor/isci.ts tests/isci.test.ts
git commit -m "feat(motor): işçi — tarama, işleme, gruplama, eleme, önbellek"
```

---

### Task 12: Dışa aktarma

**Files:**
- Create: `src/motor/disari-aktar.ts`
- Test: `tests/disari-aktar.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { hedefKlasor, guvenliAd, disariAktar } from '../src/motor/disari-aktar';
import { geciciKlasor } from './yardimci';

describe('disari-aktar', () => {
  it('Grup/Yıl/Ay klasörünü üretir', () => {
    const t = new Date(2024, 7, 12).toISOString();
    expect(hedefKlasor('C:/H', 'Deniz / Plaj', t)).toBe(join('C:/H', 'Deniz - Plaj', '2024', '08-Ağustos'));
  });

  it('Windows’ta yasak karakterleri temizler', () => {
    expect(guvenliAd('a<b>c:d"e/f\\g|h?i*j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('kopyalar, orijinali bırakır; aynı dosyayı ikinci kez kopyalamaz; ad çakışmasında numara ekler', async () => {
    const k = await geciciKlasor();
    await mkdir(join(k, 'a'));
    await mkdir(join(k, 'b'));
    const kaynak1 = join(k, 'a', 'foto.jpg');
    const kaynak2 = join(k, 'b', 'foto.jpg');
    await writeFile(kaynak1, 'bir');
    await writeFile(kaynak2, 'ikiii');
    const tarih = new Date(2024, 7, 12).toISOString();
    const hedef = join(k, 'H');
    const ogeler = [
      { yol: kaynak1, grupAdi: 'Deniz', tarih },
      { yol: kaynak2, grupAdi: 'Deniz', tarih },
    ];

    const r1 = await disariAktar(ogeler, hedef);
    expect(r1).toEqual({ kopyalanan: 2, atlanan: 0, hatalar: [] });
    const klasor = join(hedef, 'Deniz', '2024', '08-Ağustos');
    expect((await readdir(klasor)).sort()).toEqual(['foto (2).jpg', 'foto.jpg']);
    expect(await readFile(kaynak1, 'utf8')).toBe('bir');

    const r2 = await disariAktar(ogeler, hedef);
    expect(r2).toEqual({ kopyalanan: 0, atlanan: 2, hatalar: [] });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/disari-aktar.test.ts`
Expected: FAIL — modül bulunamadı.

- [ ] **Step 3: Kodu yaz**

```ts
import { copyFile, mkdir, stat, constants } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export interface AktarilacakOge {
  yol: string;
  grupAdi: string;
  tarih: string; // ISO
}

export interface AktarmaSonucu {
  kopyalanan: number;
  atlanan: number;
  hatalar: { yol: string; hata: string }[];
}

/** Windows klasör adında yasak karakterleri temizler. "Deniz / Plaj" → "Deniz - Plaj". */
export function guvenliAd(ad: string): string {
  return ad.replace(/ \/ /g, ' - ').replace(/[<>:"/\\|?*]/g, '-').trim();
}

export function hedefKlasor(kok: string, grupAdi: string, tarihIso: string): string {
  const t = new Date(tarihIso);
  const ay = String(t.getMonth() + 1).padStart(2, '0');
  return join(kok, guvenliAd(grupAdi), String(t.getFullYear()), `${ay}-${AYLAR[t.getMonth()]}`);
}

async function boyutu(yol: string): Promise<number | null> {
  try {
    return (await stat(yol)).size;
  } catch {
    return null;
  }
}

/** Kopyalar; asla üzerine yazmaz. Aynı ad + aynı boyutta dosya varsa atlar. Disk dolarsa durur. */
export async function disariAktar(
  ogeler: AktarilacakOge[],
  kok: string,
  ilerleme?: (bitti: number, toplam: number) => void,
): Promise<AktarmaSonucu> {
  const sonuc: AktarmaSonucu = { kopyalanan: 0, atlanan: 0, hatalar: [] };
  for (let i = 0; i < ogeler.length; i++) {
    const o = ogeler[i];
    try {
      const klasor = hedefKlasor(kok, o.grupAdi, o.tarih);
      await mkdir(klasor, { recursive: true });
      const kaynakBoyut = (await stat(o.yol)).size;
      const uzanti = extname(o.yol);
      const govde = basename(o.yol, uzanti);
      for (let n = 1; ; n++) {
        const hedef = join(klasor, n === 1 ? `${govde}${uzanti}` : `${govde} (${n})${uzanti}`);
        const mevcut = await boyutu(hedef);
        if (mevcut === null) {
          await copyFile(o.yol, hedef, constants.COPYFILE_EXCL);
          sonuc.kopyalanan++;
          break;
        }
        if (mevcut === kaynakBoyut) {
          sonuc.atlanan++;
          break;
        }
      }
    } catch (h) {
      sonuc.hatalar.push({ yol: o.yol, hata: h instanceof Error ? h.message : String(h) });
      if ((h as NodeJS.ErrnoException).code === 'ENOSPC') break;
    }
    ilerleme?.(i + 1, ogeler.length);
  }
  return sonuc;
}
```

- [ ] **Step 4: Geçtiğini gör**

Run: `npx vitest run tests/disari-aktar.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/motor/disari-aktar.ts tests/disari-aktar.test.ts
git commit -m "feat(motor): Grup/Yıl/Ay klasörlerine kopyalama"
```

---

### Task 13: Gerçek yapay zekâ modeli (CLIP) ve çeviri

**Files:**
- Create: `src/motor/sahne-model.ts`

Bu görevin birim testi yok (model ~350 MB iner). Doğrulama Task 14'teki gerçek denemeyle yapılır.

- [ ] **Step 1: Kodu yaz**

```ts
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
  pipeline,
} from '@huggingface/transformers';
import { normalize } from './sahne-puan';
import type { SahneModeli } from './tipler';

const CLIP = 'Xenova/clip-vit-base-patch32';
const CEVIRI = 'Xenova/opus-mt-tr-en';

export async function sahneModeliYukle(modelKlasoru: string): Promise<SahneModeli> {
  env.cacheDir = modelKlasoru;
  let cihaz = 'dml'; // Windows ekran kartı (DirectML)
  let gorsel;
  try {
    gorsel = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'dml', dtype: 'fp32' });
  } catch {
    cihaz = 'cpu';
    gorsel = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });
  }
  const metin = await CLIPTextModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });
  const islemci = await AutoProcessor.from_pretrained(CLIP);
  const ayirici = await AutoTokenizer.from_pretrained(CLIP);

  return {
    cihaz,
    async resimVektoru(yol) {
      const resim = await RawImage.read(yol);
      const girdi = await islemci(resim);
      const { image_embeds } = await gorsel(girdi);
      return normalize(image_embeds.data as Float32Array);
    },
    async metinVektorleri(metinler) {
      const girdi = ayirici(metinler, { padding: true, truncation: true });
      const { text_embeds } = await metin(girdi);
      const boy = text_embeds.dims[1] as number;
      const veri = text_embeds.data as Float32Array;
      return metinler.map((_, i) => normalize(veri.subarray(i * boy, (i + 1) * boy)));
    },
  };
}

/** Kullanıcının yazdığı Türkçe grup adını CLIP için İngilizceye çevirir. */
export async function ingilizceyeCevir(metin: string, modelKlasoru: string): Promise<string> {
  env.cacheDir = modelKlasoru;
  const cevirici = await pipeline('translation', CEVIRI);
  const sonuc = (await cevirici(metin)) as Array<{ translation_text: string }>;
  return sonuc[0]?.translation_text?.replace(/[.!]+$/, '').trim() || metin;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npm run tip`
Expected: hata yok.
transformers.js 4.x tipleri farklı çıkarsa yalnızca şu daraltmaları yap, mantığı değiştirme:
- `device: 'dml'` reddedilirse → `device: 'dml' as never`
- `image_embeds` / `text_embeds` için tip hatası → `const { image_embeds } = (await gorsel(girdi)) as { image_embeds: { data: Float32Array } };` ve `const { text_embeds } = (await metin(girdi)) as { text_embeds: { data: Float32Array; dims: number[] } };`

- [ ] **Step 3: Commit**

```bash
git add src/motor/sahne-model.ts
git commit -m "feat(motor): CLIP sahne modeli ve Türkçe→İngilizce çeviri"
```

---

### Task 14: Komut satırı aracı ve gerçek deneme

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Kodu yaz**

```ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ayikla } from './motor/isci';
import { HAZIR_GRUPLAR, DIGER_ID, kullaniciGrubu } from './motor/gruplar';
import { sahneModeliYukle, ingilizceyeCevir } from './motor/sahne-model';
import { disariAktar } from './motor/disari-aktar';
import { KayitDeposu } from './motor/kayit';

const ELEME_ADI = { kopya: 'Elenecek › Kopya', bulanik: 'Elenecek › Bulanık', karanlik: 'Elenecek › Karanlık' } as const;

async function main() {
  const [klasor, ...secenekler] = process.argv.slice(2);
  if (!klasor) {
    console.log('Kullanım: npm run ayikla -- "<klasör>" [--grup "Araba"] [--aktar "<hedef klasör>"]');
    process.exit(1);
  }
  const calisma = join(homedir(), '.ayikla');
  const modeller = join(calisma, 'modeller');

  const kayit = new KayitDeposu(join(calisma, 'kayit.json'));
  await kayit.yukle();
  const grupIndex = secenekler.indexOf('--grup');
  if (grupIndex >= 0) {
    const ad = secenekler[grupIndex + 1];
    const ing = await ingilizceyeCevir(ad, modeller);
    console.log(`Yeni grup: ${ad} (yapay zekâ için: "${ing}")`);
    const yeni = kullaniciGrubu(ad, ing);
    kayit.veri.kullaniciGruplari = [...kayit.veri.kullaniciGruplari.filter((g) => g.id !== yeni.id), yeni];
    await kayit.kaydet();
  }
  const gruplar = [...HAZIR_GRUPLAR, ...kayit.veri.kullaniciGruplari];

  console.log('Yapay zekâ yükleniyor (ilk seferde ~350 MB iner)…');
  const model = await sahneModeliYukle(modeller);
  console.log(`Hazır — çalıştığı yer: ${model.cihaz === 'dml' ? 'ekran kartı' : 'işlemci'}`);

  const baslangic = Date.now();
  const sonuc = await ayikla({
    girdiler: [klasor],
    calismaKlasoru: calisma,
    gruplar,
    model,
    olay: (o) => {
      if (o.tur === 'basladi') console.log(`${o.toplam} dosya bulundu`);
      if (o.tur === 'dosya') process.stdout.write(`\r${o.sira}/${o.toplam}`);
      if (o.tur === 'okunamadi') console.log(`\nOkunamadı: ${o.yol} (${o.hata})`);
    },
  });
  console.log(`\nBitti: ${((Date.now() - baslangic) / 1000).toFixed(1)} sn\n`);

  const ad = (id: string) => gruplar.find((g) => g.id === id)?.ad ?? (id === DIGER_ID ? 'Diğer' : id);
  const ozet = new Map<string, Map<string, number>>();
  for (const m of sonuc) {
    const g = m.eleme ? ELEME_ADI[m.eleme] : ad(m.grupId);
    const ay = m.tarih.slice(0, 7);
    if (!ozet.has(g)) ozet.set(g, new Map());
    ozet.get(g)!.set(ay, (ozet.get(g)!.get(ay) ?? 0) + 1);
  }
  for (const [g, aylar] of [...ozet].sort()) {
    const toplam = [...aylar.values()].reduce((a, b) => a + b, 0);
    console.log(`${g} (${toplam})`);
    for (const [ay, n] of [...aylar].sort()) console.log(`   ${ay}: ${n}`);
  }

  const aktarIndex = secenekler.indexOf('--aktar');
  if (aktarIndex >= 0) {
    const hedef = secenekler[aktarIndex + 1];
    const ogeler = sonuc.filter((m) => !m.eleme).map((m) => ({ yol: m.yol, grupAdi: ad(m.grupId), tarih: m.tarih }));
    const r = await disariAktar(ogeler, hedef);
    console.log(`\nKopyalanan: ${r.kopyalanan}, zaten vardı: ${r.atlanan}, hata: ${r.hatalar.length}`);
  }
}

main().catch((h) => {
  console.error(h);
  process.exit(1);
});
```

- [ ] **Step 2: Tip kontrolü ve tüm testler**

Run: `npm run tip`
Expected: hata yok.
Run: `npm test`
Expected: tüm testler PASS.

- [ ] **Step 3: Gerçek fotoğraflarla deneme (yalnızca okur)**

Önce klasörün o anki durumunu kaydet:
```bash
find "/c/Users/krykc/Desktop/Fotograflar" -type f -printf "%p %s %T@\n" | sort > /tmp/once.txt
```
Run: `npm run ayikla -- "C:\Users\krykc\Desktop\Fotograflar"`
Expected: Model iner; "Hazır — çalıştığı yer: ekran kartı" (veya işlemci); sayaç ilerler; sonunda "Deniz / Plaj (n)", "Şehir (n)" gibi gruplar ve ay dağılımı.
Sonra orijinallerin değişmediğini doğrula:
```bash
find "/c/Users/krykc/Desktop/Fotograflar" -type f -printf "%p %s %T@\n" | sort | diff /tmp/once.txt - && echo DEGISMEDI
```
Expected: `DEGISMEDI`

Elle kontrol: sonuçtan 10 rastgele dosyayı açıp grubunun doğru olup olmadığına bak. 10'da 7'den azı doğruysa `src/motor/gruplar.ts`'deki tarifleri zenginleştir veya `src/motor/sahne-puan.ts`'deki `DIGER_ESIK` değerini ayarla; değişikliği ayrı commit'le.

- [ ] **Step 4: İkinci çalıştırma hızlı olmalı**

Run: `npm run ayikla -- "C:\Users\krykc\Desktop\Fotograflar"`
Expected: aynı özet, ilk çalıştırmadan çok daha kısa sürede (önbellek).

- [ ] **Step 5: Yeni grup deneme**

Run: `npm run ayikla -- "C:\Users\krykc\Desktop\Fotograflar" --grup "Araba"`
Expected: `Yeni grup: Araba (yapay zekâ için: "car")` benzeri satır; klasörde araba fotoğrafı varsa özet listesinde "Araba" grubu görünür.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts
git commit -m "feat: komut satırı deneme aracı"
```

---

## Sonra: Plan 2 — Arayüz

Motor bittiğinde ayrı bir plan yazılır: Electron + React + three.js ile Karşılama, Ayıklama (dönen yığın animasyonu) ve Sonuç ekranları; motor Electron'un `utilityProcess`'inde çalışır, `IsciOlayi` olayları arayüze iletilir. Elle grup değiştirme `IslenmisMedya.elleGrup` alanına yazılır (bu planda hazır), "Klasörlere kaydet" `disariAktar`'ı çağırır.
