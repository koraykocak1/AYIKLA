import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { stat, writeFile } from 'node:fs/promises';
import { ffmpegBilgisiniCoz, videoBilgisi, kareCikar } from '../src/motor/ffmpeg';
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

  it('video olmayan dosyada hata verir (eski ffprobe davranışı gibi)', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'bozuk.mp4');
    await writeFile(v, 'bu bir video değil');
    await expect(videoBilgisi(v)).rejects.toThrow(/Video okunamadı/);
  });

  it('ffmpeg çıktısını çözer: uzun süre, sesli dosya; dosya adı ve codec etiketi karışmaz', () => {
    const metin = [
      "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'C:\\Fotolar\\Düğün 1920x1080.mov':",
      '  Metadata:',
      '    creation_time   : 2019-08-17T15:04:05.000000Z',
      '  Duration: 01:02:03.50, start: 0.000000, bitrate: 15000 kb/s',
      '  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s (default)',
      '  Stream #0:1[0x2](und): Video: hevc (Main) (hvc1 / 0x31637668), yuv420p(tv, bt709), 3840x2160, 14000 kb/s, 29.97 fps (default)',
      '    Metadata:',
      '      creation_time   : 2000-01-01T00:00:00.000000Z',
      'At least one output file must be specified',
    ].join('\n');
    const b = ffmpegBilgisiniCoz(metin)!;
    expect(b.sure).toBeCloseTo(3723.5);
    expect([b.genislik, b.yukseklik]).toEqual([3840, 2160]);
    expect(b.olusturma?.toISOString()).toBe('2019-08-17T15:04:05.000Z');
    expect(ffmpegBilgisiniCoz('C:\\x.mp4: Invalid data found when processing input')).toBeNull();
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
