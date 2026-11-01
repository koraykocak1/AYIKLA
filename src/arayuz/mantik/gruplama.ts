import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

export const ELENECEK_ID = 'elenecek';

export function menuAnahtari(m: Pick<ArayuzMedya, 'eleme' | 'grupId'>): string {
  return m.eleme ? ELENECEK_ID : m.grupId;
}

export interface MenuOgesi {
  id: string;
  ad: string;
  adet: number;
  ozel?: 'diger' | 'elenecek';
}

/** Sol menü: dolu gruplar (çoktan aza), kullanıcı grupları (boş olsa da), sonra Diğer ve Elenecekler. */
export function grupMenusu(gruplar: Grup[], medya: ArayuzMedya[]): MenuOgesi[] {
  const say = new Map<string, number>();
  for (const m of medya) {
    const a = menuAnahtari(m);
    say.set(a, (say.get(a) ?? 0) + 1);
  }
  const normal = gruplar
    .map((g) => ({ id: g.id, ad: g.ad, adet: say.get(g.id) ?? 0, kullanici: g.kullanici }))
    .filter((g) => g.adet > 0 || g.kullanici)
    .sort((a, b) => b.adet - a.adet)
    .map(({ id, ad, adet }) => ({ id, ad, adet }));
  return [
    ...normal,
    { id: DIGER_ID, ad: 'Diğer', adet: say.get(DIGER_ID) ?? 0, ozel: 'diger' },
    { id: ELENECEK_ID, ad: 'Elenecekler', adet: say.get(ELENECEK_ID) ?? 0, ozel: 'elenecek' },
  ];
}

export function grupAdiBul(gruplar: Grup[], id: string): string {
  if (id === DIGER_ID) return 'Diğer';
  if (id === ELENECEK_ID) return 'Elenecekler';
  return gruplar.find((g) => g.id === id)?.ad ?? id;
}

export interface AyBolumu {
  ay: number;
  medya: ArayuzMedya[];
}
export interface YilBolumu {
  yil: number;
  aylar: AyBolumu[];
}

/** Yıl › Ay bölümleri: en yeni yıl ve ay başta; ay içinde çekim sırasına göre. */
export function yilAyGrupla(liste: ArayuzMedya[]): YilBolumu[] {
  const yillar = new Map<number, Map<number, ArayuzMedya[]>>();
  for (const m of liste) {
    const t = new Date(m.tarih);
    const y = t.getFullYear();
    const a = t.getMonth() + 1;
    if (!yillar.has(y)) yillar.set(y, new Map());
    const aylar = yillar.get(y)!;
    if (!aylar.has(a)) aylar.set(a, []);
    aylar.get(a)!.push(m);
  }
  return [...yillar]
    .sort((p, q) => q[0] - p[0])
    .map(([yil, aylar]) => ({
      yil,
      aylar: [...aylar]
        .sort((p, q) => q[0] - p[0])
        .map(([ay, medya]) => ({ ay, medya: [...medya].sort((p, q) => p.tarih.localeCompare(q.tarih)) })),
    }));
}

/** Izgarada görünen sıra (büyük görünümde ok tuşları bu sırayla gezer). */
export function duzlestir(b: YilBolumu[]): ArayuzMedya[] {
  return b.flatMap((y) => y.aylar.flatMap((a) => a.medya));
}
