/**
 * Yığın için küçük resimleri ana iş parçacığının dışında indirir, çözer ve 64×48'e (4:3, ortadan)
 * kırpar; hazır resmi kopyalamadan (transfer) geri yollar. Böylece ekran akıcı kalır.
 */
const HG = 64;
const HY = 48;

type Gelen = { i: number; adres: string };
const kapsam = self as unknown as {
  onmessage: ((e: MessageEvent<Gelen>) => void) | null;
  postMessage(m: unknown, aktar?: Transferable[]): void;
};

kapsam.onmessage = async (e) => {
  const { i, adres } = e.data;
  try {
    const cevap = await fetch(adres);
    if (!cevap.ok) throw new Error(String(cevap.status));
    const r = await createImageBitmap(await cevap.blob());
    const oran = HG / HY;
    let sw = r.width;
    let sh = r.height;
    if (sw / sh > oran) sw = sh * oran;
    else sh = sw / oran;
    const h = await createImageBitmap(r, (r.width - sw) / 2, (r.height - sh) / 2, sw, sh, {
      resizeWidth: HG,
      resizeHeight: HY,
      resizeQuality: 'medium',
    });
    r.close();
    kapsam.postMessage({ i, resim: h }, [h]);
  } catch {
    kapsam.postMessage({ i, resim: null });
  }
};
