import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
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

  it('son arşivleri tekrarsız, en yeni başta ve en fazla 8 tane tutar', async () => {
    const dosya = join(await geciciKlasor(), 'kayit.json');
    const d = new KayitDeposu(dosya);
    await d.yukle();
    for (let i = 0; i < 10; i++) d.arsivEkle({ girdiler: [`K${i}`], tarih: '2026-11-01T00:00:00.000Z', foto: i, video: 0 });
    d.arsivEkle({ girdiler: ['K5'], tarih: '2026-11-02T00:00:00.000Z', foto: 50, video: 1 });
    await d.kaydet();

    const d2 = new KayitDeposu(dosya);
    await d2.yukle();
    const liste = d2.veri.sonArsivler ?? [];
    expect(liste).toHaveLength(8);
    expect(liste[0]).toMatchObject({ girdiler: ['K5'], foto: 50 });
    expect(liste.filter((a) => a.girdiler[0] === 'K5')).toHaveLength(1);
    expect(liste[1].girdiler).toEqual(['K9']);
  });

  it('bozuk kayıt silinmez: kenara alınır, sonra boş kayıtla devam edilir', async () => {
    const klasor = await geciciKlasor();
    const dosya = join(klasor, 'kayit.json');
    await writeFile(dosya, '{"surum":1,"medya":{"a":'); // yarıda kesilmiş JSON
    const d = new KayitDeposu(dosya);
    await d.yukle();
    expect(d.al('a')).toBeUndefined();
    expect(d.kurtarilan).toMatch(/kayit\.json\.bozuk-/);
    expect(await readFile(d.kurtarilan!, 'utf8')).toBe('{"surum":1,"medya":{"a":');
    d.koy(ornek('b'));
    await d.kaydet();
    expect((await readdir(klasor)).filter((a) => a.includes('bozuk'))).toHaveLength(1); // yeni kayıt eskisini ezmedi
  });

  it('bilinmeyen sürümdeki kayıt da ezilmez, kenara alınır', async () => {
    const dosya = join(await geciciKlasor(), 'kayit.json');
    await writeFile(dosya, JSON.stringify({ surum: 2, medya: {}, kullaniciGruplari: [] }));
    const d = new KayitDeposu(dosya);
    await d.yukle();
    expect(JSON.parse(await readFile(d.kurtarilan!, 'utf8')).surum).toBe(2);
  });

  it('dosya yoksa boş başlar', async () => {
    const d = new KayitDeposu(join(await geciciKlasor(), 'yok.json'));
    await d.yukle();
    expect(d.al('a')).toBeUndefined();
  });
});
