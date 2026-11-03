import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { appendFile, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { hedefKlasor, guvenliAd, disariAktar, hedefSorunu, icindeMi, ARSIV_ISARETI } from '../src/motor/disari-aktar';
import { geciciKlasor } from './yardimci';

const TARIH = new Date(2024, 7, 12).toISOString();

async function kur(icerik = 'bir') {
  const k = await geciciKlasor();
  await mkdir(join(k, 'a'));
  const kaynak = join(k, 'a', 'foto.jpg');
  await writeFile(kaynak, icerik);
  const hedef = join(k, 'H');
  const klasor = join(hedef, 'Deniz', '2024', '08-Ağustos');
  return { k, kaynak, hedef, klasor, oge: { yol: kaynak, grupAdi: 'Deniz', tarih: TARIH } };
}

describe('disari-aktar', () => {
  it('Grup/Yıl/Ay klasörünü üretir', () => {
    expect(hedefKlasor('C:/H', 'Deniz / Plaj', TARIH)).toBe(join('C:/H', 'Deniz - Plaj', '2024', '08-Ağustos'));
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
    const hedef = join(k, 'H');
    const ogeler = [
      { yol: kaynak1, grupAdi: 'Deniz', tarih: TARIH },
      { yol: kaynak2, grupAdi: 'Deniz', tarih: TARIH },
    ];

    const r1 = await disariAktar(ogeler, hedef);
    expect(r1).toEqual({ kopyalanan: 2, atlanan: 0, hatalar: [] });
    const klasor = join(hedef, 'Deniz', '2024', '08-Ağustos');
    expect((await readdir(klasor)).sort()).toEqual(['foto (2).jpg', 'foto.jpg']);
    expect(await readFile(kaynak1, 'utf8')).toBe('bir');

    const r2 = await disariAktar(ogeler, hedef);
    expect(r2).toEqual({ kopyalanan: 0, atlanan: 2, hatalar: [] });
  });

  it('aynı ad ve aynı boyutta ama içeriği farklı dosya "zaten var" sayılmaz; yenisi numaralı kopyalanır', async () => {
    const s = await kur('AAAA');
    await mkdir(s.klasor, { recursive: true });
    await writeFile(join(s.klasor, 'foto.jpg'), 'BBBB'); // aynı boyut, farklı içerik
    const r = await disariAktar([s.oge], s.hedef);
    expect(r).toEqual({ kopyalanan: 1, atlanan: 0, hatalar: [] });
    expect(await readFile(join(s.klasor, 'foto.jpg'), 'utf8')).toBe('BBBB'); // var olan dosyaya dokunulmadı
    expect(await readFile(join(s.klasor, 'foto (2).jpg'), 'utf8')).toBe('AAAA');
  });

  it('hedef köke arşiv işareti koyar; geçici dosya bırakmaz', async () => {
    const s = await kur();
    await disariAktar([s.oge], s.hedef);
    expect(JSON.parse(await readFile(join(s.hedef, ARSIV_ISARETI), 'utf8'))).toMatchObject({ uygulama: 'AYIKLA', surum: 1 });
    expect(await readdir(s.klasor)).toEqual(['foto.jpg']);
  });

  it('kopyalanırken kaynak değişirse kopya kabul edilmez; final adla yarım dosya kalmaz', async () => {
    const s = await kur();
    const r = await disariAktar([s.oge], s.hedef, undefined, {
      kopyadanSonra: async (kaynak) => appendFile(kaynak, '+'), // dış bir uygulama dosyayı değiştiriyor
    });
    expect(r.kopyalanan).toBe(0);
    expect(r.hatalar).toHaveLength(1);
    expect(r.hatalar[0].hata).toMatch(/kaynak dosya değişti/);
    expect(await readdir(s.klasor)).toEqual([]);
  });

  it('kopya bozulursa yeniden dener; ikinci deneme sağlamsa doğrulanmış kopya sayılır', async () => {
    const s = await kur('saglam icerik');
    let deneme = 0;
    const r = await disariAktar([s.oge], s.hedef, undefined, {
      kopyadanSonra: async (_k, gecici) => {
        if (++deneme === 1) await writeFile(gecici, 'bozuk icerik!');
      },
    });
    expect(deneme).toBe(2);
    expect(r).toEqual({ kopyalanan: 1, atlanan: 0, hatalar: [] });
    expect(await readFile(join(s.klasor, 'foto.jpg'), 'utf8')).toBe('saglam icerik');
  });

  it('kopya hep bozuk çıkarsa başarılı saymaz, hata verir ve hiçbir dosya bırakmaz', async () => {
    const s = await kur('saglam icerik');
    const r = await disariAktar([s.oge], s.hedef, undefined, {
      kopyadanSonra: async (_k, gecici) => writeFile(gecici, 'bozuk icerik!'),
    });
    expect(r.kopyalanan).toBe(0);
    expect(r.hatalar[0].hata).toMatch(/SHA-256/);
    expect(await readdir(s.klasor)).toEqual([]);
    expect(await readFile(s.kaynak, 'utf8')).toBe('saglam icerik');
  });

  it('okunamayan kaynak tüm aktarmayı durdurmaz', async () => {
    const s = await kur();
    const r = await disariAktar([{ ...s.oge, yol: join(s.k, 'yok.jpg') }, s.oge], s.hedef);
    expect(r.kopyalanan).toBe(1);
    expect(r.hatalar).toHaveLength(1);
  });
});

describe('hedefSorunu', () => {
  const kaynak = join('C:', 'Fotolar');
  it('kaynağın içine ya da kaynağı içine alan klasöre kaydetmeyi reddeder', () => {
    expect(hedefSorunu(join(kaynak, 'Ayiklanmis'), [kaynak])).toMatch(/içinde olamaz/);
    expect(hedefSorunu(kaynak, [kaynak])).toMatch(/içinde olamaz/);
    expect(hedefSorunu(join('C:', 'Kullanici'), [join('C:', 'Kullanici', 'Resimler')])).toMatch(/içine alamaz/);
  });

  it('çalışma klasörüne kaydetmeyi reddeder; ayrı klasöre izin verir', () => {
    const calisma = join('C:', 'Kullanici', '.ayikla');
    expect(hedefSorunu(join(calisma, 'x'), [kaynak], calisma)).toMatch(/çalışma klasörü/);
    expect(hedefSorunu(join('D:', 'Yedek'), [kaynak], calisma)).toBeNull();
    expect(hedefSorunu(join('C:', 'Fotolar2'), [kaynak])).toBeNull(); // yalnız ad benzerliği iç içe sayılmaz
  });

  it('Windows’ta büyük/küçük harf fark etmez', () => {
    expect(icindeMi(join('C:', 'FOTOLAR', 'a'), join('C:', 'fotolar'), true)).toBe(true);
  });
});
