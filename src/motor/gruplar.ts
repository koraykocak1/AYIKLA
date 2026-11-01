import type { Grup } from './tipler';

export const DIGER_ID = 'diger';
export const EKRAN_ID = 'ekran';

export const HAZIR_GRUPLAR: Grup[] = [
  { id: 'deniz', ad: 'Deniz / Plaj', tarifler: ['a photo of the sea', 'a photo of a beach', 'ocean waves and sand', 'people swimming in the sea'] },
  { id: 'orman', ad: 'Orman / Doğa', tarifler: ['a photo of a forest', 'trees and green nature', 'a hiking trail in the woods', 'a green park with grass'] },
  { id: 'dag', ad: 'Dağ', tarifler: ['a photo of mountains', 'a mountain landscape', 'a rocky mountain peak'] },
  { id: 'sehir', ad: 'Şehir', tarifler: ['a photo of a city street', 'buildings in a city', 'a town square', 'a historic building'] },
  { id: 'kar', ad: 'Kar', tarifler: ['a snowy landscape', 'a photo of snow', 'winter with snow and ice'] },
  { id: 'gece', ad: 'Gece', tarifler: ['a photo taken at night', 'city lights at night', 'a dark night sky'] },
  { id: 'yemek', ad: 'Yemek', tarifler: ['a photo of food', 'a plate of food on a table', 'a cup of coffee or a drink', 'a restaurant meal'] },
  { id: 'insanlar', ad: 'İnsanlar / Selfie', tarifler: ['a selfie', 'a portrait of a person', 'a group of friends posing', 'people smiling at the camera'] },
  { id: 'hayvan', ad: 'Hayvanlar', tarifler: ['a photo of a cat', 'a photo of a dog', 'an animal', 'a bird'] },
  { id: EKRAN_ID, ad: 'Ekran görüntüsü', tarifler: ['a screenshot of a phone screen', 'a screenshot of an app with text', 'a screenshot of a chat conversation'] },
];

const HARF: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/** Kullanıcının eklediği grup. `ingilizce`, adın İngilizce karşılığıdır (çeviri modelinden gelir). */
export function kullaniciGrubu(ad: string, ingilizce: string): Grup {
  const temiz = ad.trim();
  const ing = ingilizce.trim().toLowerCase();
  const kok = temiz
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (h) => HARF[h])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const tanimli = /^(a|an|the) /.test(ing) ? ing : `a ${ing}`;
  return { id: `k-${kok}`, ad: temiz, tarifler: [`a photo of ${tanimli}`, ing], kullanici: true };
}

export function ekranGoruntusuAdiMi(dosyaAdi: string): boolean {
  return /screenshot|screen[ _-]?shot|ekran g[öo]r[üu]nt[üu]s[üu]|screen_recording/i.test(dosyaAdi);
}
