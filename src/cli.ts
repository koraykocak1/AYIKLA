import { homedir } from 'node:os';
import { join } from 'node:path';
import { ayikla } from './motor/isci';
import { HAZIR_GRUPLAR, DIGER_ID, kullaniciGrubu } from './motor/gruplar';
import { sahneModeliYukle, ingilizceyeCevir } from './motor/sahne-model';
import { disariAktar } from './motor/disari-aktar';
import { KayitDeposu } from './motor/kayit';

const ELEME_ADI = { kopya: 'Elenecek › Kopya', bulanik: 'Elenecek › Bulanık', karanlik: 'Elenecek › Karanlık' } as const;

async function main() {
  const [klasor, ...secenekler] = process.argv.slice(2);
  if (!klasor) {
    console.log('Kullanım: npm run ayikla -- "<klasör>" [--grup "Araba"] [--aktar "<hedef klasör>"]');
    process.exit(1);
  }
  const calisma = join(homedir(), '.ayikla');
  const modeller = join(calisma, 'modeller');

  const kayit = new KayitDeposu(join(calisma, 'kayit.json'));
  await kayit.yukle();
  const grupIndex = secenekler.indexOf('--grup');
  if (grupIndex >= 0) {
    const ad = secenekler[grupIndex + 1];
    const ing = await ingilizceyeCevir(ad, modeller);
    console.log(`Yeni grup: ${ad} (yapay zekâ için: "${ing}")`);
    const yeni = kullaniciGrubu(ad, ing);
    kayit.veri.kullaniciGruplari = [...kayit.veri.kullaniciGruplari.filter((g) => g.id !== yeni.id), yeni];
    await kayit.kaydet();
  }
  const gruplar = [...HAZIR_GRUPLAR, ...kayit.veri.kullaniciGruplari];

  console.log('Yapay zekâ yükleniyor (ilk seferde ~350 MB iner)…');
  const model = await sahneModeliYukle(modeller);
  console.log(`Hazır — çalıştığı yer: ${model.cihaz === 'dml' ? 'ekran kartı' : 'işlemci'}`);

  const baslangic = Date.now();
  const sonuc = await ayikla({
    girdiler: [klasor],
    calismaKlasoru: calisma,
    gruplar,
    model,
    olay: (o) => {
      if (o.tur === 'basladi') console.log(`${o.toplam} dosya bulundu`);
      if (o.tur === 'dosya') process.stdout.write(`\r${o.sira}/${o.toplam}`);
      if (o.tur === 'okunamadi') console.log(`\nOkunamadı: ${o.yol} (${o.hata})`);
    },
  });
  console.log(`\nBitti: ${((Date.now() - baslangic) / 1000).toFixed(1)} sn\n`);

  const ad = (id: string) => gruplar.find((g) => g.id === id)?.ad ?? (id === DIGER_ID ? 'Diğer' : id);
  const ozet = new Map<string, Map<string, number>>();
  for (const m of sonuc) {
    const g = m.eleme ? ELEME_ADI[m.eleme] : ad(m.grupId);
    const ay = m.tarih.slice(0, 7);
    if (!ozet.has(g)) ozet.set(g, new Map());
    ozet.get(g)!.set(ay, (ozet.get(g)!.get(ay) ?? 0) + 1);
  }
  for (const [g, aylar] of [...ozet].sort()) {
    const toplam = [...aylar.values()].reduce((a, b) => a + b, 0);
    console.log(`${g} (${toplam})`);
    for (const [ay, n] of [...aylar].sort()) console.log(`   ${ay}: ${n}`);
  }

  const aktarIndex = secenekler.indexOf('--aktar');
  if (aktarIndex >= 0) {
    const hedef = secenekler[aktarIndex + 1];
    const ogeler = sonuc.filter((m) => !m.eleme).map((m) => ({ yol: m.yol, grupAdi: ad(m.grupId), tarih: m.tarih }));
    const r = await disariAktar(ogeler, hedef);
    console.log(`\nKopyalanan: ${r.kopyalanan}, zaten vardı: ${r.atlanan}, hata: ${r.hatalar.length}`);
  }
}

main().catch((h) => {
  console.error(h);
  process.exit(1);
});
