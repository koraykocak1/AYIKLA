import type { Grup } from './tipler';

export const DIGER_ID = 'diger';
export const EKRAN_ID = 'ekran';
export const INSANLAR_ID = 'insanlar';

/**
 * Hazır gruplar. Tarifler fotoğrafın ANA KONUSUNU anlatır (ör. "yakından yemek"), arka plandaki
 * nesneyi değil. Ayar, kullanıcının gerçek arşivinde (1.452 fotoğraf) grup grup gözle kontrol edilerek yapıldı.
 */
export const HAZIR_GRUPLAR: Grup[] = [
  { id: 'deniz', ad: 'Deniz / Plaj', tarifler: ['a photo of the sea', 'a photo of a beach', 'ocean waves and sand', 'people swimming in the sea'] },
  { id: 'orman', ad: 'Orman / Doğa', tarifler: ['a photo of a forest', 'trees and green nature', 'a hiking trail in the woods', 'a green landscape with fields and trees'] },
  { id: 'dag', ad: 'Dağ', tarifler: ['a photo of mountains', 'a mountain landscape', 'a rocky mountain peak'] },
  { id: 'sehir', ad: 'Şehir', tarifler: ['a photo of a city street', 'buildings in a city', 'a town square', 'a historic building'] },
  // Ev ve bahçe: bu grup yokken ev dışı ve bahçe fotoğrafları İnsanlar'a düşüyordu (kullanıcı denemesi, 2026-11-11)
  {
    id: 'ev',
    ad: 'Ev / Bahçe',
    tarifler: ['a photo of a house', 'the outside of a house or a cottage', 'a garden with flowers and grass', 'a backyard with a lawn and trees', 'an aerial drone view of a house and garden'],
  },
  { id: 'kar', ad: 'Kar', tarifler: ['a snowy landscape', 'a photo of snow', 'winter with snow and ice'] },
  { id: 'gece', ad: 'Gece', tarifler: ['a city at night', 'city lights at night', 'a dark night sky with stars'] },
  {
    id: 'yemek',
    ad: 'Yemek',
    tarifler: ['a close-up photo of food', 'a plate of food', 'a close-up photo of a cake or dessert', 'a cup of coffee or a drink on a table', 'a restaurant meal'],
  },
  { id: INSANLAR_ID, ad: 'İnsanlar / Selfie', tarifler: ['a selfie', 'a portrait of a person', 'a group of friends posing', 'people smiling at the camera'] },
  { id: 'hayvan', ad: 'Hayvanlar', tarifler: ['a photo of a cat', 'a photo of a dog', 'an animal', 'a bird'] },
  { id: EKRAN_ID, ad: 'Ekran görüntüsü', tarifler: ['a screenshot of a phone screen', 'a screenshot of an app with text', 'a screenshot of a chat conversation'] },
];

/**
 * Bağlam tarifleri: fotoğrafta bir nesne olsa da ana konu insansa İnsanlar'a, ana konu tek başına bir
 * nesneyse (buket, yüzük, elbise, makyaj malzemesi…) Diğer'e çekerler. Böylece arkada duran araba,
 * masadaki tabak ya da elde tutulan pudra kutusu fotoğrafı yanlış gruba taşımaz.
 */
export const BAGLAM_TARIFLERI: Record<string, string[]> = {
  [INSANLAR_ID]: [
    'people sitting around a dinner table', 'people toasting with glasses', 'a bride and groom cutting a cake',
    'people dancing at a party at night', 'a couple hugging', 'a bride and groom', 'a woman in a wedding dress',
    'women getting ready, doing makeup', 'a makeup artist doing a bride makeup', 'a woman having her makeup done',
    'a woman looking in a mirror', 'a man and a woman posing', 'a person posing outdoors', 'a crowd of people at an event',
    'a person drinking', 'men toasting with drinks', 'friends drinking together', 'a man walking down the aisle at an outdoor wedding',
    'wedding guests seated at long tables outdoors', 'a DJ playing music', 'a person sitting in a car', 'a person driving a car',
  ],
  hayvan: ['a person holding a dog', 'a woman posing with her dog'],
  [DIGER_ID]: [
    'a wedding bouquet of white flowers', 'flowers and decorations on a table', 'a ring on a hand', 'jewelry',
    'a dress hanging on a hanger', 'clothes', 'makeup products and cosmetics on a table', 'a woman holding a makeup compact and brush',
    'a powder compact', 'a hand holding a small object', 'a close-up of a hand holding something', 'a book or magazine on a table',
    'a road seen through a car windshield', 'a landscape seen from a car window', 'a close-up of an object',
    'feet', 'a room interior', 'an elegant table setting with candles and empty plates',
  ],
};

const HARF: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

function tanimliAd(ingilizce: string): string {
  const ing = ingilizce.trim().toLowerCase();
  return /^(a|an|the) /.test(ing) ? ing : `a ${ing}`;
}

/**
 * Kullanıcının eklediği grup. `ingilizce`, adın İngilizce karşılığıdır (çeviri modelinden gelir).
 * Yalın kelime ("car") tarif olarak kullanılmaz: o, arka planda araba olan her fotoğrafı çeker.
 */
export function kullaniciGrubu(ad: string, ingilizce: string): Grup {
  const temiz = ad.trim();
  const ing = ingilizce.trim().toLowerCase();
  const kok = temiz
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (h) => HARF[h])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const t = tanimliAd(ing);
  return {
    id: `k-${kok}`,
    ad: temiz,
    tarifler: [`a photo of ${t}`, `a close-up photo of ${t}`, `${t} as the main subject of the photo`],
    ingilizce: ing,
    kullanici: true,
  };
}

/** Eski sürümde kaydedilmiş kullanıcı grubunu (tarifler: ['a photo of a car', 'car']) yeni biçime çevirir. */
function guncelKullaniciGrubu(g: Grup): Grup {
  const ing = g.ingilizce ?? g.tarifler[g.tarifler.length - 1] ?? g.ad;
  return kullaniciGrubu(g.ad, ing);
}

/**
 * Yapay zekânın puanlayacağı tarif listesi: her grubun kendi tarifleri + bağlam tarifleri.
 * Kullanıcı grupları için "önünde poz veren insan" gibi tarifler İnsanlar'a eklenir.
 * Diğer her zaman yarışır; nesne fotoğrafları oraya düşer.
 */
export function puanlamaTarifleri(gruplar: Grup[]): { grupId: string; tarifler: string[] }[] {
  const liste = new Map<string, string[]>();
  for (const g of gruplar) {
    const guncel = g.kullanici ? guncelKullaniciGrubu(g) : g;
    liste.set(g.id, [...(liste.get(g.id) ?? []), ...guncel.tarifler]);
  }
  for (const [id, tarifler] of Object.entries(BAGLAM_TARIFLERI)) {
    if (id === DIGER_ID || liste.has(id)) liste.set(id, [...(liste.get(id) ?? []), ...tarifler]);
  }
  if (liste.has(INSANLAR_ID)) {
    for (const g of gruplar.filter((x) => x.kullanici)) {
      const t = tanimliAd(guncelKullaniciGrubu(g).ingilizce ?? g.ad);
      liste.get(INSANLAR_ID)!.push(`a person posing in front of ${t}`, `people with ${t} in the background`, `a selfie with ${t} in the background`);
    }
  }
  return [...liste].map(([grupId, tarifler]) => ({ grupId, tarifler }));
}

export function ekranGoruntusuAdiMi(dosyaAdi: string): boolean {
  return /screenshot|screen[ _-]?shot|ekran g[öo]r[üu]nt[üu]s[üu]|screen_recording/i.test(dosyaAdi);
}
