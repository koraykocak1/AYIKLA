declare module 'heic-convert' {
  interface Secenek { buffer: Buffer; format: 'JPEG' | 'PNG'; quality?: number }
  export default function convert(secenek: Secenek): Promise<ArrayBuffer>;
}
