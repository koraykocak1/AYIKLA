import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegYolu from 'ffmpeg-static';

const calistir = promisify(execFile);
// Kurulu programda ffmpeg.exe paketin (app.asar) dışına açılır; oradan çalıştırılmalı.
const FFMPEG = (ffmpegYolu as unknown as string).replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');

export interface VideoBilgisi {
  sure: number;
  genislik: number;
  yukseklik: number;
  olusturma: Date | null;
}

/**
 * `ffmpeg -i` çıktısından süre, boyut ve oluşturma tarihini okur. (Eskiden ayrı bir `ffprobe.exe` kullanılıyordu;
 * 2018 tarihli ve kaynağı belirsiz olduğu için kaldırıldı. Aynı bilgiler paketteki `ffmpeg.exe`'den okunur.)
 * Girdi bir video değilse null döner.
 */
export function ffmpegBilgisiniCoz(metin: string): VideoBilgisi | null {
  if (!/^Input #0,/m.test(metin)) return null;
  const sure = /^\s+Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/m.exec(metin);
  const video = /^\s+Stream #\d+:\d+.*?: Video: (.*)$/m.exec(metin);
  const boyut = video ? /(?:^|[ ,])(\d{2,5})x(\d{2,5})(?=[ ,[]|$)/.exec(video[1]) : null;
  // İlk `creation_time` dosya düzeyindedir (akışlarınkinden önce yazılır).
  const etiket = /^\s+creation_time\s*: (\S+)/m.exec(metin)?.[1];
  let olusturma: Date | null = etiket ? new Date(etiket) : null;
  if (olusturma && (Number.isNaN(olusturma.getTime()) || olusturma.getFullYear() < 1990)) olusturma = null;
  return {
    sure: sure ? Number(sure[1]) * 3600 + Number(sure[2]) * 60 + Number(sure[3]) : 0,
    genislik: boyut ? Number(boyut[1]) : 0,
    yukseklik: boyut ? Number(boyut[2]) : 0,
    olusturma,
  };
}

export async function videoBilgisi(yol: string): Promise<VideoBilgisi> {
  // Çıkış dosyası verilmediği için ffmpeg bilgileri yazıp 1 koduyla çıkar; bu beklenen durumdur.
  let metin: string;
  try {
    const { stderr } = await calistir(FFMPEG, ['-hide_banner', '-nostdin', '-i', yol]);
    metin = stderr;
  } catch (h) {
    metin = String((h as { stderr?: string }).stderr ?? '');
  }
  const b = ffmpegBilgisiniCoz(metin);
  if (!b) throw new Error(`Video okunamadı: ${metin.trim().split(/\r?\n/).pop() ?? ''}`);
  return b;
}

export async function kareCikar(yol: string, saniye: number, hedef: string): Promise<void> {
  await calistir(FFMPEG, [
    '-y', '-v', 'error', '-ss', saniye.toFixed(2), '-i', yol, '-frames:v', '1', '-vf', 'scale=384:-2', hedef,
  ]);
}
