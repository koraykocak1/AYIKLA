/** Son işlenen dosyaların zamanlarından kalan süreyi tahmin eder. */
export class HizOlcer {
  private readonly pencere: number;
  private zamanlar: number[] = [];

  constructor(pencere = 30) {
    this.pencere = pencere;
  }

  ekle(ms: number): void {
    this.zamanlar.push(ms);
    if (this.zamanlar.length > this.pencere) this.zamanlar.shift();
  }

  /** Kalan süre (saniye); yeterli veri yoksa null. */
  kalan(kalanAdet: number): number | null {
    const z = this.zamanlar;
    if (z.length < 3) return null;
    const sure = (z[z.length - 1] - z[0]) / 1000;
    if (sure <= 0) return null;
    return (kalanAdet * sure) / (z.length - 1);
  }
}
