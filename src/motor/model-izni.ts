import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** İnternetten bir kez inen yapay zekâ modeli: onay ekranında gösterilen bilgiler. */
export interface ModelPaketi {
  id: string; // HuggingFace depo adı; önbellekte de bu klasör adıyla durur
  ad: string;
  gorev: string;
  /** Programın gerçekten açtığı dosyalar (fp32). Hepsi diskteyse model "inmiş" sayılır. */
  dosyalar: string[];
  boyutMB: number; // yukarıdaki dosyaların toplamı, yuvarlanmış
  kaynak: string;
  kodLisansi: string;
  agirlikLisansi: string;
  atif?: string;
}

// Boyutlar HuggingFace dosya listesinden (2026-11-03). Lisanslar: docs/LISANSLAR.md
export const CLIP_PAKETI: ModelPaketi = {
  id: 'Xenova/clip-vit-base-patch32',
  ad: 'CLIP ViT-B/32 (OpenAI)',
  gorev: 'Fotoğrafları sahneye göre tanır',
  dosyalar: [
    'config.json',
    'preprocessor_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/vision_model.onnx',
    'onnx/text_model.onnx',
  ],
  boyutMB: 610,
  kaynak: 'https://huggingface.co/Xenova/clip-vit-base-patch32',
  kodLisansi: 'MIT',
  agirlikLisansi: 'MIT',
};

export const CEVIRI_PAKETI: ModelPaketi = {
  id: 'Xenova/opus-mt-tr-en',
  ad: 'OPUS-MT Türkçe → İngilizce (Helsinki-NLP)',
  gorev: 'Kendi eklediğin grup adlarını çevirir',
  dosyalar: [
    'config.json',
    'generation_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/encoder_model.onnx',
    'onnx/decoder_model_merged.onnx',
  ],
  boyutMB: 440,
  kaynak: 'https://huggingface.co/Xenova/opus-mt-tr-en',
  kodLisansi: 'MIT',
  agirlikLisansi: 'CC-BY 4.0 (atıf gerekir)',
  atif: 'OPUS-MT, Helsinki-NLP — Tiedemann & Thottingal (2020)',
};

export const MODEL_PAKETLERI: ModelPaketi[] = [CLIP_PAKETI, CEVIRI_PAKETI];

/** Onay verilmemişken model gerekirse fırlatılır: arayüz bunu görünce onay adımını açar. */
export class ModelIzniGerekliHatasi extends Error {
  readonly kod = 'MODEL_IZNI_GEREKLI';
  constructor(readonly paket: ModelPaketi) {
    super(`${paket.ad} henüz inmedi; indirmek için onayın gerekiyor.`);
  }
}

async function varMi(yol: string): Promise<boolean> {
  try {
    await access(yol);
    return true;
  } catch {
    return false;
  }
}

/** Dosyaları diskte eksik olan paketler. */
export async function eksikPaketler(modelKlasoru: string, paketler: ModelPaketi[] = MODEL_PAKETLERI): Promise<ModelPaketi[]> {
  const eksik: ModelPaketi[] = [];
  for (const p of paketler) {
    const tamam = await Promise.all(p.dosyalar.map((d) => varMi(join(modelKlasoru, p.id, d))));
    if (tamam.includes(false)) eksik.push(p);
  }
  return eksik;
}

export interface ModelIzinDurumu {
  izinVerildi: boolean;
  eksik: ModelPaketi[];
  /** Eksik model var ve onay yok: arayüz onay adımını göstermeli. */
  indirmeGerekli: boolean;
}

/**
 * Model indirme onayı. Onay `model-izni.json` dosyasında tutulur; dosya yoksa ya da bozuksa onay yok sayılır.
 * Modeller zaten diskteyse onay sorulmaz ve ağa hiç çıkılmaz.
 */
export class ModelIzni {
  private readonly dosya: string;

  constructor(
    private readonly calismaKlasoru: string,
    readonly modelKlasoru: string,
  ) {
    this.dosya = join(calismaKlasoru, 'model-izni.json');
  }

  async verildiMi(): Promise<boolean> {
    try {
      const v = JSON.parse(await readFile(this.dosya, 'utf8')) as { surum?: number; tarih?: string };
      return v.surum === 1 && typeof v.tarih === 'string';
    } catch {
      return false;
    }
  }

  async ver(): Promise<void> {
    await mkdir(this.calismaKlasoru, { recursive: true });
    const kayit = { surum: 1, tarih: new Date().toISOString(), paketler: MODEL_PAKETLERI.map((p) => p.id) };
    await writeFile(this.dosya, JSON.stringify(kayit, null, 2));
  }

  async durum(): Promise<ModelIzinDurumu> {
    const [izinVerildi, eksik] = await Promise.all([this.verildiMi(), eksikPaketler(this.modelKlasoru)]);
    return { izinVerildi, eksik, indirmeGerekli: eksik.length > 0 && !izinVerildi };
  }

  /** Paket ağ bağlantısı olmadan (diskten) ya da onayla açılabilir mi? */
  async kullanilabilirMi(paket: ModelPaketi): Promise<boolean> {
    return (await eksikPaketler(this.modelKlasoru, [paket])).length === 0 || (await this.verildiMi());
  }

  /**
   * Paketi yüklemeden hemen önce sorulur. Dosyalar tamsa `false` döner: kütüphane ağa çıkmasın.
   * Eksikse ve onay varsa `true` döner (indirme serbest); onay yoksa ModelIzniGerekliHatasi fırlatır.
   */
  async uzaktanIzin(paket: ModelPaketi): Promise<boolean> {
    if ((await eksikPaketler(this.modelKlasoru, [paket])).length === 0) return false;
    if (await this.verildiMi()) return true;
    throw new ModelIzniGerekliHatasi(paket);
  }
}
