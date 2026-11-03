// Testler için ayrı bir süreç: kaynak klasördeki dosyaları arşive alır, her dosyadan sonra "ILERLEME <n>" yazar.
// Kabul testi bu süreci yarıda öldürerek ani kapanmayı taklit eder.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Arsiv } from '../src/motor/arsiv';
import { iceAl } from '../src/motor/arsiv-depo';

const [kok, kaynak] = process.argv.slice(2);
const a = await Arsiv.ac(kok);
const dosyalar = (await readdir(kaynak)).sort().map((ad) => ({ yol: join(kaynak, ad) }));
await iceAl(a, dosyalar, (bitti) => process.stdout.write(`ILERLEME ${bitti}\n`));
await a.kapat();
process.stdout.write('BITTI\n');
