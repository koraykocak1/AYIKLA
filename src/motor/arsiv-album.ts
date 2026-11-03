import type { Arsiv } from './arsiv';
import type { OgeSatiri } from './arsiv-depo';
import type { MedyaTuru } from './tipler';

/**
 * Sanal albüm, temel etiket ve klasik arama (FAZ 1 #8).
 *
 * Albüm ve etiket yalnız bağdır: bir öğe birden çok albümde ve etikette olabilir, diskte yine tek kopyadır.
 * Albümden kaldırmak ya da albümü silmek öğeyi silmez, kutuya da taşımaz.
 * Etiketler hiyerarşiktir: "Araçlar > Otomobil". Bir üst etiketle süzmek alt etiketleri de kapsar.
 */

export const ETIKET_AYRACI = '>';

/** Karşılaştırma anahtarı: NFC, boşlukları sadeleştirilmiş, Türkçe küçük harf. */
export function adAnahtari(ad: string): string {
  return ad.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
}

/** Arama için daha gevşek anahtar: ayrıca "ı" ile "i" aynı sayılır (ISTANBUL ↔ İstanbul). */
function aramaAnahtari(s: string): string {
  return adAnahtari(s).replace(/ı/g, 'i');
}

function temizAd(ad: string): string {
  const t = ad.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!t) throw new Error('Ad boş olamaz');
  return t;
}

function yerTutucu(n: number): string {
  return Array.from({ length: n }, () => '?').join(',');
}

// ---------------------------------------------------------------- albüm

export interface AlbumSatiri {
  id: number;
  ad: string;
  olusturma: string;
  oge_sayisi: number;
}

/** Albüm oluşturur; aynı adda (büyük/küçük harf fark etmeden) albüm varsa onu döndürür. */
export function albumOlustur(a: Arsiv, ad: string): number {
  const t = temizAd(ad);
  a.vt.prepare('INSERT INTO album (ad, ad_kucuk, olusturma) VALUES (?, ?, ?) ON CONFLICT(ad_kucuk) DO NOTHING').run(
    t,
    adAnahtari(t),
    new Date().toISOString(),
  );
  return (a.vt.prepare('SELECT id FROM album WHERE ad_kucuk = ?').get(adAnahtari(t)) as { id: number }).id;
}

export function albumAdiniDegistir(a: Arsiv, albumId: number, yeniAd: string): void {
  const t = temizAd(yeniAd);
  const cakisan = a.vt.prepare('SELECT id FROM album WHERE ad_kucuk = ? AND id != ?').get(adAnahtari(t), albumId);
  if (cakisan) throw new Error('Bu adda bir albüm zaten var');
  a.vt.prepare('UPDATE album SET ad = ?, ad_kucuk = ? WHERE id = ?').run(t, adAnahtari(t), albumId);
}

/** Albümü siler. Öğeler arşivde kalır; yalnız albümle bağları kalkar. */
export function albumSil(a: Arsiv, albumId: number): void {
  a.vt.prepare('DELETE FROM album WHERE id = ?').run(albumId);
}

/** Albümler ve içlerindeki (kutuda olmayan) öğe sayısı, ada göre. */
export function albumler(a: Arsiv): AlbumSatiri[] {
  return a.vt
    .prepare(
      `SELECT al.id, al.ad, al.olusturma,
         (SELECT COUNT(*) FROM album_oge ao JOIN oge o ON o.id = ao.oge_id WHERE ao.album_id = al.id AND o.silinme IS NULL) AS oge_sayisi
       FROM album al ORDER BY al.ad_kucuk`,
    )
    .all() as AlbumSatiri[];
}

/** Öğeleri albüme ekler (zaten ekliyse değişmez). Eklenen bağ sayısını döndürür. */
export function albumeEkle(a: Arsiv, albumId: number, ogeIdler: number[]): number {
  const ekle = a.vt.prepare('INSERT OR IGNORE INTO album_oge (album_id, oge_id, eklenme) VALUES (?, ?, ?)');
  const simdi = new Date().toISOString();
  return a.vt.transaction(() => ogeIdler.reduce((n, id) => n + ekle.run(albumId, id, simdi).changes, 0))();
}

/** Öğeleri albümden kaldırır. Öğe arşivde kalır (silinmez, kutuya gitmez). */
export function albumdenKaldir(a: Arsiv, albumId: number, ogeIdler: number[]): number {
  if (!ogeIdler.length) return 0;
  return a.vt
    .prepare(`DELETE FROM album_oge WHERE album_id = ? AND oge_id IN (${yerTutucu(ogeIdler.length)})`)
    .run(albumId, ...ogeIdler).changes;
}

/** Öğenin bulunduğu albümler. */
export function ogeninAlbumleri(a: Arsiv, ogeId: number): string[] {
  const satirlar = a.vt
    .prepare('SELECT al.ad FROM album_oge ao JOIN album al ON al.id = ao.album_id WHERE ao.oge_id = ? ORDER BY al.ad_kucuk')
    .all(ogeId) as { ad: string }[];
  return satirlar.map((r) => r.ad);
}

// ---------------------------------------------------------------- etiket

/** "Araçlar > Otomobil" → ["Araçlar", "Otomobil"]. */
export function etiketParcalari(yol: string): string[] {
  const p = yol
    .split(ETIKET_AYRACI)
    .map((s) => s.normalize('NFC').trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  if (!p.length) throw new Error('Etiket boş olamaz');
  return p;
}

function etiketSatiri(a: Arsiv, ust: number | null, ad: string): { id: number } | undefined {
  return a.vt.prepare('SELECT id FROM etiket WHERE COALESCE(ust_id, 0) = ? AND ad_kucuk = ?').get(ust ?? 0, adAnahtari(ad)) as
    | { id: number }
    | undefined;
}

function etiketBul(a: Arsiv, yol: string): number | null {
  let ust: number | null = null;
  for (const parca of etiketParcalari(yol)) {
    const r = etiketSatiri(a, ust, parca);
    if (!r) return null;
    ust = r.id;
  }
  return ust;
}

/** Etiketi (yoksa üstleriyle birlikte) oluşturur, en alttakinin kimliğini döndürür. */
export function etiketOlustur(a: Arsiv, yol: string): number {
  const ekle = a.vt.prepare('INSERT INTO etiket (ad, ad_kucuk, ust_id) VALUES (?, ?, ?)');
  return a.vt.transaction(() => {
    let ust: number | null = null;
    for (const parca of etiketParcalari(yol)) {
      let r = etiketSatiri(a, ust, parca);
      if (!r) {
        ekle.run(parca, adAnahtari(parca), ust);
        r = etiketSatiri(a, ust, parca)!;
      }
      ust = r.id;
    }
    return ust!;
  })();
}

/** Bütün etiketler, tam yollarıyla ("Araçlar > Otomobil"), yola göre sıralı. */
export function etiketler(a: Arsiv): { id: number; yol: string }[] {
  return a.vt
    .prepare(
      `WITH RECURSIVE y(id, yol, anahtar) AS (
         SELECT id, ad, ad_kucuk FROM etiket WHERE ust_id IS NULL
         UNION ALL
         SELECT e.id, y.yol || ' > ' || e.ad, y.anahtar || ' > ' || e.ad_kucuk FROM etiket e JOIN y ON e.ust_id = y.id
       ) SELECT id, yol FROM y ORDER BY anahtar`,
    )
    .all() as { id: number; yol: string }[];
}

/** Öğeleri etiketler (etiket yoksa oluşturur). Yeni bağ sayısını döndürür. */
export function etiketle(a: Arsiv, ogeIdler: number[], yol: string): number {
  const etiketId = etiketOlustur(a, yol);
  const ekle = a.vt.prepare("INSERT OR IGNORE INTO oge_etiket (oge_id, etiket_id, kaynak, eklenme) VALUES (?, ?, 'kullanici', ?)");
  const simdi = new Date().toISOString();
  return a.vt.transaction(() => ogeIdler.reduce((n, id) => n + ekle.run(id, etiketId, simdi).changes, 0))();
}

export function etiketiKaldir(a: Arsiv, ogeIdler: number[], yol: string): number {
  const etiketId = etiketBul(a, yol);
  if (etiketId === null || !ogeIdler.length) return 0;
  return a.vt
    .prepare(`DELETE FROM oge_etiket WHERE etiket_id = ? AND oge_id IN (${yerTutucu(ogeIdler.length)})`)
    .run(etiketId, ...ogeIdler).changes;
}

/** Öğenin etiketleri, tam yollarıyla. */
export function ogeninEtiketleri(a: Arsiv, ogeId: number): string[] {
  const tum = new Map(etiketler(a).map((e) => [e.id, e.yol]));
  return (a.vt.prepare('SELECT etiket_id FROM oge_etiket WHERE oge_id = ?').all(ogeId) as { etiket_id: number }[])
    .map((r) => tum.get(r.etiket_id)!)
    .sort((x, y) => adAnahtari(x).localeCompare(adAnahtari(y), 'tr'));
}

// ---------------------------------------------------------------- arama

export interface AramaSorgusu {
  /** Serbest metin: 4 haneli sayılar yıl sayılır ("2024 deniz"); diğer sözcüklerin hepsi ad, etiket ya da albümde geçmeli. */
  metin?: string;
  tur?: MedyaTuru;
  /** ISO tarih (dahil). */
  baslangic?: string;
  /** ISO tarih (dahil); yalnız gün verilirse o günün sonuna kadar. */
  bitis?: string;
  albumId?: number;
  /** Etiket yolu; alt etiketler de kapsanır. */
  etiket?: string;
  /** true: yalnız kutudakiler. Varsayılan: kutudakiler hariç. */
  kutu?: boolean;
}

/**
 * Klasik arama: ad, tarih (yıl ya da aralık), tür, albüm, etiket. Tarihe göre (yeniden eskiye) sıralı.
 * Yapay zekâ ile anlamsal arama ayrıdır (FAZ 2).
 */
export function ara(a: Arsiv, s: AramaSorgusu = {}): OgeSatiri[] {
  const kosul: string[] = [s.kutu ? 'o.silinme IS NOT NULL' : 'o.silinme IS NULL'];
  const deger: unknown[] = [];
  let cte = '';

  const sozcukler: string[] = [];
  const yillar: string[] = [];
  for (const p of (s.metin ?? '').split(/\s+/).filter(Boolean)) {
    if (/^(18|19|20|21)\d\d$/.test(p)) yillar.push(p);
    else sozcukler.push(aramaAnahtari(p));
  }
  if (s.etiket !== undefined) {
    const kok = etiketBul(a, s.etiket);
    if (kok === null) return [];
    cte = 'WITH RECURSIVE alt(id) AS (SELECT ? UNION ALL SELECT e.id FROM etiket e JOIN alt ON e.ust_id = alt.id)';
    deger.push(kok); // CTE'nin yer tutucusu sorguda ilk sırada
    kosul.push('o.id IN (SELECT oge_id FROM oge_etiket WHERE etiket_id IN (SELECT id FROM alt))');
  }
  if (yillar.length) {
    kosul.push(`substr(o.tarih, 1, 4) IN (${yerTutucu(yillar.length)})`);
    deger.push(...yillar);
  }
  if (s.tur) {
    kosul.push('o.tur = ?');
    deger.push(s.tur);
  }
  if (s.baslangic) {
    kosul.push('o.tarih >= ?');
    deger.push(s.baslangic);
  }
  if (s.bitis) {
    kosul.push('o.tarih <= ?');
    deger.push(/^\d{4}-\d{2}-\d{2}$/.test(s.bitis) ? `${s.bitis}T23:59:59.999Z` : s.bitis);
  }
  if (s.albumId !== undefined) {
    kosul.push('o.id IN (SELECT oge_id FROM album_oge WHERE album_id = ?)');
    deger.push(s.albumId);
  }

  const adaylar = a.vt
    .prepare(`${cte} SELECT o.* FROM oge o WHERE ${kosul.join(' AND ')} ORDER BY o.tarih DESC, o.id DESC`)
    .all(...deger) as OgeSatiri[];
  if (!sozcukler.length) return adaylar;

  // Sözcükler: ad, etiket yolları (üstleri dahil) ve albüm adları içinde aranır.
  const etiketYollari = new Map(etiketler(a).map((e) => [e.id, e.yol]));
  const metinler = new Map<number, string[]>();
  const ekle = (id: number, m: string) => {
    const l = metinler.get(id) ?? [];
    l.push(aramaAnahtari(m));
    metinler.set(id, l);
  };
  for (const r of a.vt.prepare('SELECT oge_id, etiket_id FROM oge_etiket').all() as { oge_id: number; etiket_id: number }[]) {
    ekle(r.oge_id, etiketYollari.get(r.etiket_id) ?? '');
  }
  const albumSatirlari = a.vt.prepare('SELECT ao.oge_id, al.ad FROM album_oge ao JOIN album al ON al.id = ao.album_id').all() as {
    oge_id: number;
    ad: string;
  }[];
  for (const r of albumSatirlari) ekle(r.oge_id, r.ad);
  return adaylar.filter((o) => {
    const alanlar = [aramaAnahtari(o.ad_orijinal), ...(metinler.get(o.id) ?? [])];
    return sozcukler.every((k) => alanlar.some((m) => m.includes(k)));
  });
}
