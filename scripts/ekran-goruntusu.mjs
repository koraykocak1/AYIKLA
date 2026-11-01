// Programı açar, üç ekranın ve animasyonun ekran görüntülerini alır. Dosyalara yalnızca okumak için dokunur.
// Kullanım: npm run ekran -- "<klasör>" [çıktı klasörü]
import { _electron as electron } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ffmpegYolu from 'ffmpeg-static';
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
  // Yığının kısa GIF'i: kareler alınır, ffmpeg ile GIF'e çevrilir
  const kareKlasoru = join(cikti, 'kareler');
  mkdirSync(kareKlasoru, { recursive: true });
  const kareBasi = Date.now();
  let kare = 0;
  // Kartların uçuşu bitip sonuç ekranına geçilene kadar (en fazla 90 kare) hızlı JPEG kareler
  while (kare < 90 && !(await p.locator('[data-ekran="sonuc"]').count())) {
    await p.screenshot({ path: join(kareKlasoru, `${String(kare++).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 70 });
  }
  const fps = Math.max(4, Math.round(kare / ((Date.now() - kareBasi) / 1000)));
  execFileSync(ffmpegYolu, [
    '-y', '-v', 'error', '-framerate', String(fps), '-i', join(kareKlasoru, '%03d.jpg'),
    '-vf', 'scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    join(cikti, 'yigin.gif'),
  ]);
  rmSync(kareKlasoru, { recursive: true, force: true });
  console.log('kaydedildi:', join(cikti, 'yigin.gif'));
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
