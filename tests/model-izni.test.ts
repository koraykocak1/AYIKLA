import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { env } from '@huggingface/transformers';
import { CEVIRI_PAKETI, CLIP_PAKETI, ModelIzni, ModelIzniGerekliHatasi, eksikPaketler } from '../src/motor/model-izni';
import { sahneModeliYukle, ingilizceyeCevir } from '../src/motor/sahne-model';
import { sunucuOlustur } from '../src/motor/sunucu';
import type { ArayuzOlayi, IsciIstegi, IsciMesaji, Istek, ModelDurumuCevabi, Sayim } from '../src/ortak/mesajlar';
import type { SahneModeli } from '../src/motor/tipler';
import { geciciKlasor, desenliResim, sahteModelDosyalari } from './yardimci';

const sahteModel: SahneModeli = {
  cihaz: 'sahte',
  resimVektoru: async () => [1, 0, 0],
  metinVektorleri: async (m) => m.map(() => [1, 0, 0]),
};

async function kur() {
  const kok = await geciciKlasor();
  const calisma = join(kok, 'calisma');
  const modeller = join(calisma, 'modeller');
  const girdi = join(kok, 'girdi');
  await mkdir(girdi);
  await desenliResim(join(girdi, 'a.jpg'), { renk: [40, 40, 220], tohum: 1 });
  return { kok, calisma, modeller, girdi, izin: new ModelIzni(calisma, modeller) };
}

describe('model indirme onayı', () => {
  it('diskte olmayan paketleri bulur', async () => {
    const k = await kur();
    expect((await eksikPaketler(k.modeller)).map((p) => p.id)).toEqual([CLIP_PAKETI.id, CEVIRI_PAKETI.id]);
    await sahteModelDosyalari(k.modeller, [CLIP_PAKETI]);
    expect((await eksikPaketler(k.modeller)).map((p) => p.id)).toEqual([CEVIRI_PAKETI.id]);
  });

  it('onay dosyası yoksa ya da bozuksa onay yok sayılır', async () => {
    const k = await kur();
    expect(await k.izin.verildiMi()).toBe(false);
    await mkdir(k.calisma, { recursive: true });
    await writeFile(join(k.calisma, 'model-izni.json'), '{bozuk');
    expect(await k.izin.verildiMi()).toBe(false);
    await k.izin.ver();
    expect(await k.izin.verildiMi()).toBe(true);
    const kayit = JSON.parse(await readFile(join(k.calisma, 'model-izni.json'), 'utf8'));
    expect(kayit).toMatchObject({ surum: 1, paketler: [CLIP_PAKETI.id, CEVIRI_PAKETI.id] });
    expect(new Date(kayit.tarih).toISOString()).toBe(kayit.tarih);
  });

  it('dosyalar tamsa onay sorulmaz ve ağa çıkılmaz; eksikse onaysız hata verir', async () => {
    const k = await kur();
    await expect(k.izin.uzaktanIzin(CLIP_PAKETI)).rejects.toBeInstanceOf(ModelIzniGerekliHatasi);
    await sahteModelDosyalari(k.modeller, [CLIP_PAKETI]);
    expect(await k.izin.uzaktanIzin(CLIP_PAKETI)).toBe(false);
    expect((await k.izin.durum()).indirmeGerekli).toBe(true); // çeviri modeli hâlâ eksik
    await k.izin.ver();
    expect(await k.izin.uzaktanIzin(CEVIRI_PAKETI)).toBe(true);
    expect((await k.izin.durum()).indirmeGerekli).toBe(false);
  });
});

describe('sunucu: onaysız indirme yok', () => {
  async function sunucu(k: Awaited<ReturnType<typeof kur>>) {
    const mesajlar: IsciMesaji[] = [];
    const indirici = vi.fn(async (_uzak: boolean) => sahteModel); // sahte indirici
    const cevirici = vi.fn(async (_m: string, _uzak: boolean) => 'blue');
    const s = sunucuOlustur({ calismaKlasoru: k.calisma, modelYukle: indirici, cevir: cevirici, modelIzni: k.izin, gonder: (m) => mesajlar.push(m) });
    let sira = 0;
    const iste = async <T>(i: Istek): Promise<T> => {
      const id = ++sira;
      await s.isle({ ...i, id } as IsciIstegi);
      const m = mesajlar.find((x) => x.tur === 'cevap' && x.cevap.id === id);
      if (!m || m.tur !== 'cevap') throw new Error('cevap yok');
      if (!m.cevap.tamam) throw new Error(m.cevap.hata);
      return m.cevap.veri as T;
    };
    const olaylar = (): ArayuzOlayi[] => mesajlar.flatMap((m) => (m.tur === 'olay' ? [m.olay] : []));
    return { iste, olaylar, indirici, cevirici };
  }

  it('onay yokken sayım, ayıklama ve grup ekleme indiriciyi çağırmaz', async () => {
    const k = await kur();
    const s = await sunucu(k);
    const durum = await s.iste<ModelDurumuCevabi>({ tur: 'modelDurumu' });
    expect(durum.indirmeGerekli).toBe(true);
    expect(durum.paketler.map((p) => p.id)).toEqual([CLIP_PAKETI.id, CEVIRI_PAKETI.id]);
    expect(durum.toplamMB).toBe(CLIP_PAKETI.boyutMB + CEVIRI_PAKETI.boyutMB);
    expect(durum.paketler[0]).toMatchObject({ kaynak: expect.stringContaining('huggingface.co'), kodLisansi: 'MIT' });
    expect('dosyalar' in durum.paketler[0]).toBe(false);

    expect(await s.iste<Sayim>({ tur: 'say', girdiler: [k.girdi] })).toEqual({ foto: 1, video: 0, ham: 0 });
    await expect(s.iste({ tur: 'baslat', girdiler: [k.girdi] })).rejects.toThrow('onayın gerekiyor');
    await expect(s.iste({ tur: 'grupEkle', ad: 'Araba' })).rejects.toThrow('onayın gerekiyor');
    expect(s.indirici).not.toHaveBeenCalled();
    expect(s.cevirici).not.toHaveBeenCalled();
    expect(s.olaylar()).toContainEqual({ tur: 'model', durum: 'izinGerekli' });
    expect(s.olaylar()).not.toContainEqual({ tur: 'model', durum: 'yukleniyor' });
  });

  it('onay verilince indirici ağ izniyle çağrılır', async () => {
    const k = await kur();
    const s = await sunucu(k);
    const sonra = await s.iste<ModelDurumuCevabi>({ tur: 'modelIzniVer' });
    expect(sonra.indirmeGerekli).toBe(false);
    await s.iste({ tur: 'baslat', girdiler: [k.girdi] });
    expect(s.indirici).toHaveBeenCalledWith(true);
    await s.iste({ tur: 'grupEkle', ad: 'Araba' });
    expect(s.cevirici).toHaveBeenCalledWith('Araba', true);
  });

  it('modeller zaten inmişse hiçbir şey sorulmaz, yükleyici ağsız çağrılır', async () => {
    const k = await kur();
    await sahteModelDosyalari(k.modeller);
    const s = await sunucu(k);
    expect((await s.iste<ModelDurumuCevabi>({ tur: 'modelDurumu' })).indirmeGerekli).toBe(false);
    await s.iste({ tur: 'say', girdiler: [k.girdi] }); // ısınma serbest
    await s.iste({ tur: 'baslat', girdiler: [k.girdi] });
    expect(s.indirici).toHaveBeenCalledWith(false);
    expect(s.indirici).toHaveBeenCalledTimes(1);
    await s.iste({ tur: 'grupEkle', ad: 'Araba' });
    expect(s.cevirici).toHaveBeenCalledWith('Araba', false);
    expect(await k.izin.verildiMi()).toBe(false); // onay dosyası yazılmadı
  });
});

describe('gerçek kütüphane: ağ izni kapalıyken indirme denenmez', () => {
  const asil = env.fetch;
  afterEach(() => {
    env.fetch = asil;
  });

  it('boş klasörde izinsiz yükleme ağa çıkmadan hata verir; izin açıkken ağa çıkar', async () => {
    const k = await kur();
    const sahteIndirici = vi.fn(async (_adres: string | URL) => new Response('', { status: 404 }));
    env.fetch = sahteIndirici as typeof env.fetch;
    await expect(sahneModeliYukle(k.modeller, false)).rejects.toThrow();
    await expect(ingilizceyeCevir('deniz', k.modeller, false)).rejects.toThrow();
    expect(sahteIndirici).not.toHaveBeenCalled();
    // Karşı sınama: izin açıkken kütüphane gerçekten bu indiriciyi kullanıyor
    await expect(sahneModeliYukle(k.modeller, true)).rejects.toThrow();
    expect(sahteIndirici).toHaveBeenCalled();
    expect(String(sahteIndirici.mock.calls[0][0])).toContain('huggingface.co');
  }, 30_000);
});
