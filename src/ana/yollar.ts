import { join, resolve } from 'node:path';

export type AdresIstegi = { tur: 'onizleme'; ad: string } | { tur: 'dosya'; yol: string };

const ONIZLEME_ADI = /^[0-9a-f]{40}(-\d)?\.jpg$/;

/** ayikla://onizleme/<ad> ve ayikla://dosya/<kodlanmış yol> adreslerini çözer; başka her şey null. */
export function adresCoz(adres: string): AdresIstegi | null {
  let u: URL;
  try {
    u = new URL(adres);
  } catch {
    return null;
  }
  if (u.protocol !== 'ayikla:') return null;
  let parca: string;
  try {
    parca = decodeURIComponent(u.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
  if (u.hostname === 'onizleme' && ONIZLEME_ADI.test(parca)) return { tur: 'onizleme', ad: parca };
  if (u.hostname === 'dosya' && parca) return { tur: 'dosya', yol: parca };
  return null;
}

export function onizlemeYolu(kok: string, ad: string): string | null {
  return ONIZLEME_ADI.test(ad) ? join(kok, ad) : null;
}

/** Komut satırında (ör. kısayolun üstüne bırakılan) bir klasör varsa onu döndürür. */
export function baslangicKlasoru(argv: string[], uygulamaYolu: string, klasorMu: (yol: string) => boolean): string | null {
  const uygulama = resolve(uygulamaYolu).toLowerCase();
  for (const arg of argv.slice(1).reverse()) {
    if (arg.startsWith('-')) continue;
    if (resolve(arg).toLowerCase() === uygulama) continue;
    if (klasorMu(arg)) return arg;
  }
  return null;
}
