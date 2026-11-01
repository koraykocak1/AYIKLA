// Programı açar, üç ekranın ve animasyonun ekran görüntülerini alır. Dosyalara yalnızca okumak için dokunur.
// Kullanım: npm run ekran -- "<klasör>" [çıktı klasörü]
import { _electron as electron } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [klasor, cikti = 'ekran-goruntuleri'] = process.argv.slice(2);
if (!klasor) {
  console.log('Kullanım: npm run ekran -- "<klasör>" [çıktı klasörü]');
  process.exit(1);
}
const kok = resolve(import.meta.dirname, '..');
mkdirSync(cikti, { recursive: true });

const uygulama = await electron.launch({ args: [kok, klasor], cwd: kok });
const p = await uygulama.firstWindow();
const resim = async (ad) => {
  await p.screenshot({ path: join(cikti, ad) });
  console.log('kaydedildi:', join(cikti, ad));
};

try {
  await p.getByText('bulundu').waitFor({ timeout: 120_000 });
  await p.waitForTimeout(1200);
  await resim('1-karsilama.png');

  await p.getByRole('button', { name: 'Ayıkla', exact: true }).click();
  await p.locator('[data-durum="calisiyor"]').waitFor({ timeout: 600_000 });
  await p.waitForTimeout(2500);
  await resim('2-ayiklama-baslangic.png');
  await p.waitForTimeout(5000);
  await resim('3-ayiklama-ilerliyor.png');

  await p.locator('[data-ekran="sonuc"]').waitFor({ timeout: 3_600_000 });
  await p.waitForTimeout(2500);
  await resim('4-sonuc.png');

  await p.locator('.kare').first().click();
  await p.waitForTimeout(2000);
  await resim('5-buyuk-gorunum.png');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(700);

  await p.locator('.kare').nth(1).click({ button: 'right' });
  await p.waitForTimeout(600);
  await resim('6-sag-tik-menusu.png');
} finally {
  await uygulama.close();
}
