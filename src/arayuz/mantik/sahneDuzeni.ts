import { grupKuresi, halka } from '../hareket';

/** Ayıklama ekranında üstte bir küreyle gösterilen grup. */
export interface SahneGrubu {
  id: string;
  ad: string;
  elenecek?: boolean;
}

/** Bekleyen yıldız tozu: `n` fotoğraf `grup`a gidecek. `kaynak` varsa halkadan değil o grubun küresinden kalkar (kopya çıkınca). */
export interface Bekleyen {
  grup: string;
  kaynak: string | null;
  n: number;
}

/**
 * Ayıklama ekranındaki tuvallerin paylaştığı canlı veri. Olaylar React'i her seferinde yeniden çizdirmesin diye
 * bir ref içinde tutulur: ekran yazar, tuvaller her karede okur.
 */
export interface AyiklamaSahnesi {
  /** 0–1: taranan / toplam. Halka buna göre küçülür. */
  ilerleme: number;
  /** Halkadan kalkmayı bekleyen tozlar (sırayla). */
  kuyruk: Bekleyen[];
  /** Grubuna varmış fotoğraf sayısı (küreler bununla büyür). Yolda olanlar sayılmaz. */
  gelen: Record<string, number>;
  /** Şu an uçan toz sayısı. */
  ucan: number;
}

export function yeniSahne(): AyiklamaSahnesi {
  return { ilerleme: 0, kuyruk: [], gelen: {}, ucan: 0 };
}

/** Bir fotoğrafı kuyruğa ekler; arka arkaya aynı yere gidenler tek kayıtta birikir. */
export function kuyrugaEkle(s: AyiklamaSahnesi, grup: string, kaynak: string | null = null): void {
  const son = s.kuyruk[s.kuyruk.length - 1];
  if (son && son.grup === grup && son.kaynak === kaynak) son.n++;
  else s.kuyruk.push({ grup, kaynak, n: 1 });
}

/** Kuyruğun önünden en çok `enCok` fotoğraflık bir paket alır. */
export function kuyruktanAl(s: AyiklamaSahnesi, enCok: number): Bekleyen | null {
  const on = s.kuyruk[0];
  if (!on) return null;
  const n = Math.max(1, Math.min(on.n, enCok));
  on.n -= n;
  if (on.n <= 0) s.kuyruk.shift();
  return { grup: on.grup, kaynak: on.kaynak, n };
}

export function bekleyenSayisi(s: AyiklamaSahnesi): number {
  return s.kuyruk.reduce((t, b) => t + b.n, 0);
}

export interface Nokta {
  x: number;
  y: number;
}

/** Halkanın merkezi ve yarıçapı (px). */
export function halkaYeri(W: number, H: number, ilerleme: number): Nokta & { r: number } {
  return { x: W / 2, y: H * halka.merkezY, r: Math.min(W, H) * halka.yaricapOrani * (1 - ilerleme * halka.kuculme) };
}

/** i. grup küresinin merkezi: gruplar ekran enine eşit aralıkla dizilir. */
export function grupYeri(i: number, adet: number, W: number, H: number): Nokta {
  const sol = W * grupKuresi.kenar;
  const en = W - 2 * sol;
  const x = adet <= 1 ? W / 2 : sol + (en * i) / (adet - 1);
  return { x, y: H * grupKuresi.ustY };
}

/** Kürenin en büyük yarıçapı: komşu kürelere ve ekran yüksekliğine sığacak kadar. */
export function enBuyukYaricap(adet: number, W: number, H: number): number {
  const aralik = adet <= 1 ? W : (W * (1 - 2 * grupKuresi.kenar)) / (adet - 1);
  return Math.max(grupKuresi.enKucuk, Math.min(grupKuresi.enBuyuk, aralik * 0.3, H * 0.06));
}

/** Kürenin yarıçapı: içindeki fotoğraf arttıkça büyür (alan, toplamın yarısında en büyüğe ulaşır). */
export function grupYaricapi(gelen: number, toplam: number, enBuyuk: number): number {
  const oran = Math.min(1, Math.sqrt(Math.max(0, gelen) / Math.max(1, toplam * 0.5)));
  return grupKuresi.enKucuk + (enBuyuk - grupKuresi.enKucuk) * oran;
}
