import sharp from 'sharp';

/** Kartın rengi: küçük resmin ortalama rengi (1×1'e küçültülerek, hızlı). Okunamazsa gri. */
export async function ortalamaRenk(onizleme: string): Promise<string> {
  try {
    const { data } = await sharp(onizleme).resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return '#' + [data[0], data[1], data[2]].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return '#808080';
  }
}
