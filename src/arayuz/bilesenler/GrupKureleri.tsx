import { useRef, type RefObject } from 'react';
import { grupKuresi } from '../hareket';
import { sayi } from '../mantik/bicim';
import { enBuyukYaricap, grupYaricapi, grupYeri, type AyiklamaSahnesi, type SahneGrubu } from '../mantik/sahneDuzeni';
import { useTuvalDongusu } from './tuvalDongusu';

const ETIKET_YAZISI = '11px ui-monospace, "Cascadia Mono", Consolas, monospace';
const ETIKET_ARALIGI = 0.22; // em; karşılamadaki etiketlerle aynı

/** Fibonacci dizilişiyle birim küre üstünde eşit aralıklı noktalar. */
function kureNoktalari(n: number): [number, number, number][] {
  const altin = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * altin;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
}
const NOKTALAR = kureNoktalari(grupKuresi.noktaSayisi);

/**
 * Üstte yan yana grup küreleri (canvas 2B). Her küre grubuna varmış fotoğraf sayısıyla büyür, altında adı ve sayısı
 * yazar. Etiketler hep aynı çizgide durur; küre büyüse de yazılar kaymaz.
 */
/** Ayıklama ekranında kürenin altındaki ad: ilk sözcük, gerekirse sonu "…" ile kısaltılır. */
function kisaAd(x: CanvasRenderingContext2D, ad: string, genislik: number): string {
  const tam = ad.split(' / ')[0].split(' ')[0].toLocaleUpperCase('tr');
  let m = tam;
  while (m.length > 2 && x.measureText(m === tam ? m : m + '…').width > genislik) m = m.slice(0, -1);
  return m === tam ? m : m + '…';
}

export function GrupKureleri({ sahne, gruplar, toplam }: { sahne: RefObject<AyiklamaSahnesi>; gruplar: SahneGrubu[]; toplam: number }) {
  const yaricaplar = useRef<Record<string, number>>({});

  const tuval = useTuvalDongusu(({ x, W, H, dt, sn, azalt }) => {
    x.clearRect(0, 0, W, H);
    const enBuyuk = enBuyukYaricap(gruplar.length, W, H);
    const aci = azalt ? 0.6 : sn * grupKuresi.donusHizi;
    const yumusa = azalt ? 1 : 1 - 0.92 ** dt;
    x.font = ETIKET_YAZISI;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.letterSpacing = `${ETIKET_ARALIGI}em`;
    const bosluk = 11 * ETIKET_ARALIGI; // harf aralığı sona da eklenir: yarısı kadar sağa kaydırınca tam ortalanır

    gruplar.forEach((g, i) => {
      const { x: gx, y: gy } = grupYeri(i, gruplar.length, W, H);
      const adet = Math.max(0, sahne.current.gelen[g.id] ?? 0);
      const hedef = grupYaricapi(adet, toplam, enBuyuk);
      const r = (yaricaplar.current[g.id] ??= grupKuresi.enKucuk);
      const R = (yaricaplar.current[g.id] = r + (hedef - r) * yumusa);

      // Her küre biraz farklı açıyla döner: hepsi aynı görünmesin
      const ca = Math.cos(aci + i * 0.9);
      const sa = Math.sin(aci + i * 0.9);
      for (const [px, py, pz] of NOKTALAR) {
        const x1 = px * ca + pz * sa;
        const z1 = -px * sa + pz * ca;
        const y2 = py * 0.97 - z1 * 0.25; // hafif öne eğik
        const z2 = py * 0.25 + z1 * 0.97;
        const derin = (z2 + 1) / 2;
        x.fillStyle = g.elenecek ? `rgba(160,160,160,${0.1 + derin * 0.5})` : `rgba(250,204,21,${0.15 + derin * 0.8})`;
        x.beginPath();
        x.arc(gx + x1 * R, gy + y2 * R, 0.6 + derin * 0.5, 0, Math.PI * 2);
        x.fill();
      }

      const ay = gy + enBuyuk + 22;
      x.fillStyle = g.elenecek ? '#78716c' : '#d6d3d1';
      // Kısa ad ("Deniz / Plaj" → "DENİZ"); kürenin payına sığmazsa kısaltılır, üst üste binmez
      x.fillText(kisaAd(x, g.ad, W / gruplar.length - 12), gx + bosluk / 2, ay);
      x.fillStyle = g.elenecek ? '#a8a29e' : '#facc15';
      x.fillText(sayi(adet), gx + bosluk / 2, ay + 17);
    });
  });

  return <canvas ref={tuval} className="ayiklama-tuval" aria-hidden="true" />;
}
