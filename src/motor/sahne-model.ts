import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
  pipeline,
} from '@huggingface/transformers';
import { cihazTutarliMi, normalize } from './sahne-puan';
import type { SahneModeli } from './tipler';

const CLIP = 'Xenova/clip-vit-base-patch32';
const CEVIRI = 'Xenova/opus-mt-tr-en';

/** Ekran kartını sınamak için birbirinden çok farklı iki küçük test resmi. */
function sinamaResimleri(): RawImage[] {
  const b = 224;
  const egim = new Uint8ClampedArray(b * b * 3);
  const dama = new Uint8ClampedArray(b * b * 3);
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      const i = (y * b + x) * 3;
      egim[i] = x;
      egim[i + 1] = y;
      egim[i + 2] = 255 - x;
      const v = ((x >> 4) + (y >> 4)) % 2 ? 230 : 20;
      dama[i] = v;
      dama[i + 1] = v;
      dama[i + 2] = v;
    }
  }
  return [new RawImage(egim, b, b, 3), new RawImage(dama, b, b, 3)];
}

/**
 * Kütüphanenin ağa çıkıp çıkamayacağını belirler. Onay yoksa `false`: dosyalar yalnız diskteki önbellekten okunur,
 * eksik dosya varsa indirme denenmez, hata verilir (bkz. model-izni.ts).
 */
function onbellekAyarla(modelKlasoru: string, uzaktanIzin: boolean) {
  env.cacheDir = modelKlasoru;
  env.allowRemoteModels = uzaktanIzin;
}

export async function sahneModeliYukle(modelKlasoru: string, uzaktanIzin: boolean): Promise<SahneModeli> {
  onbellekAyarla(modelKlasoru, uzaktanIzin);
  const islemci = await AutoProcessor.from_pretrained(CLIP);
  const ayirici = await AutoTokenizer.from_pretrained(CLIP);
  type GorselModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>;
  const vektorBul = async (m: GorselModel, resim: RawImage) => {
    const { image_embeds } = await m(await islemci(resim));
    return normalize(image_embeds.data as Float32Array);
  };

  // İşlemci her zaman doğru sonuç verir; ekran kartı ancak aynı sonucu verirse kullanılır.
  const cpu = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });
  let cihaz = 'cpu';
  let gorsel = cpu;
  try {
    const dml = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'dml', dtype: 'fp32' });
    const resimler = sinamaResimleri();
    const deneme: number[][] = [];
    const referans: number[][] = [];
    for (const r of resimler) {
      deneme.push(await vektorBul(dml, r));
      referans.push(await vektorBul(cpu, r));
    }
    if (cihazTutarliMi(deneme, referans)) {
      cihaz = 'dml'; // Windows ekran kartı (DirectML)
      gorsel = dml;
      await cpu.dispose();
    } else {
      await dml.dispose();
    }
  } catch {
    // ekran kartı açılamadı: işlemciyle devam
  }
  const metin = await CLIPTextModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });

  return {
    cihaz,
    async resimVektoru(yol) {
      return vektorBul(gorsel, await RawImage.read(yol));
    },
    async metinVektorleri(metinler) {
      const girdi = ayirici(metinler, { padding: true, truncation: true });
      const { text_embeds } = await metin(girdi);
      const boy = text_embeds.dims[1] as number;
      const veri = text_embeds.data as Float32Array;
      return metinler.map((_, i) => normalize(veri.subarray(i * boy, (i + 1) * boy)));
    },
  };
}

/** Kullanıcının yazdığı Türkçe grup adını CLIP için İngilizceye çevirir. */
export async function ingilizceyeCevir(metin: string, modelKlasoru: string, uzaktanIzin: boolean): Promise<string> {
  onbellekAyarla(modelKlasoru, uzaktanIzin);
  const cevirici = await pipeline('translation', CEVIRI);
  const sonuc = (await cevirici(metin)) as Array<{ translation_text: string }>;
  return sonuc[0]?.translation_text?.replace(/[.!]+$/, '').trim() || metin;
}
