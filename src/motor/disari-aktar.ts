import { copyFile, mkdir, stat, constants } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export interface AktarilacakOge {
  yol: string;
  grupAdi: string;
  tarih: string; // ISO
}

export interface AktarmaSonucu {
  kopyalanan: number;
  atlanan: number;
  hatalar: { yol: string; hata: string }[];
}

/** Windows klasör adında yasak karakterleri temizler. "Deniz / Plaj" → "Deniz - Plaj". */
export function guvenliAd(ad: string): string {
  return ad.replace(/ \/ /g, ' - ').replace(/[<>:"/\\|?*]/g, '-').trim();
}

export function hedefKlasor(kok: string, grupAdi: string, tarihIso: string): string {
  const t = new Date(tarihIso);
  const ay = String(t.getMonth() + 1).padStart(2, '0');
  return join(kok, guvenliAd(grupAdi), String(t.getFullYear()), `${ay}-${AYLAR[t.getMonth()]}`);
}

async function boyutu(yol: string): Promise<number | null> {
  try {
    return (await stat(yol)).size;
  } catch {
    return null;
  }
}

/** Kopyalar; asla üzerine yazmaz. Aynı ad + aynı boyutta dosya varsa atlar. Disk dolarsa durur. */
export async function disariAktar(
  ogeler: AktarilacakOge[],
  kok: string,
  ilerleme?: (bitti: number, toplam: number) => void,
): Promise<AktarmaSonucu> {
  const sonuc: AktarmaSonucu = { kopyalanan: 0, atlanan: 0, hatalar: [] };
  for (let i = 0; i < ogeler.length; i++) {
    const o = ogeler[i];
    try {
      const klasor = hedefKlasor(kok, o.grupAdi, o.tarih);
      await mkdir(klasor, { recursive: true });
      const kaynakBoyut = (await stat(o.yol)).size;
      const uzanti = extname(o.yol);
      const govde = basename(o.yol, uzanti);
      for (let n = 1; ; n++) {
        const hedef = join(klasor, n === 1 ? `${govde}${uzanti}` : `${govde} (${n})${uzanti}`);
        const mevcut = await boyutu(hedef);
        if (mevcut === null) {
          await copyFile(o.yol, hedef, constants.COPYFILE_EXCL);
          sonuc.kopyalanan++;
          break;
        }
        if (mevcut === kaynakBoyut) {
          sonuc.atlanan++;
          break;
        }
      }
    } catch (h) {
      sonuc.hatalar.push({ yol: o.yol, hata: h instanceof Error ? h.message : String(h) });
      if ((h as NodeJS.ErrnoException).code === 'ENOSPC') break;
    }
    ilerleme?.(i + 1, ogeler.length);
  }
  return sonuc;
}
