import type { Sayim } from '../../ortak/mesajlar';
import type { ElemeNedeni } from '../../motor/tipler';

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function sayi(n: number): string {
  return n.toLocaleString('tr-TR');
}

export function bulunduMetni(s: Sayim): string {
  const p: string[] = [];
  if (s.foto) p.push(`${sayi(s.foto)} fotoğraf`);
  if (s.video) p.push(`${sayi(s.video)} video`);
  return p.length ? `${p.join(' · ')} bulundu` : 'Desteklenen fotoğraf veya video bulunamadı';
}

export function sureMetni(sn: number | null): string {
  if (sn === null || !Number.isFinite(sn)) return '—';
  if (sn < 60) return `${Math.max(1, Math.round(sn))} sn`;
  const dk = Math.round(sn / 60);
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

export function ayAdi(ay: number): string {
  return AYLAR[ay - 1] ?? String(ay);
}

export function tarihMetni(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ELEME_ADLARI: Record<ElemeNedeni, string> = { kopya: 'Kopya', bulanik: 'Bulanık', karanlik: 'Karanlık' };
export function elemeAdi(e: ElemeNedeni): string {
  return ELEME_ADLARI[e];
}

export function sonParca(yol: string): string {
  return yol.split(/[\\/]/).filter(Boolean).pop() ?? yol;
}

export function onizlemeAdresi(yol: string): string {
  return 'ayikla://onizleme/' + sonParca(yol);
}

export function dosyaAdresi(yol: string): string {
  return 'ayikla://dosya/' + encodeURIComponent(yol);
}

/** Electron'un "Error invoking remote method…" önekini atıp yalnızca anlamlı mesajı bırakır. */
export function hataMetni(h: unknown): string {
  const ham = h instanceof Error ? h.message : String(h);
  return ham.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
