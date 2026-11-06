import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, screen, utilityProcess, type UtilityProcess } from 'electron';
import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { adresCoz, baslangicKlasoru, onizlemeYolu } from './yollar';
import type { ArayuzOlayi, IsciIstegi, IsciMesaji, Istek } from '../ortak/mesajlar';

protocol.registerSchemesAsPrivileged([
  { scheme: 'ayikla', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

const ONIZLEME_KLASORU = join(process.env.AYIKLA_CALISMA ?? join(homedir(), '.ayikla'), 'onizleme');
/** Arayüzün işçiye doğrudan iletebileceği istekler. "aktar" ve "arsiveAl" yalnızca klasör seçme penceresinden sonra ana süreçten gider. */
const ARAYUZDEN_IZINLI = new Set<Istek['tur']>(['say', 'baslat', 'durdur', 'gruplar', 'grupEkle', 'grupTasi', 'geriAl', 'sonArsivler', 'modelDurumu', 'modelIzniVer', 'arsivDurumu']);
/** Bu oturumda işçinin bildirdiği dosyalar: yalnızca bunların orijinali ayikla://dosya ile açılır. */
const izinliDosyalar = new Set<string>();
const bekleyen = new Map<number, { coz: (v: unknown) => void; reddet: (h: Error) => void }>();
let pencere: BrowserWindow | null = null;
let isci: UtilityProcess | null = null;
let sira = 0;

function klasorMu(yol: string): boolean {
  try {
    return statSync(yol).isDirectory();
  } catch {
    return false;
  }
}

function olayIlet(o: ArayuzOlayi): void {
  if (o.tur === 'dosya') izinliDosyalar.add(o.medya.yol);
  if (o.tur === 'bitti') for (const m of o.sonuc) izinliDosyalar.add(m.yol);
  pencere?.webContents.send('olay', o);
}

function isciAc(): UtilityProcess {
  if (isci) return isci;
  const c = utilityProcess.fork(join(__dirname, 'isci.mjs'), [], { serviceName: 'AYIKLA motoru' });
  c.on('message', (m: IsciMesaji) => {
    if (m.tur === 'olay') return olayIlet(m.olay);
    const b = bekleyen.get(m.cevap.id);
    if (!b) return;
    bekleyen.delete(m.cevap.id);
    if (m.cevap.tamam) b.coz(m.cevap.veri);
    else b.reddet(new Error(m.cevap.hata));
  });
  c.on('exit', () => {
    isci = null;
    for (const b of bekleyen.values()) b.reddet(new Error('Motor beklenmedik şekilde kapandı'));
    bekleyen.clear();
  });
  isci = c;
  return c;
}

function iste(istek: Istek): Promise<unknown> {
  const id = ++sira;
  return new Promise((coz, reddet) => {
    bekleyen.set(id, { coz, reddet });
    isciAc().postMessage({ ...istek, id } as IsciIstegi);
  });
}

function pencereAc(): void {
  const alan = screen.getPrimaryDisplay().workAreaSize;
  pencere = new BrowserWindow({
    width: Math.min(1440, Math.round(alan.width * 0.94)),
    height: Math.min(900, Math.round(alan.height * 0.94)),
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0a09',
    title: 'AYIKLA',
    icon: join(__dirname, '..', 'simge', 'ayikla.png'),
    show: false,
    webPreferences: { preload: join(__dirname, 'onyukle.cjs'), contextIsolation: true, sandbox: true },
  });
  pencere.once('ready-to-show', () => pencere?.show());
  pencere.on('closed', () => {
    pencere = null;
  });
  void pencere.loadFile(join(__dirname, 'arayuz', 'index.html'));
}

void app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  protocol.handle('ayikla', async (istek) => {
    const c = adresCoz(istek.url);
    let yol: string | null = null;
    if (c?.tur === 'onizleme') yol = onizlemeYolu(ONIZLEME_KLASORU, c.ad);
    else if (c?.tur === 'dosya' && izinliDosyalar.has(c.yol)) yol = c.yol;
    if (!yol) return new Response('Bulunamadı', { status: 404 });
    const cevap = await net.fetch(pathToFileURL(yol).toString(), { headers: istek.headers });
    // Arayüz küçük resimleri WebGL dokusuna çizebilsin diye (aynı uygulamanın kendi adresleri)
    const basliklar = new Headers(cevap.headers);
    basliklar.set('Access-Control-Allow-Origin', '*');
    return new Response(cevap.body, { status: cevap.status, headers: basliklar });
  });

  ipcMain.handle('istek', (_e, istek: Istek) => {
    if (!ARAYUZDEN_IZINLI.has(istek.tur)) throw new Error('İzin verilmeyen istek');
    return iste(istek);
  });
  ipcMain.handle('klasor-sec', async () => {
    if (!pencere) return null;
    const r = await dialog.showOpenDialog(pencere, { title: 'Fotoğraf klasörünü seç', properties: ['openDirectory'] });
    return r.canceled ? null : (r.filePaths[0] ?? null);
  });
  ipcMain.handle('aktar-sec', async () => {
    if (!pencere) return null;
    const r = await dialog.showOpenDialog(pencere, {
      title: 'Kopyaların kaydedileceği klasörü seç',
      buttonLabel: 'Buraya kaydet',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return iste({ tur: 'aktar', hedef: r.filePaths[0] });
  });
  // Arşiv klasörü: seçilen yol yalnız arayüze döner (kutuda gösterilir). "Arşive al" yalnız bu pencereden
  // seçilmiş ya da motorun bildiği arşivin yolu için kabul edilir; arayüz başka bir yol uyduramaz.
  const secilenArsivler = new Set<string>();
  ipcMain.handle('arsiv-sec', async () => {
    if (!pencere) return null;
    const r = await dialog.showOpenDialog(pencere, {
      title: 'Arşiv klasörünü seç',
      buttonLabel: 'Bu klasörü seç',
      properties: ['openDirectory', 'createDirectory'],
    });
    const yol = r.canceled ? null : (r.filePaths[0] ?? null);
    if (yol) secilenArsivler.add(yol);
    return yol;
  });
  ipcMain.handle('arsive-al', async (_e, kok: unknown) => {
    if (typeof kok !== 'string') throw new Error('İzin verilmeyen istek');
    const bilinen = ((await iste({ tur: 'arsivDurumu' })) as { kok: string | null }).kok;
    if (!secilenArsivler.has(kok) && kok !== bilinen) throw new Error('İzin verilmeyen istek');
    return iste({ tur: 'arsiveAl', kok });
  });
  ipcMain.handle('baslangic-klasoru', () => baslangicKlasoru(process.argv, app.getAppPath(), klasorMu));

  isciAc();
  pencereAc();
});

app.on('window-all-closed', () => {
  isci?.kill();
  app.quit();
});
