// Testler için ayrı bir süreç: verilen arşivi açar, "HAZIR" yazar ve öldürülene ya da stdin kapanana kadar bekler.
import { Arsiv } from '../src/motor/arsiv';

const kok = process.argv[2];
try {
  const a = await Arsiv.ac(kok);
  process.stdout.write('HAZIR\n');
  process.stdin.resume();
  process.stdin.on('end', async () => {
    await a.kapat();
    process.exit(0);
  });
} catch (h) {
  process.stdout.write(`HATA ${(h as { kod?: string }).kod ?? String(h)}\n`);
  process.exit(1);
}
