import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { adresCoz, onizlemeYolu, baslangicKlasoru } from '../src/ana/yollar';

const ad40 = 'a'.repeat(40);

describe('yollar', () => {
  it('küçük resim adresini çözer', () => {
    expect(adresCoz(`ayikla://onizleme/${ad40}.jpg`)).toEqual({ tur: 'onizleme', ad: `${ad40}.jpg` });
    expect(adresCoz(`ayikla://onizleme/${ad40}-2.jpg`)).toEqual({ tur: 'onizleme', ad: `${ad40}-2.jpg` });
  });

  it('klasör dışına çıkmaya çalışan adresleri reddeder', () => {
    expect(adresCoz('ayikla://onizleme/..%5C..%5Cwindows%5Cwin.ini')).toBeNull();
    expect(adresCoz('ayikla://onizleme/../kayit.json')).toBeNull();
    expect(onizlemeYolu('C:/k', '../x.jpg')).toBeNull();
  });

  it('orijinal dosya adresindeki yolu aynen geri verir', () => {
    const yol = 'C:\\Users\\x\\Düğün Ğ\\a b.jpg';
    expect(adresCoz('ayikla://dosya/' + encodeURIComponent(yol))).toEqual({ tur: 'dosya', yol });
  });

  it('başka şemaları reddeder', () => {
    expect(adresCoz('https://ornek.com/a.jpg')).toBeNull();
    expect(adresCoz('bozuk adres')).toBeNull();
  });

  it('küçük resim yolunu çalışma klasöründe kurar', () => {
    expect(onizlemeYolu('C:/k', `${ad40}-1.jpg`)).toBe(join('C:/k', `${ad40}-1.jpg`));
  });

  it('komut satırındaki (kısayola bırakılan) klasörü bulur, uygulama klasörünü atlar', () => {
    const varMi = (y: string) => y === 'D:\\Fotolar';
    expect(baslangicKlasoru(['electron.exe', 'C:\\AYIKLA', 'D:\\Fotolar'], 'C:\\AYIKLA', varMi)).toBe('D:\\Fotolar');
    expect(baslangicKlasoru(['electron.exe', 'C:\\AYIKLA'], 'C:\\AYIKLA', () => true)).toBeNull();
    expect(baslangicKlasoru(['electron.exe', '.', '--inspect'], process.cwd(), () => true)).toBeNull();
  });
});
