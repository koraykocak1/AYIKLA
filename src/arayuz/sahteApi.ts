import type { AyiklaApi } from '../ana/onyukle';
import type { ArayuzMedya, ArayuzOlayi, Istek } from '../ortak/mesajlar';
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

const sonArsivler: SonArsiv[] = [{ girdiler: ['C:\\Örnek\\Telefon'], tarih: new Date().toISOString(), foto: 1240, video: 86 }];

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
  aktarSec: async () => {
    const toplam = sonSonuc.length || 100;
    for (let b = 0; b <= toplam; b += Math.ceil(toplam / 40)) {
      yayinla({ tur: 'aktarim', bitti: b, toplam });
      await bekle(60);
    }
    yayinla({ tur: 'aktarim', bitti: toplam, toplam });
    return { kopyalanan: toplam, atlanan: 0, hatalar: [] };
  },
  baslangicKlasoru: async () => null,
  yolAl: (f: File) => f.name,
  olaylariDinle: (f) => {
    dinleyiciler.add(f);
    return () => dinleyiciler.delete(f);
  },
};
