import { describe, it, expect } from 'vitest';
import { arayuzIcin } from '../src/ortak/mesajlar';
import type { IslenmisMedya } from '../src/motor/tipler';

const ornek: IslenmisMedya = {
  anahtar: 'a', yol: 'C:/a.jpg', tur: 'foto', boyut: 1, degisme: 1, tarih: '2024-01-01T00:00:00.000Z',
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: ['C:/o/a.jpg'], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0000000000000000',
  vektor: [0.1, 0.2, 0.3], grupId: 'deniz', eleme: null,
};

describe('mesajlar', () => {
  it('arayüze giden kayıt vektörü taşımaz, rengi taşır', () => {
    const a = arayuzIcin(ornek, '#112233');
    expect('vektor' in a).toBe(false);
    expect(a.renk).toBe('#112233');
    expect(a.anahtar).toBe('a');
    expect(a.grupId).toBe('deniz');
    expect(ornek.vektor).toHaveLength(3); // asıl kayıt bozulmaz
  });
});
