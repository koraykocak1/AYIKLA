/** PNG resmini tek resimli bir Windows .ico dosyasına sarar (Windows Vista ve sonrası PNG'li ico okur). */
export function icoYap(png: Buffer, boyut: number): Buffer {
  const bas = Buffer.alloc(22);
  bas.writeUInt16LE(0, 0); // ayrılmış
  bas.writeUInt16LE(1, 2); // tür: simge
  bas.writeUInt16LE(1, 4); // resim sayısı
  bas.writeUInt8(boyut >= 256 ? 0 : boyut, 6); // genişlik
  bas.writeUInt8(boyut >= 256 ? 0 : boyut, 7); // yükseklik
  bas.writeUInt8(0, 8); // renk paleti yok
  bas.writeUInt8(0, 9);
  bas.writeUInt16LE(1, 10); // renk düzlemi
  bas.writeUInt16LE(32, 12); // bit derinliği
  bas.writeUInt32LE(png.length, 14);
  bas.writeUInt32LE(22, 18); // resmin başladığı yer
  return Buffer.concat([bas, png]);
}
