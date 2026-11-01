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
