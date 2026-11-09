import type { AyiklaApi } from '../ana/onyukle';
import type { ArsivGorunumu, ArsivIslemi, ArsivOgesi, ArsivSorgusu, YedekDurumu } from '../ortak/mesajlar';
import type { ArayuzMedya, ArayuzOlayi, ArsivDurumuCevabi, Istek, ModelDurumuCevabi } from '../ortak/mesajlar';
import type { Grup, SonArsiv } from '../motor/tipler';

/**
 * Yalnızca geliştirmede: arayüz Electron dışında, tarayıcıda açıldığında motorun yerine geçer.
 * Böylece tasarım yan panelde canlı görülebilir. Hiçbir gerçek dosyaya dokunmaz; programa paketlenmez.
 */
const gruplar: Grup[] = [
  { id: 'insanlar', ad: 'İnsanlar', tarifler: [] },
  { id: 'hayvanlar', ad: 'Hayvanlar', tarifler: [] },
  { id: 'yemek', ad: 'Yemek', tarifler: [] },
  { id: 'doga', ad: 'Doğa', tarifler: [] },
];

// Adres '?temiz' ile açılırsa program ilk kez açılmış gibi davranır: geçmiş yok, arşiv yok, model onayı sorulur
const TEMIZ = location.search.includes('temiz');
const sonArsivler: SonArsiv[] = TEMIZ ? [] : [{ girdiler: ['C:\\Örnek\\Telefon'], tarih: new Date().toISOString(), foto: 1240, video: 86 }];

// Adres "?ilk" ile açılırsa modeller inmemiş sayılır: onay adımı denenir
let sahteIzin = false;
function sahteModelDurumu(): ModelDurumuCevabi {
  if (!(TEMIZ || location.search.includes('ilk')) || sahteIzin) return { indirmeGerekli: false, paketler: [], toplamMB: 0 };
  return {
    indirmeGerekli: true,
    toplamMB: 1050,
    paketler: [
      { id: 'Xenova/clip-vit-base-patch32', ad: 'CLIP ViT-B/32 (OpenAI)', gorev: 'Fotoğrafları sahneye göre tanır', boyutMB: 610, kaynak: 'https://huggingface.co/Xenova/clip-vit-base-patch32', kodLisansi: 'MIT', agirlikLisansi: 'MIT' },
      { id: 'Xenova/opus-mt-tr-en', ad: 'OPUS-MT Türkçe → İngilizce (Helsinki-NLP)', gorev: 'Kendi eklediğin grup adlarını çevirir', boyutMB: 440, kaynak: 'https://huggingface.co/Xenova/opus-mt-tr-en', kodLisansi: 'MIT', agirlikLisansi: 'CC-BY 4.0 (atıf gerekir)' },
    ],
  };
}

// Adres "?arsivyok" ile açılırsa bilinen arşiv yok sayılır: "Arşivin nerede dursun?" kutusu denenir
let sahteArsiv: ArsivDurumuCevabi = TEMIZ || location.search.includes('arsivyok')
  ? { kok: null, ad: null }
  : { kok: 'E:\\AYIKLA Arşiv', ad: 'AYIKLA Arşiv' };

// Sahte arşiv (Arşivim, Kutu, Yedek). "?kilit" ile açılırsa arşiv ilk açılışta düzgün kapatılmamış sayılır.
let sahteKilit = location.search.includes('kilit');
let alimDurdur = false;
let sahteAlbumId = 3;
const sahteAlbumler = [
  { id: 1, ad: 'Tatil 2024', ogeler: new Set<number>() },
  { id: 2, ad: 'Aile', ogeler: new Set<number>() },
];
const sahteEtiketler = new Map<string, Set<number>>([
  ['Yer > Deniz', new Set()],
  ['Araçlar > Otomobil', new Set()],
]);
const sahteOgeler: (ArsivOgesi & { silinme: number | null })[] = Array.from({ length: 140 }, (_, i) => ({
  id: i + 1,
  ad: `IMG_${String(400 + i).padStart(4, '0')}.jpg`,
  tur: i % 17 === 0 ? 'video' : 'foto',
  tarih: new Date(2024 - (i % 3 === 0 ? 1 : 0), 11 - ((i * 5) % 12), 1 + (i % 27)).toISOString(),
  kaliciSilinme: null,
  silinme: i % 31 === 5 ? Date.now() - (i % 20) * 86_400_000 : null,
}));
sahteOgeler.slice(0, 38).forEach((o) => sahteAlbumler[0].ogeler.add(o.id));
sahteOgeler.slice(50, 70).forEach((o) => sahteAlbumler[1].ogeler.add(o.id));
sahteOgeler.slice(0, 20).forEach((o) => sahteEtiketler.get('Yer > Deniz')!.add(o.id));
let sahteYedek: YedekDurumu = {
  yedek: { yol: 'F:\\AYIKLA yedeği', zaman: new Date(2026, 10, 2).toISOString(), dogrulandi: true },
  saglik: { zaman: new Date(2026, 10, 2).toISOString(), denetlenen: 1326, saglam: 1326, sorun: 0 },
};

function sahteGorunum(s: ArsivSorgusu): ArsivGorunumu {
  if (!sahteArsiv.kok) throw new Error('Henüz arşiv yok. Sonuç ekranında “Arşive al” ile başla.');
  if (sahteKilit) throw new Error('bayat-kilit:Bu arşiv son kullanımda düzgün kapatılmamış.');
  const canli = sahteOgeler.filter((o) => o.silinme === null);
  const kutu = sahteOgeler.filter((o) => o.silinme !== null);
  let l = s.kutu ? kutu : canli;
  if (s.albumId) l = l.filter((o) => sahteAlbumler.find((a) => a.id === s.albumId)?.ogeler.has(o.id));
  if (s.etiket) l = l.filter((o) => [...sahteEtiketler].some(([y, k]) => (y === s.etiket || y.startsWith(s.etiket + ' > ')) && k.has(o.id)));
  for (const p of (s.metin ?? '').toLocaleLowerCase('tr').split(/\s+/).filter(Boolean)) {
    l = l.filter((o) => (/^\d{4}$/.test(p) ? o.tarih?.startsWith(p) : o.ad.toLocaleLowerCase('tr').includes(p)));
  }
  const etiketler = [...new Set([...sahteEtiketler.keys()].flatMap((y) => y.split(' > ').map((_, i, p) => p.slice(0, i + 1).join(' > '))))].sort();
  return {
    ad: 'AYIKLA Arşiv',
    albumler: sahteAlbumler.map((a) => ({ id: a.id, ad: a.ad, adet: canli.filter((o) => a.ogeler.has(o.id)).length })),
    etiketler,
    kutuAdet: kutu.length,
    ogeler: l.map(({ silinme, ...o }) => ({ ...o, kaliciSilinme: silinme === null ? null : new Date(silinme + 30 * 86_400_000).toISOString() })),
  };
}

function sahteIslem(i: ArsivIslemi): unknown {
  const bul = (idler: number[]) => sahteOgeler.filter((o) => idler.includes(o.id));
  switch (i.islem) {
    case 'albumOlustur':
      sahteAlbumler.push({ id: sahteAlbumId, ad: i.ad, ogeler: new Set() });
      return sahteAlbumId++;
    case 'albumeEkle':
      i.idler.forEach((id) => sahteAlbumler.find((a) => a.id === i.albumId)?.ogeler.add(id));
      return i.idler.length;
    case 'albumdenKaldir':
      i.idler.forEach((id) => sahteAlbumler.find((a) => a.id === i.albumId)?.ogeler.delete(id));
      return i.idler.length;
    case 'etiketle': {
      const yol = i.yol.replaceAll('›', '>').split('>').map((p) => p.trim()).filter(Boolean).join(' > ');
      if (!sahteEtiketler.has(yol)) sahteEtiketler.set(yol, new Set());
      i.idler.forEach((id) => sahteEtiketler.get(yol)!.add(id));
      return i.idler.length;
    }
    case 'kutuyaTasi':
      bul(i.idler).forEach((o) => (o.silinme = Date.now()));
      return i.idler.length;
    case 'kutudanGeriAl':
      bul(i.idler).forEach((o) => (o.silinme = null));
      return i.idler;
    case 'kaliciSil':
      for (const o of bul(i.idler)) sahteOgeler.splice(sahteOgeler.indexOf(o), 1);
      return { silinenOge: i.idler.length, silinenDosya: i.idler.length, korunanDosya: 0, hatalar: [] };
  }
}

async function sahteIs(ad: 'yedek' | 'denetim', toplam: number) {
  for (let b = 0; b <= toplam; b += Math.ceil(toplam / 40)) {
    yayinla({ tur: 'arsivIs', ad, bitti: b, toplam });
    await bekle(50);
  }
  yayinla({ tur: 'arsivIs', ad, bitti: toplam, toplam });
}

// Sahte ayıklama: motorun olaylarını uydurma dosyalarla, gerçeğe yakın bir hızda yayınlar
const dinleyiciler = new Set<(o: ArayuzOlayi) => void>();
const yayinla = (o: ArayuzOlayi) => dinleyiciler.forEach((f) => f(o));
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
let durdurIstegi = false;
let sonSonuc: ArayuzMedya[] = []; // son ayıklamanın sonucu: taşı / geri al bunun üstünde çalışır
const RENKLER = ['#3b2a1a', '#2b3a2a', '#1f2f3f', '#4a3424', '#2e2e38', '#3d2f2f', '#24382f', '#45401f'];

function sahteMedya(i: number): ArayuzMedya {
  const r = Math.random();
  const grupId = r < 0.38 ? 'insanlar' : r < 0.5 ? 'hayvanlar' : r < 0.62 ? 'yemek' : r < 0.82 ? 'doga' : 'diger';
  const eleme = Math.random() < 0.1 ? (i % 2 ? 'bulanik' : 'karanlik') : null;
  return {
    anahtar: `sahte-${i}`,
    yol: `C:\\Örnek\\Telefon\\IMG_${1000 + i}.jpg`,
    tur: i % 23 === 0 ? 'video' : 'foto',
    boyut: 2_000_000,
    degisme: Date.now(),
    tarih: new Date(2023 + (i % 3 === 0 ? 0 : 1), (i * 7) % 12, 1 + (i % 27), 8 + (i % 14), (i * 13) % 60).toISOString(),
    tarihKaynagi: 'exif',
    tahmini: false,
    onizlemeler: [`C:\\Örnek\\onizleme\\${i}.jpg`], // yok: sonuç ekranında boş kare görünür
    genislik: 4000,
    yukseklik: 3000,
    kalite: { netlik: 100, parlaklik: 120, bulanik: eleme === 'bulanik', karanlik: eleme === 'karanlik' },
    parmakizi: '0000000000000000',
    grupId,
    eleme,
    renk: RENKLER[i % RENKLER.length],
  };
}

async function sahteAyiklama(): Promise<{ adet: number; durduruldu: boolean }> {
  durdurIstegi = false;
  yayinla({ tur: 'model', durum: 'yukleniyor' });
  await bekle(900);
  yayinla({ tur: 'model', durum: 'hazir', cihaz: 'dml' });
  const toplam = 1326;
  yayinla({ tur: 'basladi', toplam, onizlemeler: [] });
  const sonuc: ArayuzMedya[] = [];
  for (let i = 1; i <= toplam; i++) {
    if (durdurIstegi) {
      yayinla({ tur: 'bitti', sonuc, durduruldu: true });
      return { adet: sonuc.length, durduruldu: true };
    }
    const m = sahteMedya(i);
    sonuc.push(m);
    yayinla({ tur: 'dosya', medya: m, sira: i, toplam });
    // Ara sıra daha önce gruplanmış bir fotoğrafın kopyası çıkar
    if (i % 150 === 0) {
      const k = sonuc.find((s) => !s.eleme && Math.random() < 0.05);
      if (k) {
        k.eleme = 'kopya';
        yayinla({ tur: 'kopyalar', anahtarlar: [k.anahtar] });
      }
    }
    // Adres "?hizli" ile açılırsa ayıklama bir iki saniyede biter (sonuç ekranını denemek için)
    if (!location.search.includes('hizli') || i % 100 === 0) await bekle(location.search.includes('hizli') ? 0 : 25);
  }
  sonSonuc = sonuc;
  yayinla({ tur: 'bitti', sonuc, durduruldu: false });
  return { adet: sonuc.length, durduruldu: false };
}

export const sahteApi: AyiklaApi = {
  istek: async (i: Istek) => {
    switch (i.tur) {
      case 'gruplar':
        return gruplar;
      case 'sonArsivler':
        return sonArsivler;
      case 'modelDurumu':
        return sahteModelDurumu();
      case 'modelIzniVer':
        sahteIzin = true;
        return sahteModelDurumu();
      case 'katalogDurumu':
        // Adres '?bozuk' ile açılırsa kayıt dosyası bozuk çıkmış sayılır
        return { kurtarilan: location.search.includes('bozuk') ? 'C:/Users/Örnek/.ayikla/katalog.db.bozuk-2026-11-04T09-12-30-000Z' : null };
      case 'arsivDurumu':
        return sahteArsiv;
      case 'arsivAlimDurdur':
        alimDurdur = true;
        return true;
      case 'arsivGoster':
        return sahteGorunum(i.sorgu);
      case 'arsivIslem':
        return sahteIslem(i.islem);
      case 'bayatKilidiKaldir':
        sahteKilit = false;
        return true;
      case 'yedekDurumu':
        return sahteYedek;
      case 'arsivDenetle': {
        const n = sahteOgeler.length;
        await sahteIs('denetim', n);
        sahteYedek = { ...sahteYedek, saglik: { zaman: new Date().toISOString(), denetlenen: n, saglam: n, sorun: 0 } };
        return sahteYedek;
      }
      case 'say':
        return { foto: 1240, video: 86, ham: 0 };
      case 'baslat':
        return sahteAyiklama();
      case 'durdur':
        durdurIstegi = true;
        return null;
      case 'grupTasi':
      case 'geriAl': {
        const i0 = sonSonuc.findIndex((m) => m.anahtar === i.anahtar);
        if (i0 < 0) throw new Error('Dosya bulunamadı');
        const m = sonSonuc[i0];
        const yeni: ArayuzMedya =
          i.tur === 'grupTasi' ? { ...m, grupId: i.grupId, elleGrup: i.grupId, eleme: null } : { ...m, eleme: null, geriAlindi: true };
        sonSonuc[i0] = yeni;
        return yeni;
      }
      case 'grupEkle': {
        await bekle(1200);
        const grup: Grup = { id: `k-${Date.now()}`, ad: i.ad, tarifler: [], kullanici: true };
        gruplar.push(grup);
        sonSonuc = sonSonuc.map((m, n) => (!m.eleme && n % 9 === 0 ? { ...m, grupId: grup.id } : m));
        return { grup, sonuc: sonSonuc };
      }
      default:
        return null;
    }
  },
  klasorSec: async () => 'C:\\Örnek\\Telefon',
  // Kaydetme: hedef klasör "seçilmiş" sayılır, ilerleme olaylarıyla birkaç saniyede biter
  aktarSec: async (anahtarlar?: string[]) => {
    const toplam = anahtarlar?.length ?? (sonSonuc.length || 100);
    for (let b = 0; b <= toplam; b += Math.ceil(toplam / 40)) {
      yayinla({ tur: 'aktarim', bitti: b, toplam });
      await bekle(60);
    }
    yayinla({ tur: 'aktarim', bitti: toplam, toplam });
    return { kopyalanan: toplam, atlanan: 0, hatalar: [] };
  },
  arsivSec: async () => 'E:\\AYIKLA Arşiv',
  // Arşive alma: her 20 dosyadan biri "zaten arşivde" sayılır
  arsiveAl: async (kok: string, anahtarlar?: string[]) => {
    const toplam = anahtarlar?.length ?? (sonSonuc.filter((m) => !m.eleme).length || 100);
    const zatenOlan = (b: number) => Math.floor(b / 20);
    alimDurdur = false;
    let b = 0;
    for (; b < toplam && !alimDurdur; b += Math.ceil(toplam / 60)) {
      yayinla({ tur: 'arsivAlim', bitti: b, toplam, zaten: zatenOlan(b) });
      await bekle(70);
    }
    b = Math.min(b, toplam);
    yayinla({ tur: 'arsivAlim', bitti: b, toplam, zaten: zatenOlan(b) });
    sahteArsiv = { kok, ad: 'AYIKLA Arşiv' };
    return { kok, ad: 'AYIKLA Arşiv', yeni: b - zatenOlan(b), zaten: zatenOlan(b), hata: 0, durduruldu: alimDurdur };
  },
  yedekSec: async () => {
    await sahteIs('yedek', sahteOgeler.length);
    sahteYedek = { ...sahteYedek, yedek: { yol: 'F:\\AYIKLA yedeği', zaman: new Date().toISOString(), dogrulandi: true } };
    return sahteYedek;
  },
  geriYukleSec: async () => ({ kok: 'G:\\AYIKLA Arşiv', ad: 'AYIKLA Arşiv' }),
  baslangicKlasoru: async () => null,
  yolAl: (f: File) => f.name,
  olaylariDinle: (f) => {
    dinleyiciler.add(f);
    return () => dinleyiciler.delete(f);
  },
};
