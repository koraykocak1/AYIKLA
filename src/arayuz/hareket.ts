/**
 * Hareket değerleri tek yerde: süreler (sn), eğriler ve yaylar. Bileşenler sayı yazmaz, buradan alır.
 * Kural: yalnızca transform ve opacity (gerekirse filter) canlandırılır.
 */
export const sure = {
  anlik: 0.08,
  hizli: 0.18,
  normal: 0.35,
  yavas: 0.6,
  sinematik: 0.9,
} as const;

export const egri = {
  yumusak: [0.22, 1, 0.36, 1] as [number, number, number, number],
  keskin: [0.4, 0, 0.2, 1] as [number, number, number, number],
  cikis: [0.4, 0, 1, 1] as [number, number, number, number],
};

export const yay = {
  canli: { type: 'spring', stiffness: 300, damping: 30 },
  yumusak: { type: 'spring', stiffness: 120, damping: 16 },
  zipla: { type: 'spring', stiffness: 420, damping: 14 },
  sayac: { stiffness: 90, damping: 20, restDelta: 0.5 },
} as const;

/** Kor kıvılcımlı arka plan (tüm ekranların altında). */
export const kor = {
  sayi: 200, // aynı anda ekrandaki kıvılcım
  itmeYaricapi: 120, // fare bu kadar yaklaşınca kıvılcım kenara kayar (px)
  itmeGucu: 0.06,
  esintiOlasiligi: 0.004, // her karede ara sıra yana savuran esinti
} as const;

/** Karşılamadaki büyük sarı noktalı küre. */
export const kure = {
  noktaSayisi: 1800,
  yaricapOrani: 0.45, // yarıçap = ekranın kısa kenarı × bu oran (alt/üst şeritlere nefes payı)
  donusHizi: 0.05, // saniyede dönüş (radyan)
  egim: 0.35, // küre hafif öne eğik durur (radyan)
  itmeYaricapi: 140, // fare bu kadar yaklaşınca nokta itilir (px)
  itmeGucu: 0.02, // yavaş fare hareketindeki itme
  hizEtkisi: 0.035, // fare hızlandıkça itme bu oranla artar
  donusYayi: 0.0022, // dağılan noktayı yerine çeken yay
  surtunme: 0.975, // her karede kalan hız (uzay boşluğu hissi: ağır yavaşlar)
  buyumeMesafesi: 80, // bu kadar uzaklaşan nokta en büyük ve krem rengine dönmüş olur (px)
} as const;

/*
 * Ayıklama ekranı. Fizik değerleri 60 kare/sn'lik bir kareye göredir; bileşenler gerçek geçen süreyle ölçekler.
 * Yerleşim oranları ekran yüksekliğine göredir (0 üst, 1 alt).
 */

/**
 * Ayıklamada karşılamanın büyük noktalı küresi kalır: ortadan küçülüp aşağıdaki yerine iner,
 * tozlar oradan kopar. (Eski sarı halka sürümü "ayiklama-halka" etiketiyle kayıtlı.)
 */
export const halka = {
  merkezY: 0.7,
  yaricapOrani: 0.165, // son yarıçap = ekranın kısa kenarı × bu oran
  kuculme: 0.2, // ayıklama bittikçe küre bu oranda daha küçülür
  inis: 1.8, // büyük kürenin küçülüp yerine inme süresi (sn); tozlar bundan sonra başlar
} as const;

/** Halkadan kopup grubuna süzülen yıldız tozu (her biri bir ya da birkaç fotoğraf). */
export const toz = {
  yolculuk: 4.5, // halkadan gruba varış süresi (sn)
  enFazla: 70, // aynı anda uçan toz; akış hızlıysa bir toz birkaç fotoğraf taşır (sayılar yine doğru)
  paketBolen: 25, // bekleyen sayısı / bu = bir tozun taşıdığı en çok fotoğraf
  aralik: 0.05, // iki toz arasındaki en kısa süre (sn)
  zerre: 9, // bir bulutta zerrecik
  sarmal: 0.12, // sarmalın genişliği (ekran enine oran)
} as const;

/** Üstte yan yana grup küreleri. */
export const grupKuresi = {
  ustY: 0.17,
  kenar: 0.1, // en soldaki ve en sağdaki kürenin kenara uzaklığı (ekran enine oran)
  enKucuk: 6, // boş kürenin yarıçapı (px)
  enBuyuk: 44,
  noktaSayisi: 90,
  donusHizi: 0.24, // saniyede (radyan)
} as const;

/** Gruplar ile halka arasındaki zerrecikli "AYIKLA" yazısı (C tarzı: çok kalın, seyrek iri zerrecik, füme). */
export const ayiklaYazisi = {
  merkezY: 0.385,
  boyOrani: 0.095, // yazı boyu = ekranın kısa kenarı × bu oran
  harfAraligi: 0.22, // karşılamadaki geniş aralıkla uyumlu (yazı boyuna oran)
  aralikOrani: 0.065, // zerrecikler arası (yazı boyuna oran)
  zerreOrani: 0.046, // zerrecik boyu (yazı boyuna oran)
  belirme: 0.9, // bütün yazının birden belirme süresi (sn)
  gecikme: 1.2, // küre aşağı inerken bekler (sn)
  yansima: 0.18, // ayna yansımasının parlaklığı
  itmeYaricapi: 90, // fare zerrecikleri dağıtır, yavaşça geri toplanırlar
  itmeGucu: 1.2,
  hizEtkisi: 0.25,
  surukleme: 0,
  donusYayi: 0.06,
  surtunme: 0.8,
} as const;

/** Sonuç ekranındaki kartlar: ızgara ⇄ küre uçuşu, kaydırma ve küre gösterisi. */
export const kartSahnesi = {
  sertlik: 120, // kart yayı (sertlik); her kart ±%15 farklı
  sonum: 0.78, // 1 = sekmeden durur, küçüldükçe hafif sekme
  siraAraligi: 0.012, // kartlar arası kalkış gecikmesi (sn)
  kaydirmaYumusakligi: 0.18, // tekerlekte kaydırmanın hedefe yaklaşma payı (her karede)
  kureEnFazla: 300, // kürede gösterilen en çok kart (ızgarada hepsi durur)
  kureYaricapi: 0.33, // sahnenin kısa kenarına oran
  kureKartOlcegi: 0.3,
  kureDonusu: 0.12, // kendiliğinden dönüş (radyan / sn)
  kureSurtunme: 0.95, // sürükleyip bırakınca dönüş hızının her karede kalan payı
  surukleme: 0.006, // sürüklenen piksel başına dönüş (radyan)
  tekerlek: 0.0004, // kürede fare tekerleğinin bir adımının verdiği dönüş hızı
  egim: 0.9, // fare en üstten en alta giderken toplam eğim (radyan)
} as const;

/** Sıralı giriş gecikmesi: ilk birkaç öğe sırayla gelir, gerisi beklemez (binlerce öğede gecikme birikmesin). */
export function siraliGecikme(i: number, adim = 0.03, ust = 24): number {
  return Math.min(i, ust) * adim;
}

/**
 * Hareket azaltılsın mı? Şimdilik hep hayır. Kullanıcı kararı (2026-11-12): Windows'ta "Animasyon efektleri"
 * kapalı bir bilgisayarda program tamamen durağan görünüyordu; animasyonlar programın parçası sayılır,
 * sistem ayarına bakılmaz. İleride programın kendi ayarı gelirse yalnız burası değişir.
 */
export function hareketiAzalt(): boolean {
  return false;
}
