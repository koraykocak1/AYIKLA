declare module 'heic-convert' {
  interface Secenek { buffer: Buffer; format: 'JPEG' | 'PNG'; quality?: number }
  export default function convert(secenek: Secenek): Promise<ArrayBuffer>;
}

declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
