import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
  pipeline,
} from '@huggingface/transformers';
import { normalize } from './sahne-puan';
import type { SahneModeli } from './tipler';

const CLIP = 'Xenova/clip-vit-base-patch32';
const CEVIRI = 'Xenova/opus-mt-tr-en';

export async function sahneModeliYukle(modelKlasoru: string): Promise<SahneModeli> {
  env.cacheDir = modelKlasoru;
  let cihaz = 'dml'; // Windows ekran kartı (DirectML)
  let gorsel;
  try {
    gorsel = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'dml', dtype: 'fp32' });
  } catch {
    cihaz = 'cpu';
    gorsel = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });
  }
  const metin = await CLIPTextModelWithProjection.from_pretrained(CLIP, { device: 'cpu', dtype: 'fp32' });
  const islemci = await AutoProcessor.from_pretrained(CLIP);
  const ayirici = await AutoTokenizer.from_pretrained(CLIP);

  return {
    cihaz,
    async resimVektoru(yol) {
      const resim = await RawImage.read(yol);
      const girdi = await islemci(resim);
      const { image_embeds } = await gorsel(girdi);
      return normalize(image_embeds.data as Float32Array);
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
export async function ingilizceyeCevir(metin: string, modelKlasoru: string): Promise<string> {
  env.cacheDir = modelKlasoru;
  const cevirici = await pipeline('translation', CEVIRI);
  const sonuc = (await cevirici(metin)) as Array<{ translation_text: string }>;
  return sonuc[0]?.translation_text?.replace(/[.!]+$/, '').trim() || metin;
}
