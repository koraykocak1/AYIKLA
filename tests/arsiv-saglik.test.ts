import { describe, it, expect } from 'vitest';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { blobAl, blobYolu, iceAl } from '../src/motor/arsiv-depo';
import { saglikDenetimi, sonSaglikRaporu } from '../src/motor/arsiv-saglik';
import { acikArsiv, klasorGoruntusu } from './yardimci';

describe('arşiv sağlık denetimi', () => {
  it('sağlam arşivde sorun bulmaz', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'bir');
      await writeFile(join(kaynak, 'b.jpg'), 'iki');
      await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }, { yol: join(kaynak, 'b.jpg') }]);
      const r = await saglikDenetimi(a);
      expect(r).toMatchObject({ bitti: true, denetlenen: 2, saglam: 2, degismis: [], eksik: [], kayitsiz: [], refHatali: [], katalog: 'ok' });
      expect(sonSaglikRaporu(a)?.zaman).toBe(r.zaman);
    } finally {
      await a.kapat();
    }
  });

  it('değiştirilmiş, eksik ve kayıtsız dosyayı ve yanlış ref sayısını bulur; hiçbir şeye dokunmaz', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      for (const ad of ['a.jpg', 'b.jpg', 'c.jpg']) await writeFile(join(kaynak, ad), `içerik ${ad}`);
      const r = await iceAl(a, ['a.jpg', 'b.jpg', 'c.jpg'].map((ad) => ({ yol: join(kaynak, ad) })));
      const [ba, bb, bc] = r.ogeler.map((o) => blobAl(a, o.sha256)!);

      // a: aynı boyutta, tek baytı değişmiş kopya (sessiz bozulma)
      const icerik = await readFile(blobYolu(a, ba));
      icerik[0] ^= 1;
      await writeFile(blobYolu(a, ba), icerik);
      await rm(blobYolu(a, bb)); // b: dosyası silinmiş
      await writeFile(join(kok, 'medya', 'yabanci.jpg'), 'x'); // kaydı olmayan dosya
      a.vt.prepare('UPDATE blob SET ref_sayisi = 5 WHERE sha256 = ?').run(bc.sha256);

      const medyaOnce = await klasorGoruntusu(join(kok, 'medya'));
      const rapor = await saglikDenetimi(a);
      expect(rapor.degismis).toEqual([ba.yol_goreli]);
      expect(rapor.eksik).toEqual([bb.yol_goreli]);
      expect(rapor.kayitsiz).toEqual(['medya/yabanci.jpg']);
      expect(rapor.refHatali).toEqual([{ sha256: bc.sha256, kayitli: 5, gercek: 1 }]);
      expect(rapor.saglam).toBe(1);
      expect(await klasorGoruntusu(join(kok, 'medya'))).toEqual(medyaOnce); // yalnız okudu
    } finally {
      await a.kapat();
    }
  });

  it('durdurulabilir; düşük öncelikte bekleyerek çalışır', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      for (const ad of ['a.jpg', 'b.jpg', 'c.jpg']) await writeFile(join(kaynak, ad), ad);
      await iceAl(a, ['a.jpg', 'b.jpg', 'c.jpg'].map((ad) => ({ yol: join(kaynak, ad) })));
      const durdurucu = new AbortController();
      const r = await saglikDenetimi(a, {
        bekleme: 5,
        ilerleme: (bitti) => {
          if (bitti === 1) durdurucu.abort();
        },
        durdur: durdurucu.signal,
      });
      expect(r).toMatchObject({ bitti: false, denetlenen: 1 });
    } finally {
      await a.kapat();
    }
  });
});
