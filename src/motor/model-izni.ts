import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dosyaOzeti } from './disari-aktar';

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
  /** Sabitlenen HuggingFace commit'i: dosyalar yalnız bu sürümden iner (`main` dalı değişse de). */
  surum: string;
  /** Her dosyanın bu sürümdeki SHA-256'sı: inen dosya bununla doğrulanır. */
  ozetler: Record<string, string>;
}

// Boyutlar ve özetler HuggingFace API'sinden (2026-11-03); bu bilgisayardaki çalışan kopyayla birebir aynı.
// Lisanslar: docs/LISANSLAR.md
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
  surum: '6b7c523703ae26e39be4b03774966f8571c7f523',
  ozetler: {
    'config.json': '493ef57ff783e42d1530c91b53469b7fdf8db8a9c1408e86998fcb7899a4f495',
    'preprocessor_config.json': '6f638fb9401a6d6296feff533ee7efe657b787c49f954f82f5906b36ef2a1b1f',
    'tokenizer.json': 'f7f3b7af117d467b58374797691a6438d3e6b9e9cef800dfd5dced7f697a90cd',
    'tokenizer_config.json': '60ba2912bc6344c94bc16bbdec27fa1209409167b6f2fdf3cfe9e65462ea3967',
    'onnx/vision_model.onnx': 'fd6e1402a588279d1723c7534d4bcba5bc0b14b47dfab0e46f8c47b8270d7d40',
    'onnx/text_model.onnx': '3f6571f5bad13a97c469c1622e1cfc4d9aef78b79fdbfcff804ca357bfada8cc',
  },
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
  surum: '78247f41f354af036d24e6f0f8a3d02c6806f96e',
  ozetler: {
    'config.json': 'c7997f0312362bd4b67b8f5184dd0ce9a09a8c6bfe76bddd1f7c5d1c58966fe0',
    'generation_config.json': '606d03551f5442faaf22ebb638b10ddd7210c40cd13cb4d2193b9e4e874b3df3',
    'tokenizer.json': '1aef432629956f2df4e06b2c7e703daaddcaf0c23ab45c7bfd5d253be954f32f',
    'tokenizer_config.json': '73ced36b78140c779b6d98143e72b5cefbc4cc423acd5a5554d84e4f766132dc',
    'onnx/encoder_model.onnx': '7dbf06083b95cbe241cf413ad50ef61465e6a609bd55ec8ad470e6b30a7f41a7',
    'onnx/decoder_model_merged.onnx': 'fb5600bc5abc3467e7ac97fdeef9cab24be6e5dcec500190fa30ea411877fada',
  },
};

/** Kütüphanenin indirme adresi şablonu: `{model}` yerine depo adı konur, sürüm sabittir. */
export function indirmeSablonu(paket: ModelPaketi): string {
  return `{model}/resolve/${paket.surum}/`;
}

/**
 * Paketin diskteki dosyalarını beklenen SHA-256'larla karşılaştırır. Uyuşmayan ya da eksik dosyaları döndürür.
 * `kenaraAl` true ise uyuşmayan dosya silinmez, `<dosya>.bozuk-<zaman>` olarak kenara alınır (bir sonraki
 * onaylı açılışta doğru sürüm yeniden iner).
 */
export async function modelDosyalariniDogrula(modelKlasoru: string, paket: ModelPaketi, kenaraAl = false): Promise<string[]> {
  const uyusmayan: string[] = [];
  for (const d of paket.dosyalar) {
    const yol = join(modelKlasoru, paket.id, d);
    let ozet: string | null = null;
    try {
      ozet = await dosyaOzeti(yol);
    } catch {
      // yok ya da okunamıyor
    }
    if (ozet === paket.ozetler[d]) continue;
    uyusmayan.push(d);
    if (kenaraAl && ozet !== null) await rename(yol, `${yol}.bozuk-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  }
  return uyusmayan;
}

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
