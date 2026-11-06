import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ArayuzOlayi, Istek } from '../ortak/mesajlar';

const api = {
  istek: (i: Istek): Promise<unknown> => ipcRenderer.invoke('istek', i),
  klasorSec: (): Promise<string | null> => ipcRenderer.invoke('klasor-sec'),
  aktarSec: (): Promise<unknown> => ipcRenderer.invoke('aktar-sec'),
  arsivSec: (): Promise<string | null> => ipcRenderer.invoke('arsiv-sec'),
  arsiveAl: (kok: string, anahtarlar?: string[]): Promise<unknown> => ipcRenderer.invoke('arsive-al', kok, anahtarlar),
  yedekSec: (): Promise<unknown> => ipcRenderer.invoke('yedek-sec'),
  geriYukleSec: (): Promise<unknown> => ipcRenderer.invoke('geri-yukle-sec'),
  baslangicKlasoru: (): Promise<string | null> => ipcRenderer.invoke('baslangic-klasoru'),
  yolAl: (f: File): string => webUtils.getPathForFile(f),
  olaylariDinle: (f: (o: ArayuzOlayi) => void): (() => void) => {
    const dinleyici = (_e: unknown, o: ArayuzOlayi) => f(o);
    ipcRenderer.on('olay', dinleyici);
    return () => ipcRenderer.removeListener('olay', dinleyici);
  },
};

contextBridge.exposeInMainWorld('ayikla', api);

export type AyiklaApi = typeof api;
