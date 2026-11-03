import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import Database from 'better-sqlite3';
import { Katalog, KATALOG_ADI, SEMA_SURUMU, agYoluMu, anahtarUret, katalogAc, type KayitVerisi } from '../src/motor/katalog';
import { geciciKlasor } from './yardimci';
import type { IslenmisMedya } from '../src/motor/tipler';

const ornek = (anahtar: string, ek: Partial<IslenmisMedya> = {}): IslenmisMedya => ({
  anahtar, yol: `C:/${anahtar}.jpg`, tur: 'foto', boyut: 1, degisme: 1, tarih: '2024-01-01T00:00:00.000Z',
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: [], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0000000000000000',
  vektor: [1, 0], grupId: 'diger', eleme: null, ...ek,
});

/** Veritabanındaki satır sayıları: geçişin veriyi çoğaltmadığını doğrulamak için. */
function sayilar(dosya: string) {
  const vt = new Database(dosya, { readonly: true });
  const say = (t: string) => (vt.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  const r = { medya: say('medya'), grup: say('kullanici_grubu'), arsiv: say('son_arsiv') };
  vt.close();
  return r;
}

/** Eski sürümün yazdığı gibi bir `kayit.json`: elle düzeltmeler, kullanıcı grubu ve son arşivler var. */
const ESKI: KayitVerisi = {
  surum: 1,
  medya: {
    a: ornek('a', { grupId: 'deniz', elleGrup: 'deniz' }),
    b: ornek('b', { eleme: null, geriAlindi: true }),
    c: ornek('c', { eleme: 'bulanik' }),
  },
  kullaniciGruplari: [{ id: 'k-araba', ad: 'Araba', tarifler: ['a photo of a car'], ingilizce: 'car', kullanici: true }],
  sonArsivler: [
    { girdiler: ['D:\\Tatil'], tarih: '2026-11-02T00:00:00.000Z', foto: 3, video: 0 },
    { girdiler: ['D:\\Eski'], tarih: '2026-11-01T00:00:00.000Z', foto: 1, video: 1 },
  ],
};

describe('katalog', () => {
  it('anahtar yol, boyut ve tarihe bağlıdır', () => {
    const a = anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 });
    expect(a).toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 }));
    expect(a).not.toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 2, degisme: 1 }));
  });

  it('kaydeder ve geri yükler; kullanıcı gruplarını tutar', async () => {
    const dosya = join(await geciciKlasor(), 'alt', KATALOG_ADI);
    const d1 = new Katalog(dosya);
    await d1.yukle();
    d1.koy(ornek('a'));
    d1.veri.kullaniciGruplari.push({ id: 'k-araba', ad: 'Araba', tarifler: ['car'], kullanici: true });
    await d1.kaydet();

    const d2 = new Katalog(dosya);
    await d2.yukle();
    expect(d2.al('a')?.yol).toBe('C:/a.jpg');
    expect(d2.veri.kullaniciGruplari[0].ad).toBe('Araba');
  });

  it('nesne yerinde değiştirilince de kaydeder (motor ve sunucu böyle kullanır)', async () => {
    const klasor = await geciciKlasor();
    const d1 = await katalogAc(klasor);
    d1.koy(ornek('a'));
    await d1.kaydet();
    d1.al('a')!.elleGrup = 'orman';
    await d1.kaydet();
    expect((await katalogAc(klasor)).al('a')?.elleGrup).toBe('orman');
  });

  it('son arşivleri tekrarsız, en yeni başta ve en fazla 8 tane tutar', async () => {
    const klasor = await geciciKlasor();
    const d = await katalogAc(klasor);
    for (let i = 0; i < 10; i++) d.arsivEkle({ girdiler: [`K${i}`], tarih: '2026-11-01T00:00:00.000Z', foto: i, video: 0 });
    d.arsivEkle({ girdiler: ['K5'], tarih: '2026-11-02T00:00:00.000Z', foto: 50, video: 1 });
    await d.kaydet();

    const liste = (await katalogAc(klasor)).veri.sonArsivler ?? [];
    expect(liste).toHaveLength(8);
    expect(liste[0]).toMatchObject({ girdiler: ['K5'], foto: 50 });
    expect(liste.filter((a) => a.girdiler[0] === 'K5')).toHaveLength(1);
    expect(liste[1].girdiler).toEqual(['K9']);
  });

  it('dosya yoksa boş başlar', async () => {
    const d = await katalogAc(await geciciKlasor());
    expect(d.al('a')).toBeUndefined();
    expect(d.gecildi).toBe(false);
    expect(d.kurtarilan).toBeNull();
  });

  it('ağ paylaşımındaki yolu tanır ve orada katalog açmaz', async () => {
    expect(agYoluMu('\\\\sunucu\\paylasim\\katalog.db')).toBe(true);
    expect(agYoluMu('//sunucu/paylasim/katalog.db')).toBe(true);
    expect(agYoluMu('\\\\?\\UNC\\sunucu\\paylasim\\katalog.db')).toBe(true);
    expect(agYoluMu('\\\\?\\C:\\Kullanici\\katalog.db')).toBe(false);
    expect(agYoluMu('C:\\Kullanici\\.ayikla\\katalog.db')).toBe(false);
    await expect(new Katalog('\\\\sunucu\\paylasim\\katalog.db').yukle()).rejects.toThrow(/ağ klasöründe/);
  });

  describe('kayit.json → veritabanı geçişi', () => {
    it('eski kaydı aktarır: elle düzeltmeler, kullanıcı grupları ve son arşivler korunur; JSON silinmez', async () => {
      const klasor = await geciciKlasor();
      const json = join(klasor, 'kayit.json');
      const metin = JSON.stringify(ESKI);
      await writeFile(json, metin);

      const d = await katalogAc(klasor);
      expect(d.gecildi).toBe(true);
      expect(d.al('a')).toMatchObject({ elleGrup: 'deniz', grupId: 'deniz' });
      expect(d.al('b')).toMatchObject({ geriAlindi: true, eleme: null });
      expect(d.al('c')?.eleme).toBe('bulanik');
      expect(d.veri.kullaniciGruplari).toEqual(ESKI.kullaniciGruplari);
      expect(d.veri.sonArsivler).toEqual(ESKI.sonArsivler);
      expect(await readFile(json, 'utf8')).toBe(metin); // eski dosya yedek olarak aynen duruyor

      const yeniden = await katalogAc(klasor);
      expect(yeniden.veri).toEqual(d.veri);
      expect(yeniden.gecildi).toBe(false); // ikinci açılışta yeniden aktarılmaz
    });

    it('iki kez çalışınca veri çoğalmaz ve sonradan yapılan düzeltme ezilmez', async () => {
      const klasor = await geciciKlasor();
      await writeFile(join(klasor, 'kayit.json'), JSON.stringify(ESKI));
      const dosya = join(klasor, KATALOG_ADI);

      const d = await katalogAc(klasor);
      expect(sayilar(dosya)).toEqual({ medya: 3, grup: 1, arsiv: 2 });
      d.al('a')!.elleGrup = 'orman'; // geçişten sonra kullanıcı fikrini değiştirdi
      await d.kaydet();

      // Geçiş işaretini silip aktarımı zorla yeniden çalıştır (ör. yarıda kalmış bir eski sürüm)
      const vt = new Database(dosya);
      vt.prepare("DELETE FROM meta WHERE anahtar = 'json_gecisi'").run();
      vt.close();
      const ikinci = await katalogAc(klasor);
      expect(ikinci.gecildi).toBe(true);
      expect(sayilar(dosya)).toEqual({ medya: 3, grup: 1, arsiv: 2 });
      expect(ikinci.al('a')?.elleGrup).toBe('orman'); // eski JSON yeni düzeltmeyi ezmedi
    });

    it('bozuk kayit.json silinmez: kenara alınır, katalog boş başlar ve bir daha denenmez', async () => {
      const klasor = await geciciKlasor();
      const json = join(klasor, 'kayit.json');
      await writeFile(json, '{"surum":1,"medya":{"a":'); // yarıda kesilmiş JSON
      const d = await katalogAc(klasor);
      expect(d.al('a')).toBeUndefined();
      expect(d.kurtarilan).toMatch(/kayit\.json\.bozuk-/);
      expect(await readFile(d.kurtarilan!, 'utf8')).toBe('{"surum":1,"medya":{"a":');
      d.koy(ornek('b'));
      await d.kaydet();

      const ikinci = await katalogAc(klasor);
      expect(ikinci.kurtarilan).toBeNull();
      expect(ikinci.al('b')).toBeDefined();
      expect((await readdir(klasor)).filter((a) => a.includes('bozuk'))).toHaveLength(1);
    });

    it('bilinmeyen sürümdeki eski kayıt da ezilmez, kenara alınır', async () => {
      const klasor = await geciciKlasor();
      await writeFile(join(klasor, 'kayit.json'), JSON.stringify({ surum: 2, medya: {}, kullaniciGruplari: [] }));
      const d = await katalogAc(klasor);
      expect(JSON.parse(await readFile(d.kurtarilan!, 'utf8')).surum).toBe(2);
    });
  });

  describe('veritabanı güvenliği', () => {
    it('bozuk veritabanı silinmez: kenara alınır ve eski kayit.json’dan yeniden kurulur', async () => {
      const klasor = await geciciKlasor();
      await writeFile(join(klasor, 'kayit.json'), JSON.stringify(ESKI));
      await writeFile(join(klasor, KATALOG_ADI), 'bu bir veritabanı değil'.repeat(100));
      const d = await katalogAc(klasor);
      expect(d.kurtarilan).toMatch(/katalog\.db\.bozuk-/);
      expect(await readFile(d.kurtarilan!, 'utf8')).toContain('bu bir veritabanı değil');
      expect(d.al('a')?.elleGrup).toBe('deniz');
    });

    it('daha yeni bir sürümün kataloğuna dokunmaz', async () => {
      const klasor = await geciciKlasor();
      const dosya = join(klasor, KATALOG_ADI);
      const vt = new Database(dosya);
      vt.pragma(`user_version = ${SEMA_SURUMU + 1}`);
      vt.close();
      await expect(katalogAc(klasor)).rejects.toThrow(/daha yeni bir sürümüyle/);
      const vt2 = new Database(dosya, { readonly: true });
      expect(vt2.pragma('user_version', { simple: true })).toBe(SEMA_SURUMU + 1);
      vt2.close();
    });

    it('WAL kipinde açılır ve şema sürümünü yazar', async () => {
      const klasor = await geciciKlasor();
      await katalogAc(klasor);
      const vt = new Database(join(klasor, KATALOG_ADI), { readonly: true });
      expect(vt.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(vt.pragma('user_version', { simple: true })).toBe(SEMA_SURUMU);
      vt.close();
    });
  });
});
