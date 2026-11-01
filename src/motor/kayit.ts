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

  async yukle(): Promise<void> {
    try {
      const v = JSON.parse(await readFile(this.dosya, 'utf8')) as KayitVerisi;
      if (v.surum === 1) this.veri = v;
    } catch {
      // ilk açılış veya bozuk dosya: boş kayıtla devam
    }
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
