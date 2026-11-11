import { describe, it, expect } from 'vitest';
import { HAZIR_GRUPLAR, kullaniciGrubu, ekranGoruntusuAdiMi, puanlamaTarifleri } from '../src/motor/gruplar';

describe('gruplar', () => {
  it('hazır listede 11 grup var, id’ler benzersiz', () => {
    expect(HAZIR_GRUPLAR).toHaveLength(11);
    expect(new Set(HAZIR_GRUPLAR.map((g) => g.id)).size).toBe(11);
  });

  it('kullanıcı grubu Türkçe adı korur, ana konu odaklı İngilizce tarif üretir (yalın kelime yok)', () => {
    expect(kullaniciGrubu('Araba', 'car')).toEqual({
      id: 'k-araba',
      ad: 'Araba',
      tarifler: ['a photo of a car', 'a close-up photo of a car', 'a car as the main subject of the photo'],
      ingilizce: 'car',
      kullanici: true,
    });
  });

  it('puanlama: bağlam tarifleri ana konu insan olan sahneleri İnsanlar’a, nesneleri Diğer’e bağlar', () => {
    const p = puanlamaTarifleri(HAZIR_GRUPLAR);
    const bul = (id: string) => p.find((x) => x.grupId === id)!.tarifler;
    expect(bul('insanlar')).toContain('people sitting around a dinner table');
    expect(bul('diger')).toContain('a wedding bouquet of white flowers');
    expect(bul('yemek')).toEqual(HAZIR_GRUPLAR.find((g) => g.id === 'yemek')!.tarifler);
    expect(new Set(p.map((x) => x.grupId)).size).toBe(p.length); // her grup bir kez
  });

  it('puanlama: kullanıcı grubu için "önünde poz veren insan" tarifleri İnsanlar’a gider; eski kayıtlı grup da çevrilir', () => {
    const eski = { id: 'k-araba', ad: 'Araba', tarifler: ['a photo of a car', 'car'], kullanici: true };
    const p = puanlamaTarifleri([...HAZIR_GRUPLAR, eski]);
    expect(p.find((x) => x.grupId === 'k-araba')!.tarifler).toEqual(kullaniciGrubu('Araba', 'car').tarifler);
    expect(p.find((x) => x.grupId === 'insanlar')!.tarifler).toContain('a person posing in front of a car');
  });

  it('puanlama: İnsanlar grubu yoksa ona bağlam eklenmez, Diğer her zaman vardır', () => {
    const p = puanlamaTarifleri([{ id: 'k', ad: 'K', tarifler: ['kirmizi'] }]);
    expect(p.map((x) => x.grupId)).toEqual(['k', 'diger']);
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
