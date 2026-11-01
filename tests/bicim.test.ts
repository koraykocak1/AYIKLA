import { describe, it, expect } from 'vitest';
import { sayi, bulunduMetni, sureMetni, ayAdi, sonParca, onizlemeAdresi, dosyaAdresi, hataMetni, elemeAdi, tarihMetni } from '../src/arayuz/mantik/bicim';

describe('bicim', () => {
  it('sayıları Türkçe biçimler', () => {
    expect(sayi(1240)).toBe('1.240');
    expect(sayi(7)).toBe('7');
  });

  it('bulunan dosya metni', () => {
    expect(bulunduMetni({ foto: 1240, video: 86 })).toBe('1.240 fotoğraf · 86 video bulundu');
    expect(bulunduMetni({ foto: 3, video: 0 })).toBe('3 fotoğraf bulundu');
    expect(bulunduMetni({ foto: 0, video: 2 })).toBe('2 video bulundu');
    expect(bulunduMetni({ foto: 0, video: 0 })).toBe('Desteklenen fotoğraf veya video bulunamadı');
  });

  it('kalan süre metni', () => {
    expect(sureMetni(null)).toBe('—');
    expect(sureMetni(0.2)).toBe('1 sn');
    expect(sureMetni(42)).toBe('42 sn');
    expect(sureMetni(150)).toBe('3 dk');
    expect(sureMetni(3 * 3600 + 600)).toBe('3 sa 10 dk');
  });

  it('ay adları, tarih ve eleme nedenleri', () => {
    expect(ayAdi(8)).toBe('Ağustos');
    expect(tarihMetni(new Date(2026, 10, 1).toISOString())).toBe('1 Kasım 2026');
    expect(elemeAdi('kopya')).toBe('Kopya');
    expect(elemeAdi('bulanik')).toBe('Bulanık');
    expect(elemeAdi('karanlik')).toBe('Karanlık');
  });

  it('yolun son parçası', () => {
    expect(sonParca('C:\\a\\b\\Foto.jpg')).toBe('Foto.jpg');
    expect(sonParca('D:\\Fotolar\\')).toBe('Fotolar');
    expect(sonParca('/home/x/y.png')).toBe('y.png');
  });

  it('ayikla:// adresleri', () => {
    expect(onizlemeAdresi('C:\\Users\\x\\.ayikla\\onizleme\\abc.jpg')).toBe('ayikla://onizleme/abc.jpg');
    const yol = 'C:\\a b\\ç.jpg';
    expect(dosyaAdresi(yol)).toBe('ayikla://dosya/' + encodeURIComponent(yol));
  });

  it('Electron hata önekini temizler', () => {
    expect(hataMetni(new Error("Error invoking remote method 'istek': Error: Model yok"))).toBe('Model yok');
    expect(hataMetni('düz metin')).toBe('düz metin');
  });
});
