import { describe, it, expect } from 'vitest';
import { HAZIR_GRUPLAR, kullaniciGrubu, ekranGoruntusuAdiMi } from '../src/motor/gruplar';

describe('gruplar', () => {
  it('hazır listede 10 grup var, id’ler benzersiz', () => {
    expect(HAZIR_GRUPLAR).toHaveLength(10);
    expect(new Set(HAZIR_GRUPLAR.map((g) => g.id)).size).toBe(10);
  });

  it('kullanıcı grubu Türkçe adı korur, İngilizce tarif üretir', () => {
    expect(kullaniciGrubu('Araba', 'car')).toEqual({
      id: 'k-araba', ad: 'Araba', tarifler: ['a photo of a car', 'car'], kullanici: true,
    });
  });

  it('Türkçe karakterli adlardan güvenli id üretir', () => {
    expect(kullaniciGrubu('Düğün Şöleni', 'wedding').id).toBe('k-dugun-soleni');
  });

  it('ekran görüntüsü dosya adlarını tanır', () => {
    expect(ekranGoruntusuAdiMi('Screenshot_20240101-101010.png')).toBe(true);
    expect(ekranGoruntusuAdiMi('Ekran Görüntüsü 2024-01-01.png')).toBe(true);
    expect(ekranGoruntusuAdiMi('IMG_1234.jpg')).toBe(false);
  });
});
