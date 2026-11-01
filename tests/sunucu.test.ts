import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { sunucuOlustur } from '../src/motor/sunucu';
import { normalize } from '../src/motor/sahne-puan';
import { KayitDeposu } from '../src/motor/kayit';
import type { ArayuzMedya, ArayuzOlayi, IsciIstegi, IsciMesaji, Istek, Sayim } from '../src/ortak/mesajlar';
import type { Grup, SahneModeli } from '../src/motor/tipler';
import type { AktarmaSonucu } from '../src/motor/disari-aktar';
import { geciciKlasor, desenliResim, bulanikResim, ornekVideo } from './yardimci';

// Sahte model: resmin ortalama rengi vektör olur; "blue" tarifi maviye, diğer her tarif yeşile denk gelir.
const sahteModel: SahneModeli = {
  cihaz: 'sahte',
  async resimVektoru(yol) {
    const s = await sharp(yol).stats();
    return normalize(s.channels.slice(0, 3).map((c) => c.mean));
  },
  async metinVektorleri(metinler) {
    return metinler.map((m) => (m === 'blue' ? [0, 0, 1] : [0, 1, 0]));
  },
};

async function hazirla(modelYukle: () => Promise<SahneModeli> = async () => sahteModel) {
  const kok = await geciciKlasor();
  const girdi = join(kok, 'girdi');
  await mkdir(girdi);
  await desenliResim(join(girdi, 'mavi.jpg'), { renk: [40, 40, 220], tohum: 2 });
  await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
  await ornekVideo(join(girdi, 'video.mp4'), 'red');
  const calisma = join(kok, 'calisma');
  const mesajlar: IsciMesaji[] = [];
  const sunucu = sunucuOlustur({ calismaKlasoru: calisma, modelYukle, cevir: async () => 'blue', gonder: (m) => mesajlar.push(m) });
  let sira = 0;
  async function iste<T>(i: Istek): Promise<T> {
    const id = ++sira;
    await sunucu.isle({ ...i, id } as IsciIstegi);
    const m = mesajlar.find((x) => x.tur === 'cevap' && x.cevap.id === id);
    if (!m || m.tur !== 'cevap') throw new Error('cevap yok');
    if (!m.cevap.tamam) throw new Error(m.cevap.hata);
    return m.cevap.veri as T;
  }
  const olaylar = (): ArayuzOlayi[] => mesajlar.flatMap((m) => (m.tur === 'olay' ? [m.olay] : []));
  return { kok, girdi, calisma, iste, olaylar };
}

describe('sunucu', () => {
  it('klasördeki fotoğraf ve videoları sayar', async () => {
    const s = await hazirla();
    expect(await s.iste<Sayim>({ tur: 'say', girdiler: [s.girdi] })).toEqual({ foto: 2, video: 1 });
  });

  it('ayıklarken olayları sırayla yollar, son arşivi kaydeder', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const o = s.olaylar();
    expect(o[0]).toEqual({ tur: 'model', durum: 'yukleniyor' });
    expect(o[1]).toEqual({ tur: 'model', durum: 'hazir', cihaz: 'sahte' });
    expect(o[2]).toEqual({ tur: 'basladi', toplam: 3 });
    const dosyalar = o.filter((x) => x.tur === 'dosya');
    expect(dosyalar).toHaveLength(3);
    for (const d of dosyalar) {
      expect(d.medya.renk).toMatch(/^#[0-9a-f]{6}$/);
      expect('vektor' in d.medya).toBe(false);
    }
    const bitti = o.at(-1);
    expect(bitti?.tur).toBe('bitti');
    if (bitti?.tur === 'bitti') {
      expect(bitti.sonuc).toHaveLength(3);
      expect(bitti.durduruldu).toBe(false);
    }
    const arsivler = await s.iste<{ girdiler: string[]; foto: number; video: number }[]>({ tur: 'sonArsivler' });
    expect(arsivler).toEqual([expect.objectContaining({ girdiler: [s.girdi], foto: 2, video: 1 })]);
  });

  it('yeni grup ekleyince Türkçe adı çevirir ve arşivi yeniden puanlar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const r = await s.iste<{ grup: Grup; sonuc: ArayuzMedya[] }>({ tur: 'grupEkle', ad: 'Mavi' });
    expect(r.grup).toEqual({ id: 'k-mavi', ad: 'Mavi', tarifler: ['a photo of a blue', 'blue'], kullanici: true });
    expect(r.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))?.grupId).toBe('k-mavi');
    const gruplar = await s.iste<Grup[]>({ tur: 'gruplar' });
    expect(gruplar.at(-1)?.id).toBe('k-mavi');
  });

  it('elle taşıma ve geri alma kalıcıdır', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    const bulanik = bitti.sonuc.find((m) => m.yol.endsWith('bulanik.jpg'))!;
    const mavi = bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))!;
    expect(bulanik.eleme).toBe('bulanik');

    const tasinan = await s.iste<ArayuzMedya>({ tur: 'grupTasi', anahtar: bulanik.anahtar, grupId: 'deniz' });
    expect(tasinan).toMatchObject({ grupId: 'deniz', elleGrup: 'deniz', eleme: null });
    const geri = await s.iste<ArayuzMedya>({ tur: 'geriAl', anahtar: mavi.anahtar });
    expect(geri.geriAlindi).toBe(true);

    const d = new KayitDeposu(join(s.calisma, 'kayit.json'));
    await d.yukle();
    expect(d.al(bulanik.anahtar)).toMatchObject({ elleGrup: 'deniz', geriAlindi: true });
    expect(d.al(mavi.anahtar)?.geriAlindi).toBe(true);
  });

  it('elenmeyenleri hedef klasöre kopyalar ve ilerleme yollar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const hedef = join(s.kok, 'hedef');
    const r = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef });
    expect(r).toEqual({ kopyalanan: 2, atlanan: 0, hatalar: [] });
    expect(await readdir(hedef)).toEqual(['Diğer']);
    expect(s.olaylar().filter((o) => o.tur === 'aktarim').at(-1)).toEqual({ tur: 'aktarim', bitti: 2, toplam: 2 });
  });

  it('model yüklenemezse hata bildirir, sonraki denemede yeniden yükler', async () => {
    let deneme = 0;
    const s = await hazirla(async () => {
      deneme++;
      if (deneme === 1) throw new Error('internet yok');
      return sahteModel;
    });
    await expect(s.iste({ tur: 'baslat', girdiler: [s.girdi] })).rejects.toThrow('internet yok');
    expect(s.olaylar()).toContainEqual({ tur: 'model', durum: 'hata', hata: 'internet yok' });
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    expect(deneme).toBe(2);
    expect(s.olaylar().at(-1)?.tur).toBe('bitti');
  });
});
