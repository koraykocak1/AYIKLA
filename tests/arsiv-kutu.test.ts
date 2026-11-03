import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { blobAl, blobYolu, iceAl, kaynakYollari, ogeAl } from '../src/motor/arsiv-depo';
import {
  KUTU_GUN,
  kaliciSil,
  kaliciSilinmeTarihi,
  kutudakiler,
  kutudanGeriAl,
  kutuyaTasi,
  kutuyuBosalt,
} from '../src/motor/arsiv-kutu';
import { acikArsiv, klasorGoruntusu, medyaDosyalari } from './yardimci';

const GUN = 24 * 60 * 60 * 1000;

describe('geri dönüşüm kutusu', () => {
  it('silinen öğe 30 gün kutuda kalır, geri alınır; süre dolunca kalıcı silinir; kaynak durur', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'bir');
      await writeFile(join(kaynak, 'b.jpg'), 'iki');
      const r = await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }, { yol: join(kaynak, 'b.jpg') }]);
      const [idA, idB] = r.ogeler.map((o) => o.ogeId);
      const kaynakOnce = await klasorGoruntusu(kaynak);

      const silme = new Date('2026-01-01T00:00:00.000Z');
      expect(kutuyaTasi(a, [idA, idB], silme)).toBe(2);
      expect(kutuyaTasi(a, [idA], silme)).toBe(0); // zaten kutuda
      expect(kutudakiler(a).map((o) => o.id).sort()).toEqual([idA, idB].sort());
      expect(kaliciSilinmeTarihi(ogeAl(a, idA)!)?.toISOString()).toBe('2026-01-31T00:00:00.000Z');
      expect((await medyaDosyalari(kok)).length).toBe(2); // kutudayken dosya yerinde

      expect(kutudanGeriAl(a, [idB])).toEqual([idB]);
      expect(ogeAl(a, idB)!.silinme).toBeNull();

      const g29 = await kutuyuBosalt(a, new Date(silme.getTime() + (KUTU_GUN - 1) * GUN));
      expect(g29.silinenOge).toBe(0);
      const g31 = await kutuyuBosalt(a, new Date(silme.getTime() + (KUTU_GUN + 1) * GUN));
      expect(g31).toMatchObject({ silinenOge: 1, silinenDosya: 1, korunanDosya: 0, hatalar: [] });
      expect(ogeAl(a, idA)).toBeUndefined();
      expect(ogeAl(a, idB)).toBeDefined();
      expect((await medyaDosyalari(kok)).length).toBe(1);

      expect(await klasorGoruntusu(kaynak)).toEqual(kaynakOnce); // kaynağa dokunulmadı
    } finally {
      await a.kapat();
    }
  });

  it('kutuda olmayan öğe kalıcı silinemez', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'bir');
      const id = (await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }])).ogeler[0].ogeId;
      expect((await kaliciSil(a, [id])).silinenOge).toBe(0);
      expect(ogeAl(a, id)).toBeDefined();
    } finally {
      await a.kapat();
    }
  });

  it('paylaşılan blob korunur: aynı içerik yeniden alınmışsa eski öğeyi kalıcı silmek dosyayı silmez', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      const yol = join(kaynak, 'a.jpg');
      await writeFile(yol, 'ortak içerik');
      const r1 = await iceAl(a, [{ yol }]);
      const eski = r1.ogeler[0].ogeId;
      kutuyaTasi(a, [eski]);
      const r2 = await iceAl(a, [{ yol }]); // kutudaki içerik yeniden içe alındı → yeni öğe, aynı blob
      const yeni = r2.ogeler[0].ogeId;
      expect(yeni).not.toBe(eski);
      expect(blobAl(a, r1.ogeler[0].sha256)!.ref_sayisi).toBe(2);

      const s = await kaliciSil(a, [eski]);
      expect(s).toMatchObject({ silinenOge: 1, silinenDosya: 0, korunanDosya: 1 });
      expect(blobAl(a, r1.ogeler[0].sha256)!.ref_sayisi).toBe(1);
      expect((await medyaDosyalari(kok)).length).toBe(1);
      expect(ogeAl(a, yeni)!.silinme).toBeNull();
    } finally {
      await a.kapat();
    }
  });

  it('geri alınan öğe, aynı içerikteki canlı öğeyle birleşir; iki öğe olmaz', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'ortak');
      await writeFile(join(kaynak, 'b.jpg'), 'ortak');
      const eski = (await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }])).ogeler[0];
      kutuyaTasi(a, [eski.ogeId]);
      const yeni = (await iceAl(a, [{ yol: join(kaynak, 'b.jpg') }])).ogeler[0];
      expect(kutudanGeriAl(a, [eski.ogeId])).toEqual([yeni.ogeId]);
      expect(ogeAl(a, eski.ogeId)).toBeUndefined();
      expect(kaynakYollari(a, yeni.ogeId).map((k) => k.yol).sort()).toEqual([join(kaynak, 'a.jpg'), join(kaynak, 'b.jpg')].sort());
      expect(blobAl(a, eski.sha256)!.ref_sayisi).toBe(1);
    } finally {
      await a.kapat();
    }
  });

  it('dosyası zaten yoksa kalıcı silme hata vermez; kaynak durur', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'bir');
      const o = (await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }])).ogeler[0];
      kutuyaTasi(a, [o.ogeId]);
      const dosya = blobYolu(a, blobAl(a, o.sha256)!);
      await rm(dosya);
      expect(await kaliciSil(a, [o.ogeId])).toMatchObject({ silinenOge: 1, hatalar: [] });
      expect(existsSync(dosya)).toBe(false);
      expect(existsSync(join(kaynak, 'a.jpg'))).toBe(true);
    } finally {
      await a.kapat();
    }
  });
});
