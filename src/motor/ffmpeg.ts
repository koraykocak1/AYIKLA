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
