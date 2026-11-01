import { homedir } from 'node:os';
import { join } from 'node:path';
import { sunucuOlustur } from './motor/sunucu';
import { sahneModeliYukle, ingilizceyeCevir } from './motor/sahne-model';
import type { IsciIstegi } from './ortak/mesajlar';

const calisma = join(homedir(), '.ayikla');
const modeller = join(calisma, 'modeller');

const sunucu = sunucuOlustur({
  calismaKlasoru: calisma,
  modelYukle: () => sahneModeliYukle(modeller),
  cevir: (metin) => ingilizceyeCevir(metin, modeller),
  gonder: (m) => process.parentPort.postMessage(m),
});

process.parentPort.on('message', (e) => {
  void sunucu.isle(e.data as IsciIstegi);
});
