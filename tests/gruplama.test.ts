import { describe, it, expect } from 'vitest';
import { yilAyGrupla, duzlestir, grupMenusu, menuAnahtari, grupAdiBul, ELENECEK_ID } from '../src/arayuz/mantik/gruplama';
import type { ArayuzMedya } from '../src/ortak/mesajlar';
import type { ElemeNedeni, Grup } from '../src/motor/tipler';

const m = (anahtar: string, tarih: Date, grupId = 'deniz', eleme: ElemeNedeni | null = null): ArayuzMedya => ({
  anahtar, yol: `C:/${anahtar}.jpg`, tur: 'foto', boyut: 1, degisme: 1, tarih: tarih.toISOString(),
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: [], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0', grupId, eleme, renk: '#000000',
});

const d = new Date(2024, 7, 12);

describe('gruplama', () => {
  it('yıl ve ayları yeniden eskiye, ay içini çekim sırasına göre dizer', () => {
    const b = yilAyGrupla([m('c', new Date(2023, 0, 5)), m('b', new Date(2024, 7, 20)), m('a', new Date(2024, 7, 3)), m('d', new Date(2024, 1, 1))]);
    expect(b.map((y) => y.yil)).toEqual([2024, 2023]);
    expect(b[0].aylar.map((a) => a.ay)).toEqual([8, 2]);
    expect(b[0].aylar[0].medya.map((x) => x.anahtar)).toEqual(['a', 'b']);
    expect(duzlestir(b).map((x) => x.anahtar)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('elenen dosya menüde Elenecekler’e düşer', () => {
    expect(menuAnahtari(m('x', d, 'deniz', 'kopya'))).toBe(ELENECEK_ID);
    expect(menuAnahtari(m('x', d, 'deniz'))).toBe('deniz');
  });

  it('menü: dolu gruplar adetle sıralı, kullanıcı grubu boşken de görünür, sonda Diğer ve Elenecekler', () => {
    const gruplar: Grup[] = [
      { id: 'deniz', ad: 'Deniz', tarifler: [] },
      { id: 'orman', ad: 'Orman', tarifler: [] },
      { id: 'sehir', ad: 'Şehir', tarifler: [] },
      { id: 'k-araba', ad: 'Araba', tarifler: [], kullanici: true },
    ];
    const liste = [m('1', d, 'orman'), m('2', d, 'deniz'), m('3', d, 'deniz'), m('4', d, 'diger'), m('5', d, 'deniz', 'kopya')];
    expect(grupMenusu(gruplar, liste)).toEqual([
      { id: 'deniz', ad: 'Deniz', adet: 2 },
      { id: 'orman', ad: 'Orman', adet: 1 },
      { id: 'k-araba', ad: 'Araba', adet: 0 },
      { id: 'diger', ad: 'Diğer', adet: 1, ozel: 'diger' },
      { id: 'elenecek', ad: 'Elenecekler', adet: 1, ozel: 'elenecek' },
    ]);
  });

  it('grup adını bulur', () => {
    const gruplar: Grup[] = [{ id: 'deniz', ad: 'Deniz / Plaj', tarifler: [] }];
    expect(grupAdiBul(gruplar, 'deniz')).toBe('Deniz / Plaj');
    expect(grupAdiBul(gruplar, 'diger')).toBe('Diğer');
    expect(grupAdiBul(gruplar, ELENECEK_ID)).toBe('Elenecekler');
    expect(grupAdiBul(gruplar, 'k-silinmis')).toBe('k-silinmis');
  });
});
