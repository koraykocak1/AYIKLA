import { homedir } from 'node:os';
import { join } from 'node:path';
import { sunucuOlustur } from './motor/sunucu';
import { sahneModeliYukle, ingilizceyeCevir } from './motor/sahne-model';
import { ModelIzni } from './motor/model-izni';
import type { IsciIstegi } from './ortak/mesajlar';

// AYIKLA_CALISMA: denemelerde gerçek önbelleğe dokunmamak için başka bir çalışma klasörü
const calisma = process.env.AYIKLA_CALISMA ?? join(homedir(), '.ayikla');
const modeller = join(calisma, 'modeller');

const sunucu = sunucuOlustur({
  calismaKlasoru: calisma,
  modelYukle: (uzaktanIzin) => sahneModeliYukle(modeller, uzaktanIzin),
  cevir: (metin, uzaktanIzin) => ingilizceyeCevir(metin, modeller, uzaktanIzin),
  modelIzni: new ModelIzni(calisma, modeller),
  gonder: (m) => process.parentPort.postMessage(m),
});

process.parentPort.on('message', (e) => {
  void sunucu.isle(e.data as IsciIstegi);
});
