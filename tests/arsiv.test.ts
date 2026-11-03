import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import {
  ARSIV_DIZINLERI,
  ARSIV_KATALOGU,
  Arsiv,
  KILIT_ADI,
  KILIT_ESKIME_MS,
  arsivBul,
  arsivKimligiOku,
  arsivOlustur,
  kilitAl,
  kilitDurumu,
} from '../src/motor/arsiv';
import { ARSIV_ISARETI } from '../src/motor/disari-aktar';
import { tara } from '../src/motor/tarayici';
import { geciciKlasor } from './yardimci';

const kod = (kod: string) => expect.objectContaining({ kod });

/** Arşivi ayrı bir Node sürecinde açar; süreç "HAZIR" ya da "HATA <kod>" yazınca döner. */
function cocukAc(kok: string): Promise<{ cocuk: ChildProcess; satir: string }> {
  const cocuk = spawn(process.execPath, ['--import', 'tsx', join(__dirname, 'kilit-cocuk.ts'), kok], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  return new Promise((coz, reddet) => {
    let tampon = '';
    cocuk.stdout!.on('data', (p: Buffer) => {
      tampon += p.toString();
      if (tampon.includes('\n')) coz({ cocuk, satir: tampon.trim() });
    });
    cocuk.on('error', reddet);
  });
}

function bitti(c: ChildProcess): Promise<void> {
  return new Promise((coz) => (c.exitCode !== null || c.signalCode !== null ? coz() : c.on('exit', () => coz())));
}

describe('arşiv kökü', () => {
  it('boş klasörü arşiv yapar: kimlik ve dizin yapısı', async () => {
    const kok = join(await geciciKlasor(), 'Arşivim');
    const k = await arsivOlustur(kok);
    expect(k.kimlik).toMatch(/^[0-9a-f-]{36}$/);
    expect(k.ad).toBe('Arşivim');
    for (const d of ARSIV_DIZINLERI) expect(existsSync(join(kok, d))).toBe(true);
    expect((await arsivKimligiOku(kok)).kimlik).toBe(k.kimlik);

    const a = await Arsiv.ac(kok);
    expect(existsSync(join(kok, ARSIV_KATALOGU))).toBe(true);
    expect(existsSync(join(kok, KILIT_ADI))).toBe(true);
    await a.kapat();
    expect(existsSync(join(kok, KILIT_ADI))).toBe(false);
  });

  it('dolu klasörü, var olan arşivi ve kaynağın içini reddeder', async () => {
    const t = await geciciKlasor();
    await mkdir(join(t, 'dolu'));
    await writeFile(join(t, 'dolu', 'tatil.jpg'), 'x');
    await expect(arsivOlustur(join(t, 'dolu'))).rejects.toEqual(kod('bos-degil'));
    expect(await readdir(join(t, 'dolu'))).toEqual(['tatil.jpg']); // hiçbir şey yazılmadı

    await arsivOlustur(join(t, 'a'));
    await expect(arsivOlustur(join(t, 'a'))).rejects.toEqual(kod('zaten-arsiv'));

    await mkdir(join(t, 'Fotolar'));
    await expect(arsivOlustur(join(t, 'Fotolar', 'Arsiv'), { kaynaklar: [join(t, 'Fotolar')] })).rejects.toEqual(
      kod('kaynak-icinde'),
    );
    await expect(arsivOlustur('\\\\sunucu\\paylasim\\arsiv')).rejects.toEqual(kod('ag-yolu'));
  });

  it('arşiv olmayan ya da daha yeni sürümün arşivini açmaz', async () => {
    const t = await geciciKlasor();
    await expect(Arsiv.ac(t)).rejects.toEqual(kod('arsiv-degil'));
    // Parti 1'in dışa aktarma işareti (kimliksiz) arşiv sayılmaz
    await writeFile(join(t, ARSIV_ISARETI), JSON.stringify({ uygulama: 'AYIKLA', surum: 1 }));
    await expect(Arsiv.ac(t)).rejects.toEqual(kod('arsiv-degil'));

    const yeni = join(t, 'yeni');
    await arsivOlustur(yeni);
    const v = JSON.parse(await readFile(join(yeni, ARSIV_ISARETI), 'utf8'));
    await writeFile(join(yeni, ARSIV_ISARETI), JSON.stringify({ ...v, surum: 99 }));
    await expect(Arsiv.ac(yeni)).rejects.toEqual(kod('yeni-surum'));
  });

  it('tarayıcı arşiv kökünü kaynak diye taramaz', async () => {
    const t = await geciciKlasor();
    await arsivOlustur(join(t, 'Arsiv'));
    await mkdir(join(t, 'Arsiv', 'medya', 'ab'), { recursive: true });
    await writeFile(join(t, 'Arsiv', 'medya', 'ab', 'abc.jpg'), 'x');
    await writeFile(join(t, 'kaynak.jpg'), 'x');
    const bulunan = (await tara([t])).map((d) => d.yol);
    expect(bulunan.some((y) => y.includes('Arsiv'))).toBe(false);
  });
});

describe('disk harfi değişince arşiv bulunur', () => {
  it('aynı yol başka diskte', async () => {
    const t = await geciciKlasor();
    const D = join(t, 'D');
    const E = join(t, 'E');
    const eskiYer = join(D, 'Fotolar', 'Arsiv');
    const { kimlik } = await arsivOlustur(eskiYer);
    await rename(D, E); // aynı disk bu kez E: olarak takıldı; D: yok

    expect(await arsivBul(kimlik, eskiYer, [D, E])).toEqual([resolve(E, 'Fotolar', 'Arsiv')]);
  });

  it('başka klasöre taşınmışsa sığ aramayla bulunur; başka kimlik karışmaz', async () => {
    const t = await geciciKlasor();
    const D = join(t, 'D');
    const E = join(t, 'E');
    const { kimlik } = await arsivOlustur(join(E, 'Yedekler', 'Aile'));
    await arsivOlustur(join(E, 'Baska')); // başka bir arşiv
    await mkdir(D);
    expect(await arsivBul(kimlik, join(D, 'Eski', 'Yer'), [D, E])).toEqual([resolve(E, 'Yedekler', 'Aile')]);
    expect(await arsivBul('yok-boyle-kimlik', null, [D, E])).toEqual([]);
  });
});

describe('tek-yazıcı kilidi', () => {
  it('iki süreç aynı arşive yazamaz; çöken sürecin kilidi onayla kaldırılır', async () => {
    const kok = join(await geciciKlasor(), 'Arsiv');
    await arsivOlustur(kok);

    const { cocuk, satir } = await cocukAc(kok);
    expect(satir).toBe('HAZIR');
    try {
      expect((await kilitDurumu(kok)).durum).toBe('canli');
      await expect(Arsiv.ac(kok)).rejects.toEqual(kod('kilitli'));
      await expect(Arsiv.ac(kok, { bayatKilidiKaldir: true })).rejects.toEqual(kod('kilitli')); // canlı kilit kaldırılmaz
    } finally {
      cocuk.kill('SIGKILL'); // çökme: kilit dosyası geride kalır
      await bitti(cocuk);
    }
    expect(existsSync(join(kok, KILIT_ADI))).toBe(true);
    expect((await kilitDurumu(kok)).durum).toBe('bayat');
    await expect(Arsiv.ac(kok)).rejects.toEqual(kod('bayat-kilit')); // kullanıcıya sorulmadan kaldırılmaz
    const a = await Arsiv.ac(kok, { bayatKilidiKaldir: true });
    await a.kapat();
  });

  it('aynı süreçte ikinci açılış da reddedilir; kapatınca başka süreç açabilir', async () => {
    const kok = join(await geciciKlasor(), 'Arsiv');
    await arsivOlustur(kok);
    const a = await Arsiv.ac(kok);
    await expect(Arsiv.ac(kok)).rejects.toEqual(kod('kilitli'));
    await a.kapat();
    const { cocuk, satir } = await cocukAc(kok);
    expect(satir).toBe('HAZIR');
    cocuk.stdin!.end();
    await bitti(cocuk);
    expect(existsSync(join(kok, KILIT_ADI))).toBe(false);
  });

  it('başka cihazın taze kilidi reddedilir, eskimiş olanı bayat sayılır; bırakılan kilit başkasınınkini silmez', async () => {
    const kok = join(await geciciKlasor(), 'Arsiv');
    await arsivOlustur(kok);
    const baska = { uygulama: 'AYIKLA', cihaz: `${hostname()}-baska`, pid: 1, jeton: 'j1', zaman: new Date().toISOString() };
    await writeFile(join(kok, KILIT_ADI), JSON.stringify(baska));
    await expect(kilitAl(kok, { bayatKilidiKaldir: true })).rejects.toEqual(kod('baska-cihaz'));

    const eski = new Date(Date.now() - KILIT_ESKIME_MS - 1000).toISOString();
    await writeFile(join(kok, KILIT_ADI), JSON.stringify({ ...baska, zaman: eski }));
    expect((await kilitDurumu(kok)).durum).toBe('bayat');

    // Kendi süreci yaşıyor ama kilit uzun süredir tazelenmemiş (süreç numarası başka sürece geçmiş olabilir)
    await writeFile(join(kok, KILIT_ADI), JSON.stringify({ ...baska, cihaz: hostname(), pid: process.pid, zaman: eski }));
    expect((await kilitDurumu(kok)).durum).toBe('bayat');

    // Yarım yazılmış kilit: okunamaz, ancak onayla kaldırılır
    await writeFile(join(kok, KILIT_ADI), '{"uygu');
    await expect(kilitAl(kok)).rejects.toEqual(kod('bayat-kilit'));
    const k = await kilitAl(kok, { bayatKilidiKaldir: true });
    // Kilidimizi başkası (onayla) almışsa, bırakırken onunkini silmeyiz
    await writeFile(join(kok, KILIT_ADI), JSON.stringify(baska));
    await k.birak();
    expect(JSON.parse(await readFile(join(kok, KILIT_ADI), 'utf8')).jeton).toBe('j1');
  });
});
