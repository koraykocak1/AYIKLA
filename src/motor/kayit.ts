import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Grup, IslenmisMedya, MedyaDosyasi, SonArsiv } from './tipler';

export interface KayitVerisi {
  surum: 1;
  medya: Record<string, IslenmisMedya>;
  kullaniciGruplari: Grup[];
  sonArsivler?: SonArsiv[];
}

export const SON_ARSIV_SINIRI = 8;

export function anahtarUret(d: MedyaDosyasi): string {
  return createHash('sha1').update(`${d.yol}|${d.boyut}|${Math.round(d.degisme)}`).digest('hex');
}

export class KayitDeposu {
  readonly dosya: string;
  veri: KayitVerisi = { surum: 1, medya: {}, kullaniciGruplari: [] };

  constructor(dosya: string) {
    this.dosya = dosya;
  }

  /** Okunamayan eski kaydın saklandığı yer (bu açılışta bozuk kayıt bulunduysa). */
  kurtarilan: string | null = null;

  /**
   * Kaydı okur. Dosya yoksa boş başlar. Dosya bozuksa ya da bilinmeyen bir sürümse silinmez:
   * önce `kayit.json.bozuk-<zaman>` adıyla kenara alınır, sonra boş kayıtla devam edilir; böylece
   * sonraki kaydetme kullanıcının düzeltmelerini geri dönülmez biçimde ezmez.
   * Başka bir okuma hatasında (ör. dosya kilitli) boş kayıtla devam edilmez, hata yükselir.
   */
  async yukle(): Promise<void> {
    let metin: string;
    try {
      metin = await readFile(this.dosya, 'utf8');
    } catch (h) {
      if ((h as NodeJS.ErrnoException).code === 'ENOENT') return; // ilk açılış
      throw h;
    }
    try {
      const v = JSON.parse(metin) as KayitVerisi;
      if (v?.surum === 1 && v.medya && Array.isArray(v.kullaniciGruplari)) {
        this.veri = v;
        return;
      }
    } catch {
      // bozuk JSON: aşağıda kenara alınır
    }
    const yedek = `${this.dosya}.bozuk-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await rename(this.dosya, yedek);
    this.kurtarilan = yedek;
  }

  al(anahtar: string): IslenmisMedya | undefined {
    return this.veri.medya[anahtar];
  }

  koy(m: IslenmisMedya): void {
    this.veri.medya[m.anahtar] = m;
  }

  /** Son açılan arşivleri en yeni başta, tekrarsız ve en fazla SON_ARSIV_SINIRI tane tutar. */
  arsivEkle(a: SonArsiv): void {
    const anahtar = JSON.stringify(a.girdiler);
    const eski = (this.veri.sonArsivler ?? []).filter((x) => JSON.stringify(x.girdiler) !== anahtar);
    this.veri.sonArsivler = [a, ...eski].slice(0, SON_ARSIV_SINIRI);
  }

  /** Önce geçici dosyaya yazar, sonra yerine koyar: yarıda kesilirse eski kayıt bozulmaz. */
  async kaydet(): Promise<void> {
    await mkdir(dirname(this.dosya), { recursive: true });
    const gecici = `${this.dosya}.tmp`;
    await writeFile(gecici, JSON.stringify(this.veri));
    await rename(gecici, this.dosya);
  }
}
