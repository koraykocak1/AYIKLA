# AYIKLA Arayüz — Yapım Planı (Plan 2/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motoru (Plan 1) animasyonlu, Türkçe, tek tıkla açılan bir masaüstü programına dönüştürmek: Karşılama → Ayıklama (dönen yığın, kartlar gruplarına uçar) → Sonuç (gruplar, yıl › ay ızgarası, büyük görünüm, elle taşıma, grup ekleme, klasörlere kaydetme).

**Architecture:** Electron üç parçadan oluşur. (1) **Ana süreç** (`src/ana/ana.ts`): pencere, dosya seçme pencereleri, `ayikla://` adresleri (küçük resim ve orijinal dosya sunar), arayüz ↔ işçi aracılığı. (2) **İşçi süreç** (`utilityProcess`, `src/isci-giris.ts` → `src/motor/sunucu.ts`): motorun tamamı burada çalışır; `kayit.json`'a yalnız o yazar; olayları ana sürece yollar. (3) **Arayüz** (React + Vite, `src/arayuz`): üç ekran; dönen yığın react-three-fiber ile tek `InstancedMesh` (binlerce kart tek çizim); geçişler Motion ile. Ekranı süren hesaplar (yerleşim, biçimlendirme, gruplama, kalan süre) saf fonksiyonlardır ve vitest ile test edilir; ekranlar ekran görüntüsüyle doğrulanır.

**Tech Stack:** Electron 45.2.1 (Node 24.22), React 19.3.1, Vite 8.3.5 + @vitejs/plugin-react 6.1.2, three 0.187 + @react-three/fiber 9.8.2, motion 14.9 (`motion/react`), esbuild 0.28 (ana/önyükleme/işçi paketleme), playwright-core 1.64 (ekran görüntüsü betiği). Hepsi 1 Kasım 2026'da npm'de kontrol edildi ve kuruldu; Electron'un işçi sürecinde sharp ve @huggingface/transformers'ın ESM olarak yüklendiği denendi.

**Tasarım belgesi:** `docs/superpowers/specs/2026-11-01-ayikla-tasarim.md` (bölüm 4, 6, 8, 9).
**Önceki plan:** `docs/superpowers/plans/2026-11-01-ayikla-motor.md` (motor bitti).

**Kurallar (her görevde geçerli):**
- Program hiçbir kullanıcı dosyasını silmez, taşımaz, değiştirmez. Yazma yalnızca `~/.ayikla` ve kullanıcının seçtiği dışa aktarma klasörüne yapılır.
- Arayüz yalnızca izin listesindeki istekleri işçiye iletebilir; dışa aktarma hedefi her zaman ana süreçteki klasör seçme penceresinden gelir.
- Orijinal dosya adresleri (`ayikla://dosya/...`) yalnızca o oturumda işçinin bildirdiği dosyalar için açılır.
- Kod içi adlar Türkçe (ASCII), ekrana çıkan metinler Türkçe karakterli.
- Her görev sonunda `npm test` ve `npm run tip` temiz, sonra commit (mesaj sonunda `Co-Authored-By` satırı).
- **Bu planda yapılmayacaklar:** karanlık eşiğini gevşetme, NEF/AVI desteği.

**Dosya bloğu kuralı:** Bu plandaki her `Dosya: \`yol\`` satırının hemen altındaki kod bloğu o dosyanın **tam** içeriğidir.

---

## Dosya haritası

```
AYIKLA/
  package.json              main, productName, yeni komutlar (derle, baslat, kur, simge, ekran)
  tsconfig.json             JSX + DOM eklendi
  vite.config.ts            arayüz derlemesi (src/arayuz → dist/arayuz)
  scripts/
    derle.mjs               esbuild (ana, önyükleme, işçi) + vite
    simge.ts                simge/ayikla.png + simge/ayikla.ico üretir
    kisayol.ps1             Masaüstü\AYIKLA.lnk kısayolu
    ekran-goruntusu.mjs     programı açıp ekran görüntüleri alır (playwright-core)
  simge/ayikla.png, simge/ayikla.ico
  KULLANIM.md               kullanıcı için kısa Türkçe kullanım notu
  src/
    motor/tipler.ts         + geriAlindi, SonArsiv
    motor/kayit.ts          + sonArsivler, arsivEkle
    motor/isci.ts           + geriAlindi'ye uyar, yenidenPuanla
    motor/sunucu.ts         işçi sürecin mantığı (istek → cevap, olay akışı)
    ortak/mesajlar.ts       ana ↔ işçi ↔ arayüz mesaj tipleri, arayuzIcin()
    isci-giris.ts           utilityProcess girişi
    ana/
      yollar.ts             ayikla:// adres çözme, başlangıç klasörü (saf, test edilir)
      ico.ts                PNG → .ico sarmalayıcı (saf, test edilir)
      ana.ts                Electron ana süreç
      onyukle.ts            preload: window.ayikla
    arayuz/
      index.html  main.tsx  vite-env.d.ts  stil.css  api.ts  App.tsx
      mantik/bicim.ts  mantik/gruplama.ts  mantik/duzen.ts  mantik/zaman.ts
      bilesenler/Yigin.tsx  bilesenler/BuyukGorunum.tsx
      ekranlar/Karsilama.tsx  ekranlar/Ayiklama.tsx  ekranlar/Sonuc.tsx
  tests/
    mesajlar.test.ts  sunucu.test.ts  yollar.test.ts  ico.test.ts
    bicim.test.ts  gruplama.test.ts  duzen.test.ts  zaman.test.ts
    (kayit.test.ts ve isci.test.ts'e yeni testler eklenir)
```

---

### Task 1: Arayüz hazırlığı (paketler, ayarlar)

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `vite.config.ts`, `src/arayuz/vite-env.d.ts`

- [ ] **Step 1: Paketleri kur** (planı yazarken kuruldu; temiz kurulumda şunlar çalıştırılır)

```bash
npm install react@19.3.1 react-dom@19.3.1 three@0.187.0 @react-three/fiber@9.8.2 motion@14.9.0
npm install -D electron@45.2.1 vite@8.3.5 @vitejs/plugin-react@6.1.2 @types/three@0.187.0 @types/react@19.3.0 @types/react-dom@19.3.0 esbuild@0.28.2 playwright-core@1.64.1
npm install-scripts approve electron
node node_modules/electron/install.js
```
Expected: `npx electron --version` → `v45.2.1`.

- [ ] **Step 2: package.json alanları ve komutlar**

```bash
npm pkg set main=dist/ana.cjs productName=AYIKLA
npm pkg set scripts.derle="node scripts/derle.mjs"
npm pkg set scripts.baslat="npm run derle && electron ."
npm pkg set scripts.simge="tsx scripts/simge.ts"
npm pkg set scripts.kur="npm run derle && powershell -NoProfile -ExecutionPolicy Bypass -File scripts/kisayol.ps1"
npm pkg set scripts.ekran="node scripts/ekran-goruntusu.mjs"
```

- [ ] **Step 3: tsconfig.json**

Dosya: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["node"]
  },
  "include": ["src", "tests", "scripts/*.ts", "vitest.config.ts", "vite.config.ts"]
}
```

- [ ] **Step 4: vite.config.ts**

Dosya: `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/arayuz',
  base: './',
  plugins: [react()],
  build: { outDir: '../../dist/arayuz', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
```

Dosya: `src/arayuz/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: .gitignore**

Dosya: `.gitignore`
```
node_modules/
dist/
*.log
ekran-goruntuleri/
```

- [ ] **Step 6: Kontrol ve commit**

Run: `npm run tip` → hata yok. `npm test` → 47 test PASS.
```bash
git add package.json package-lock.json tsconfig.json .gitignore vite.config.ts src/arayuz/vite-env.d.ts
git commit -m "chore(arayuz): Electron, React, three.js, Motion ve derleme ayarları"
```

---

### Task 2: Motor eklemeleri (geri alma, yeniden puanlama, son arşivler)

**Files:**
- Modify: `src/motor/tipler.ts`, `src/motor/kayit.ts`, `src/motor/isci.ts`
- Test: `tests/kayit.test.ts`, `tests/isci.test.ts`

- [ ] **Step 1: Başarısız testleri ekle**

`tests/kayit.test.ts` sonundaki `});` (describe kapanışı) öncesine ekle:
```ts
  it('son arşivleri tekrarsız, en yeni başta ve en fazla 8 tane tutar', async () => {
    const dosya = join(await geciciKlasor(), 'kayit.json');
    const d = new KayitDeposu(dosya);
    await d.yukle();
    for (let i = 0; i < 10; i++) d.arsivEkle({ girdiler: [`K${i}`], tarih: '2026-11-01T00:00:00.000Z', foto: i, video: 0 });
    d.arsivEkle({ girdiler: ['K5'], tarih: '2026-11-02T00:00:00.000Z', foto: 50, video: 1 });
    await d.kaydet();

    const d2 = new KayitDeposu(dosya);
    await d2.yukle();
    const liste = d2.veri.sonArsivler ?? [];
    expect(liste).toHaveLength(8);
    expect(liste[0]).toMatchObject({ girdiler: ['K5'], foto: 50 });
    expect(liste.filter((a) => a.girdiler[0] === 'K5')).toHaveLength(1);
    expect(liste[1].girdiler).toEqual(['K9']);
  });
```

`tests/isci.test.ts`: içe aktarmayı `import { ayikla, yenidenPuanla } from '../src/motor/isci';` yap ve describe kapanışı öncesine ekle:
```ts
  it('geri alınan dosya elenmez', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
    const { model } = sahteModel();
    const calisma = join(kok, 'calisma');
    const ilk = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ilk[0].eleme).toBe('bulanik');

    const d = new KayitDeposu(join(calisma, 'kayit.json'));
    await d.yukle();
    Object.values(d.veri.medya)[0].geriAlindi = true;
    await d.kaydet();

    const ikinci = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ikinci[0].eleme).toBeNull();
  });

  it('yenidenPuanla yeni grup listesine göre dağıtır, resimleri yeniden işlemez', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, 'a.jpg'), { renk: [40, 40, 220], tohum: 2 });
    const { model, sayac } = sahteModel();
    const sonuc = await ayikla({ girdiler: [join(kok, 'a.jpg')], calismaKlasoru: join(kok, 'calisma'), gruplar: [GRUPLAR[0]], model, olay: () => {} });
    expect(sonuc[0].grupId).toBe('k');
    const once = sayac.resim;
    await yenidenPuanla(sonuc, GRUPLAR, model);
    expect(sonuc[0].grupId).toBe('m');
    expect(sayac.resim).toBe(once);
  });
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/kayit.test.ts tests/isci.test.ts`
Expected: FAIL — `arsivEkle is not a function`, `yenidenPuanla` yok, geri alınan dosya hâlâ `bulanik`.

- [ ] **Step 3: tipler.ts**

`IslenmisMedya` içinde `elleGrup?: string;` satırının altına:
```ts
  geriAlindi?: boolean; // kullanıcı "Geri al" dedi: elenmez
```
Dosyanın sonuna:
```ts
export interface SonArsiv {
  girdiler: string[];
  tarih: string; // ISO
  foto: number;
  video: number;
}
```

- [ ] **Step 4: kayit.ts**

İçe aktarmayı `import type { Grup, IslenmisMedya, MedyaDosyasi, SonArsiv } from './tipler';` yap. `KayitVerisi`'ne `sonArsivler?: SonArsiv[];` ekle. `anahtarUret`'in üstüne `export const SON_ARSIV_SINIRI = 8;` ekle. Sınıfa `koy`'un altına:
```ts
  /** Son açılan arşivleri en yeni başta, tekrarsız ve en fazla SON_ARSIV_SINIRI tane tutar. */
  arsivEkle(a: SonArsiv): void {
    const anahtar = JSON.stringify(a.girdiler);
    const eski = (this.veri.sonArsivler ?? []).filter((x) => JSON.stringify(x.girdiler) !== anahtar);
    this.veri.sonArsivler = [a, ...eski].slice(0, SON_ARSIV_SINIRI);
  }
```

- [ ] **Step 5: isci.ts**

`ayikla` içindeki eleme satırını şununla değiştir:
```ts
      m.eleme = m.geriAlindi ? null : m.tur === 'foto' ? (m.kalite.karanlik ? 'karanlik' : m.kalite.bulanik ? 'bulanik' : null) : null;
```
`kopyalariIsaretle` içindeki aday filtresini şununla değiştir:
```ts
    const adaylar = liste.filter((m) => m.tur === tur && m.eleme === null && !m.geriAlindi);
```
`grupBelirle`'nin altına ekle:
```ts
/** Kayıtlı vektörlerle grupları yeniden belirler; fotoğraflar yeniden taranmaz. */
export async function yenidenPuanla(liste: IslenmisMedya[], gruplar: Grup[], model: SahneModeli): Promise<IslenmisMedya[]> {
  const gv = await grupVektorleriHazirla(gruplar, model);
  for (const m of liste) m.grupId = grupBelirle(m, gv);
  return liste;
}
```

- [ ] **Step 6: Geçtiğini gör**

Run: `npm test` → hepsi PASS (50). `npm run tip` → temiz.

- [ ] **Step 7: Commit**

```bash
git add src/motor/tipler.ts src/motor/kayit.ts src/motor/isci.ts tests/kayit.test.ts tests/isci.test.ts
git commit -m "feat(motor): geri alma, yeniden puanlama ve son arşivler"
```

---

### Task 3: Ortak mesaj tipleri

**Files:**
- Create: `src/ortak/mesajlar.ts`
- Test: `tests/mesajlar.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

Dosya: `tests/mesajlar.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { arayuzIcin } from '../src/ortak/mesajlar';
import type { IslenmisMedya } from '../src/motor/tipler';

const ornek: IslenmisMedya = {
  anahtar: 'a', yol: 'C:/a.jpg', tur: 'foto', boyut: 1, degisme: 1, tarih: '2024-01-01T00:00:00.000Z',
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: ['C:/o/a.jpg'], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0000000000000000',
  vektor: [0.1, 0.2, 0.3], grupId: 'deniz', eleme: null,
};

describe('mesajlar', () => {
  it('arayüze giden kayıt vektörü taşımaz, rengi taşır', () => {
    const a = arayuzIcin(ornek, '#112233');
    expect('vektor' in a).toBe(false);
    expect(a.renk).toBe('#112233');
    expect(a.anahtar).toBe('a');
    expect(a.grupId).toBe('deniz');
    expect(ornek.vektor).toHaveLength(3); // asıl kayıt bozulmaz
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npx vitest run tests/mesajlar.test.ts` → FAIL (modül yok).

- [ ] **Step 3: Kodu yaz**

Dosya: `src/ortak/mesajlar.ts`
```ts
import type { IslenmisMedya } from '../motor/tipler';

/** Arayüze giden medya: büyük CLIP vektörü çıkarılır, kartın rengi eklenir. */
export type ArayuzMedya = Omit<IslenmisMedya, 'vektor'> & { renk: string };

export interface Sayim {
  foto: number;
  video: number;
}

/** Ana süreç → işçi */
export type IsciIstegi =
  | { id: number; tur: 'say'; girdiler: string[] }
  | { id: number; tur: 'baslat'; girdiler: string[] }
  | { id: number; tur: 'durdur' }
  | { id: number; tur: 'gruplar' }
  | { id: number; tur: 'grupEkle'; ad: string }
  | { id: number; tur: 'grupTasi'; anahtar: string; grupId: string }
  | { id: number; tur: 'geriAl'; anahtar: string }
  | { id: number; tur: 'sonArsivler' }
  | { id: number; tur: 'aktar'; hedef: string };

type IdsizIstek<T> = T extends unknown ? Omit<T, 'id'> : never;
/** Kimliği ana süreç ekler; arayüz kimliksiz gönderir. */
export type Istek = IdsizIstek<IsciIstegi>;

/** İşçi → ana süreç → arayüz: canlı olaylar */
export type ArayuzOlayi =
  | { tur: 'model'; durum: 'yukleniyor' | 'hazir' | 'hata'; cihaz?: string; hata?: string }
  | { tur: 'basladi'; toplam: number }
  | { tur: 'dosya'; medya: ArayuzMedya; sira: number; toplam: number }
  | { tur: 'okunamadi'; yol: string; hata: string }
  | { tur: 'kopyalar'; anahtarlar: string[] }
  | { tur: 'bitti'; sonuc: ArayuzMedya[]; durduruldu: boolean }
  | { tur: 'aktarim'; bitti: number; toplam: number };

export type IsciCevabi = { id: number; tamam: true; veri: unknown } | { id: number; tamam: false; hata: string };

/** İşçinin ana sürece yolladığı her şey */
export type IsciMesaji = { tur: 'cevap'; cevap: IsciCevabi } | { tur: 'olay'; olay: ArayuzOlayi };

export function arayuzIcin(m: IslenmisMedya, renk: string): ArayuzMedya {
  const { vektor: _vektor, ...geri } = m;
  return { ...geri, renk };
}
```

- [ ] **Step 4: Geçtiğini gör** — `npx vitest run tests/mesajlar.test.ts` → PASS. `npm run tip` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/ortak/mesajlar.ts tests/mesajlar.test.ts
git commit -m "feat(ortak): ana süreç, işçi ve arayüz arasındaki mesaj tipleri"
```

---

### Task 4: İşçi sunucusu (motoru arayüze bağlayan mantık)

**Files:**
- Create: `src/motor/sunucu.ts`
- Test: `tests/sunucu.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

Dosya: `tests/sunucu.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { sunucuOlustur } from '../src/motor/sunucu';
import { normalize } from '../src/motor/sahne-puan';
import { KayitDeposu } from '../src/motor/kayit';
import type { ArayuzMedya, ArayuzOlayi, IsciIstegi, IsciMesaji, Istek, Sayim } from '../src/ortak/mesajlar';
import type { Grup, SahneModeli } from '../src/motor/tipler';
import type { AktarmaSonucu } from '../src/motor/disari-aktar';
import { geciciKlasor, desenliResim, bulanikResim, ornekVideo } from './yardimci';

// Sahte model: resmin ortalama rengi vektör olur; "blue" tarifi maviye, diğer her tarif yeşile denk gelir.
const sahteModel: SahneModeli = {
  cihaz: 'sahte',
  async resimVektoru(yol) {
    const s = await sharp(yol).stats();
    return normalize(s.channels.slice(0, 3).map((c) => c.mean));
  },
  async metinVektorleri(metinler) {
    return metinler.map((m) => (m === 'blue' ? [0, 0, 1] : [0, 1, 0]));
  },
};

async function hazirla(modelYukle: () => Promise<SahneModeli> = async () => sahteModel) {
  const kok = await geciciKlasor();
  const girdi = join(kok, 'girdi');
  await mkdir(girdi);
  await desenliResim(join(girdi, 'mavi.jpg'), { renk: [40, 40, 220], tohum: 2 });
  await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
  await ornekVideo(join(girdi, 'video.mp4'), 'red');
  const calisma = join(kok, 'calisma');
  const mesajlar: IsciMesaji[] = [];
  const sunucu = sunucuOlustur({ calismaKlasoru: calisma, modelYukle, cevir: async () => 'blue', gonder: (m) => mesajlar.push(m) });
  let sira = 0;
  async function iste<T>(i: Istek): Promise<T> {
    const id = ++sira;
    await sunucu.isle({ ...i, id } as IsciIstegi);
    const m = mesajlar.find((x) => x.tur === 'cevap' && x.cevap.id === id);
    if (!m || m.tur !== 'cevap') throw new Error('cevap yok');
    if (!m.cevap.tamam) throw new Error(m.cevap.hata);
    return m.cevap.veri as T;
  }
  const olaylar = (): ArayuzOlayi[] => mesajlar.flatMap((m) => (m.tur === 'olay' ? [m.olay] : []));
  return { kok, girdi, calisma, iste, olaylar };
}

describe('sunucu', () => {
  it('klasördeki fotoğraf ve videoları sayar', async () => {
    const s = await hazirla();
    expect(await s.iste<Sayim>({ tur: 'say', girdiler: [s.girdi] })).toEqual({ foto: 2, video: 1 });
  });

  it('ayıklarken olayları sırayla yollar, son arşivi kaydeder', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const o = s.olaylar();
    expect(o[0]).toEqual({ tur: 'model', durum: 'yukleniyor' });
    expect(o[1]).toEqual({ tur: 'model', durum: 'hazir', cihaz: 'sahte' });
    expect(o[2]).toEqual({ tur: 'basladi', toplam: 3 });
    const dosyalar = o.filter((x) => x.tur === 'dosya');
    expect(dosyalar).toHaveLength(3);
    for (const d of dosyalar) {
      expect(d.medya.renk).toMatch(/^#[0-9a-f]{6}$/);
      expect('vektor' in d.medya).toBe(false);
    }
    const bitti = o.at(-1);
    expect(bitti?.tur).toBe('bitti');
    if (bitti?.tur === 'bitti') {
      expect(bitti.sonuc).toHaveLength(3);
      expect(bitti.durduruldu).toBe(false);
    }
    const arsivler = await s.iste<{ girdiler: string[]; foto: number; video: number }[]>({ tur: 'sonArsivler' });
    expect(arsivler).toEqual([expect.objectContaining({ girdiler: [s.girdi], foto: 2, video: 1 })]);
  });

  it('yeni grup ekleyince Türkçe adı çevirir ve arşivi yeniden puanlar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const r = await s.iste<{ grup: Grup; sonuc: ArayuzMedya[] }>({ tur: 'grupEkle', ad: 'Mavi' });
    expect(r.grup).toEqual({ id: 'k-mavi', ad: 'Mavi', tarifler: ['a photo of a blue', 'blue'], kullanici: true });
    expect(r.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))?.grupId).toBe('k-mavi');
    const gruplar = await s.iste<Grup[]>({ tur: 'gruplar' });
    expect(gruplar.at(-1)?.id).toBe('k-mavi');
  });

  it('elle taşıma ve geri alma kalıcıdır', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    const bulanik = bitti.sonuc.find((m) => m.yol.endsWith('bulanik.jpg'))!;
    const mavi = bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))!;
    expect(bulanik.eleme).toBe('bulanik');

    const tasinan = await s.iste<ArayuzMedya>({ tur: 'grupTasi', anahtar: bulanik.anahtar, grupId: 'deniz' });
    expect(tasinan).toMatchObject({ grupId: 'deniz', elleGrup: 'deniz', eleme: null });
    const geri = await s.iste<ArayuzMedya>({ tur: 'geriAl', anahtar: mavi.anahtar });
    expect(geri.geriAlindi).toBe(true);

    const d = new KayitDeposu(join(s.calisma, 'kayit.json'));
    await d.yukle();
    expect(d.al(bulanik.anahtar)).toMatchObject({ elleGrup: 'deniz', geriAlindi: true });
    expect(d.al(mavi.anahtar)?.geriAlindi).toBe(true);
  });

  it('elenmeyenleri hedef klasöre kopyalar ve ilerleme yollar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const hedef = join(s.kok, 'hedef');
    const r = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef });
    expect(r).toEqual({ kopyalanan: 2, atlanan: 0, hatalar: [] });
    expect(await readdir(hedef)).toEqual(['Diğer']);
    expect(s.olaylar().filter((o) => o.tur === 'aktarim').at(-1)).toEqual({ tur: 'aktarim', bitti: 2, toplam: 2 });
  });

  it('model yüklenemezse hata bildirir, sonraki denemede yeniden yükler', async () => {
    let deneme = 0;
    const s = await hazirla(async () => {
      deneme++;
      if (deneme === 1) throw new Error('internet yok');
      return sahteModel;
    });
    await expect(s.iste({ tur: 'baslat', girdiler: [s.girdi] })).rejects.toThrow('internet yok');
    expect(s.olaylar()).toContainEqual({ tur: 'model', durum: 'hata', hata: 'internet yok' });
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    expect(deneme).toBe(2);
    expect(s.olaylar().at(-1)?.tur).toBe('bitti');
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör** — `npx vitest run tests/sunucu.test.ts` → FAIL (modül yok).

- [ ] **Step 3: Kodu yaz**

Dosya: `src/motor/sunucu.ts`
```ts
import sharp from 'sharp';
import { join } from 'node:path';
import { ayikla, yenidenPuanla } from './isci';
import { tara } from './tarayici';
import { KayitDeposu } from './kayit';
import { HAZIR_GRUPLAR, DIGER_ID, kullaniciGrubu } from './gruplar';
import { disariAktar, type AktarmaSonucu } from './disari-aktar';
import { arayuzIcin, type ArayuzMedya, type ArayuzOlayi, type IsciIstegi, type IsciMesaji, type Sayim } from '../ortak/mesajlar';
import type { Grup, IslenmisMedya, SahneModeli } from './tipler';

export interface SunucuAyarlari {
  calismaKlasoru: string;
  modelYukle: () => Promise<SahneModeli>;
  cevir: (metin: string) => Promise<string>;
  gonder: (m: IsciMesaji) => void;
}

function hataMetni(h: unknown): string {
  return h instanceof Error ? h.message : String(h);
}

/** İşçi sürecin beyni: istekleri işler, motor olaylarını arayüze uygun hâle getirip yollar. */
export function sunucuOlustur(a: SunucuAyarlari) {
  const kayitYolu = join(a.calismaKlasoru, 'kayit.json');
  const renkler = new Map<string, string>();
  let modelSozu: Promise<SahneModeli> | null = null;
  let durdurucu: AbortController | null = null;
  let son: IslenmisMedya[] = [];

  const olay = (o: ArayuzOlayi) => a.gonder({ tur: 'olay', olay: o });

  function model(): Promise<SahneModeli> {
    if (!modelSozu) {
      olay({ tur: 'model', durum: 'yukleniyor' });
      modelSozu = a.modelYukle().then(
        (m) => {
          olay({ tur: 'model', durum: 'hazir', cihaz: m.cihaz });
          return m;
        },
        (h: unknown) => {
          modelSozu = null;
          olay({ tur: 'model', durum: 'hata', hata: hataMetni(h) });
          throw h;
        },
      );
    }
    return modelSozu;
  }

  /** Kartın rengi: küçük resmin baskın rengi. */
  async function renk(m: IslenmisMedya): Promise<string> {
    let r = renkler.get(m.anahtar);
    if (!r) {
      try {
        const { dominant } = await sharp(m.onizlemeler[0]).stats();
        r = '#' + [dominant.r, dominant.g, dominant.b].map((x) => x.toString(16).padStart(2, '0')).join('');
      } catch {
        r = '#808080';
      }
      renkler.set(m.anahtar, r);
    }
    return r;
  }
  const disa = async (m: IslenmisMedya): Promise<ArayuzMedya> => arayuzIcin(m, await renk(m));
  const disaListe = (l: IslenmisMedya[]) => Promise.all(l.map(disa));

  async function kayitAc(): Promise<KayitDeposu> {
    const k = new KayitDeposu(kayitYolu);
    await k.yukle();
    return k;
  }

  async function gruplar(): Promise<Grup[]> {
    return [...HAZIR_GRUPLAR, ...(await kayitAc()).veri.kullaniciGruplari];
  }

  /** Bir kaydı hem dosyada hem bellekteki son sonuçta değiştirir. */
  async function degistir(anahtar: string, f: (m: IslenmisMedya) => void): Promise<ArayuzMedya> {
    const k = await kayitAc();
    const m = k.al(anahtar);
    if (!m) throw new Error('Dosya kayıtta bulunamadı');
    f(m);
    await k.kaydet();
    const bellek = son.find((x) => x.anahtar === anahtar);
    if (bellek) f(bellek);
    return disa(bellek ?? m);
  }

  async function baslat(girdiler: string[]): Promise<{ adet: number; durduruldu: boolean }> {
    const md = await model();
    const durdur = new AbortController();
    durdurucu = durdur;
    let zincir: Promise<void> = Promise.resolve();
    const sirala = (f: () => Promise<void> | void) => {
      zincir = zincir.then(f);
    };
    const sonuc = await ayikla({
      girdiler,
      calismaKlasoru: a.calismaKlasoru,
      gruplar: await gruplar(),
      model: md,
      durdur: durdur.signal,
      olay: (o) => {
        if (o.tur === 'dosya') {
          sirala(async () => olay({ tur: 'dosya', medya: await disa(o.medya), sira: o.sira, toplam: o.toplam }));
        } else if (o.tur !== 'bitti') {
          sirala(() => olay(o));
        }
      },
    });
    await zincir;
    son = sonuc;
    durdurucu = null;
    const durduruldu = durdur.signal.aborted;
    const k = await kayitAc();
    k.arsivEkle({
      girdiler,
      tarih: new Date().toISOString(),
      foto: sonuc.filter((m) => m.tur === 'foto').length,
      video: sonuc.filter((m) => m.tur === 'video').length,
    });
    await k.kaydet();
    olay({ tur: 'bitti', sonuc: await disaListe(sonuc), durduruldu });
    return { adet: sonuc.length, durduruldu };
  }

  async function aktar(hedef: string): Promise<AktarmaSonucu> {
    const gs = await gruplar();
    const ad = (id: string) => gs.find((g) => g.id === id)?.ad ?? (id === DIGER_ID ? 'Diğer' : id);
    const ogeler = son.filter((m) => !m.eleme).map((m) => ({ yol: m.yol, grupAdi: ad(m.grupId), tarih: m.tarih }));
    return disariAktar(ogeler, hedef, (bitti, toplam) => {
      if (bitti === toplam || bitti % 10 === 0) olay({ tur: 'aktarim', bitti, toplam });
    });
  }

  async function calistir(i: IsciIstegi): Promise<unknown> {
    switch (i.tur) {
      case 'say': {
        void model().catch(() => {}); // kullanıcı "Ayıkla"ya basmadan model ısınsın
        const d = await tara(i.girdiler);
        const sayim: Sayim = { foto: d.filter((x) => x.tur === 'foto').length, video: d.filter((x) => x.tur === 'video').length };
        return sayim;
      }
      case 'baslat':
        return baslat(i.girdiler);
      case 'durdur':
        durdurucu?.abort();
        return true;
      case 'gruplar':
        return gruplar();
      case 'grupEkle': {
        const ad = i.ad.trim();
        if (!ad) throw new Error('Grup adı boş olamaz');
        const g = kullaniciGrubu(ad, await a.cevir(ad));
        const k = await kayitAc();
        k.veri.kullaniciGruplari = [...k.veri.kullaniciGruplari.filter((x) => x.id !== g.id), g];
        await k.kaydet();
        await yenidenPuanla(son, await gruplar(), await model());
        return { grup: g, sonuc: await disaListe(son) };
      }
      case 'grupTasi': {
        const grupId = i.grupId;
        return degistir(i.anahtar, (m) => {
          m.elleGrup = grupId;
          m.grupId = grupId;
          if (m.eleme) {
            m.eleme = null;
            m.geriAlindi = true;
          }
        });
      }
      case 'geriAl':
        return degistir(i.anahtar, (m) => {
          m.eleme = null;
          m.geriAlindi = true;
        });
      case 'sonArsivler':
        return (await kayitAc()).veri.sonArsivler ?? [];
      case 'aktar':
        return aktar(i.hedef);
    }
  }

  return {
    async isle(i: IsciIstegi): Promise<void> {
      try {
        a.gonder({ tur: 'cevap', cevap: { id: i.id, tamam: true, veri: await calistir(i) } });
      } catch (h) {
        a.gonder({ tur: 'cevap', cevap: { id: i.id, tamam: false, hata: hataMetni(h) } });
      }
    },
  };
}
```

- [ ] **Step 4: Geçtiğini gör** — `npx vitest run tests/sunucu.test.ts` → PASS (6). `npm test`, `npm run tip` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/motor/sunucu.ts tests/sunucu.test.ts
git commit -m "feat(motor): işçi sunucusu — istekler, olay akışı, grup ekleme, taşıma, aktarma"
```

---

### Task 5: Ana süreç yardımcıları (adresler, başlangıç klasörü, simge dosyası)

**Files:**
- Create: `src/ana/yollar.ts`, `src/ana/ico.ts`
- Test: `tests/yollar.test.ts`, `tests/ico.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

Dosya: `tests/yollar.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { adresCoz, onizlemeYolu, baslangicKlasoru } from '../src/ana/yollar';

const ad40 = 'a'.repeat(40);

describe('yollar', () => {
  it('küçük resim adresini çözer', () => {
    expect(adresCoz(`ayikla://onizleme/${ad40}.jpg`)).toEqual({ tur: 'onizleme', ad: `${ad40}.jpg` });
    expect(adresCoz(`ayikla://onizleme/${ad40}-2.jpg`)).toEqual({ tur: 'onizleme', ad: `${ad40}-2.jpg` });
  });

  it('klasör dışına çıkmaya çalışan adresleri reddeder', () => {
    expect(adresCoz('ayikla://onizleme/..%5C..%5Cwindows%5Cwin.ini')).toBeNull();
    expect(adresCoz('ayikla://onizleme/../kayit.json')).toBeNull();
    expect(onizlemeYolu('C:/k', '../x.jpg')).toBeNull();
  });

  it('orijinal dosya adresindeki yolu aynen geri verir', () => {
    const yol = 'C:\\Users\\x\\Düğün Ğ\\a b.jpg';
    expect(adresCoz('ayikla://dosya/' + encodeURIComponent(yol))).toEqual({ tur: 'dosya', yol });
  });

  it('başka şemaları reddeder', () => {
    expect(adresCoz('https://ornek.com/a.jpg')).toBeNull();
    expect(adresCoz('bozuk adres')).toBeNull();
  });

  it('küçük resim yolunu çalışma klasöründe kurar', () => {
    expect(onizlemeYolu('C:/k', `${ad40}-1.jpg`)).toBe(join('C:/k', `${ad40}-1.jpg`));
  });

  it('komut satırındaki (kısayola bırakılan) klasörü bulur, uygulama klasörünü atlar', () => {
    const varMi = (y: string) => y === 'D:\\Fotolar';
    expect(baslangicKlasoru(['electron.exe', 'C:\\AYIKLA', 'D:\\Fotolar'], 'C:\\AYIKLA', varMi)).toBe('D:\\Fotolar');
    expect(baslangicKlasoru(['electron.exe', 'C:\\AYIKLA'], 'C:\\AYIKLA', () => true)).toBeNull();
    expect(baslangicKlasoru(['electron.exe', '.', '--inspect'], process.cwd(), () => true)).toBeNull();
  });
});
```

Dosya: `tests/ico.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { icoYap } from '../src/ana/ico';

describe('ico', () => {
  it('PNG’yi tek resimli ico başlığıyla sarar', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const ico = icoYap(png, 256);
    expect(ico.length).toBe(22 + png.length);
    expect(ico.readUInt16LE(2)).toBe(1); // tür: simge
    expect(ico.readUInt16LE(4)).toBe(1); // resim sayısı
    expect(ico[6]).toBe(0); // 256 → 0
    expect(ico.readUInt32LE(14)).toBe(png.length);
    expect(ico.readUInt32LE(18)).toBe(22);
    expect(ico.subarray(22).equals(png)).toBe(true);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör** — `npx vitest run tests/yollar.test.ts tests/ico.test.ts` → FAIL (modül yok).

- [ ] **Step 3: Kodu yaz**

Dosya: `src/ana/yollar.ts`
```ts
import { join, resolve } from 'node:path';

export type AdresIstegi = { tur: 'onizleme'; ad: string } | { tur: 'dosya'; yol: string };

const ONIZLEME_ADI = /^[0-9a-f]{40}(-\d)?\.jpg$/;

/** ayikla://onizleme/<ad> ve ayikla://dosya/<kodlanmış yol> adreslerini çözer; başka her şey null. */
export function adresCoz(adres: string): AdresIstegi | null {
  let u: URL;
  try {
    u = new URL(adres);
  } catch {
    return null;
  }
  if (u.protocol !== 'ayikla:') return null;
  let parca: string;
  try {
    parca = decodeURIComponent(u.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
  if (u.hostname === 'onizleme' && ONIZLEME_ADI.test(parca)) return { tur: 'onizleme', ad: parca };
  if (u.hostname === 'dosya' && parca) return { tur: 'dosya', yol: parca };
  return null;
}

export function onizlemeYolu(kok: string, ad: string): string | null {
  return ONIZLEME_ADI.test(ad) ? join(kok, ad) : null;
}

/** Komut satırında (ör. kısayolun üstüne bırakılan) bir klasör varsa onu döndürür. */
export function baslangicKlasoru(argv: string[], uygulamaYolu: string, klasorMu: (yol: string) => boolean): string | null {
  const uygulama = resolve(uygulamaYolu).toLowerCase();
  for (const arg of argv.slice(1).reverse()) {
    if (arg.startsWith('-')) continue;
    if (resolve(arg).toLowerCase() === uygulama) continue;
    if (klasorMu(arg)) return arg;
  }
  return null;
}
```

Dosya: `src/ana/ico.ts`
```ts
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
```

- [ ] **Step 4: Geçtiğini gör** — iki test dosyası PASS; `npm run tip` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/ana/yollar.ts src/ana/ico.ts tests/yollar.test.ts tests/ico.test.ts
git commit -m "feat(ana): güvenli ayikla:// adresleri, başlangıç klasörü ve ico üretici"
```

---

### Task 6: Arayüz mantığı (biçim, gruplama, yerleşim, kalan süre)

**Files:**
- Create: `src/arayuz/mantik/bicim.ts`, `src/arayuz/mantik/gruplama.ts`, `src/arayuz/mantik/duzen.ts`, `src/arayuz/mantik/zaman.ts`
- Test: `tests/bicim.test.ts`, `tests/gruplama.test.ts`, `tests/duzen.test.ts`, `tests/zaman.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

Dosya: `tests/bicim.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { sayi, bulunduMetni, sureMetni, ayAdi, sonParca, onizlemeAdresi, dosyaAdresi, hataMetni, elemeAdi, tarihMetni } from '../src/arayuz/mantik/bicim';

describe('bicim', () => {
  it('sayıları Türkçe biçimler', () => {
    expect(sayi(1240)).toBe('1.240');
    expect(sayi(7)).toBe('7');
  });

  it('bulunan dosya metni', () => {
    expect(bulunduMetni({ foto: 1240, video: 86 })).toBe('1.240 fotoğraf · 86 video bulundu');
    expect(bulunduMetni({ foto: 3, video: 0 })).toBe('3 fotoğraf bulundu');
    expect(bulunduMetni({ foto: 0, video: 2 })).toBe('2 video bulundu');
    expect(bulunduMetni({ foto: 0, video: 0 })).toBe('Desteklenen fotoğraf veya video bulunamadı');
  });

  it('kalan süre metni', () => {
    expect(sureMetni(null)).toBe('—');
    expect(sureMetni(0.2)).toBe('1 sn');
    expect(sureMetni(42)).toBe('42 sn');
    expect(sureMetni(150)).toBe('3 dk');
    expect(sureMetni(3 * 3600 + 600)).toBe('3 sa 10 dk');
  });

  it('ay adları, tarih ve eleme nedenleri', () => {
    expect(ayAdi(8)).toBe('Ağustos');
    expect(tarihMetni(new Date(2026, 10, 1).toISOString())).toBe('1 Kasım 2026');
    expect(elemeAdi('kopya')).toBe('Kopya');
    expect(elemeAdi('bulanik')).toBe('Bulanık');
    expect(elemeAdi('karanlik')).toBe('Karanlık');
  });

  it('yolun son parçası', () => {
    expect(sonParca('C:\\a\\b\\Foto.jpg')).toBe('Foto.jpg');
    expect(sonParca('D:\\Fotolar\\')).toBe('Fotolar');
    expect(sonParca('/home/x/y.png')).toBe('y.png');
  });

  it('ayikla:// adresleri', () => {
    expect(onizlemeAdresi('C:\\Users\\x\\.ayikla\\onizleme\\abc.jpg')).toBe('ayikla://onizleme/abc.jpg');
    const yol = 'C:\\a b\\ç.jpg';
    expect(dosyaAdresi(yol)).toBe('ayikla://dosya/' + encodeURIComponent(yol));
  });

  it('Electron hata önekini temizler', () => {
    expect(hataMetni(new Error("Error invoking remote method 'istek': Error: Model yok"))).toBe('Model yok');
    expect(hataMetni('düz metin')).toBe('düz metin');
  });
});
```

Dosya: `tests/gruplama.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { yilAyGrupla, duzlestir, grupMenusu, menuAnahtari, grupAdiBul, ELENECEK_ID } from '../src/arayuz/mantik/gruplama';
import type { ArayuzMedya } from '../src/ortak/mesajlar';
import type { ElemeNedeni, Grup } from '../src/motor/tipler';

const m = (anahtar: string, tarih: Date, grupId = 'deniz', eleme: ElemeNedeni | null = null): ArayuzMedya => ({
  anahtar, yol: `C:/${anahtar}.jpg`, tur: 'foto', boyut: 1, degisme: 1, tarih: tarih.toISOString(),
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: [], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0', grupId, eleme, renk: '#000000',
});

const d = new Date(2024, 7, 12);

describe('gruplama', () => {
  it('yıl ve ayları yeniden eskiye, ay içini çekim sırasına göre dizer', () => {
    const b = yilAyGrupla([m('c', new Date(2023, 0, 5)), m('b', new Date(2024, 7, 20)), m('a', new Date(2024, 7, 3)), m('d', new Date(2024, 1, 1))]);
    expect(b.map((y) => y.yil)).toEqual([2024, 2023]);
    expect(b[0].aylar.map((a) => a.ay)).toEqual([8, 2]);
    expect(b[0].aylar[0].medya.map((x) => x.anahtar)).toEqual(['a', 'b']);
    expect(duzlestir(b).map((x) => x.anahtar)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('elenen dosya menüde Elenecekler’e düşer', () => {
    expect(menuAnahtari(m('x', d, 'deniz', 'kopya'))).toBe(ELENECEK_ID);
    expect(menuAnahtari(m('x', d, 'deniz'))).toBe('deniz');
  });

  it('menü: dolu gruplar adetle sıralı, kullanıcı grubu boşken de görünür, sonda Diğer ve Elenecekler', () => {
    const gruplar: Grup[] = [
      { id: 'deniz', ad: 'Deniz', tarifler: [] },
      { id: 'orman', ad: 'Orman', tarifler: [] },
      { id: 'sehir', ad: 'Şehir', tarifler: [] },
      { id: 'k-araba', ad: 'Araba', tarifler: [], kullanici: true },
    ];
    const liste = [m('1', d, 'orman'), m('2', d, 'deniz'), m('3', d, 'deniz'), m('4', d, 'diger'), m('5', d, 'deniz', 'kopya')];
    expect(grupMenusu(gruplar, liste)).toEqual([
      { id: 'deniz', ad: 'Deniz', adet: 2 },
      { id: 'orman', ad: 'Orman', adet: 1 },
      { id: 'k-araba', ad: 'Araba', adet: 0 },
      { id: 'diger', ad: 'Diğer', adet: 1, ozel: 'diger' },
      { id: 'elenecek', ad: 'Elenecekler', adet: 1, ozel: 'elenecek' },
    ]);
  });

  it('grup adını bulur', () => {
    const gruplar: Grup[] = [{ id: 'deniz', ad: 'Deniz / Plaj', tarifler: [] }];
    expect(grupAdiBul(gruplar, 'deniz')).toBe('Deniz / Plaj');
    expect(grupAdiBul(gruplar, 'diger')).toBe('Diğer');
    expect(grupAdiBul(gruplar, ELENECEK_ID)).toBe('Elenecekler');
    expect(grupAdiBul(gruplar, 'k-silinmis')).toBe('k-silinmis');
  });
});
```

Dosya: `tests/duzen.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { grupMerkezi, ELENECEK_KOSESI, yiginKonumu, kumeKonumu, yuzde, etiketBoyu, type Nokta } from '../src/arayuz/mantik/duzen';

const uzaklik = (a: Nokta, b: Nokta) => Math.hypot(a.x - b.x, a.y - b.y);
const EN = 1.6;

describe('duzen', () => {
  it('grup merkezleri birbirinden ayrı ve ekranın içinde', () => {
    for (const n of [1, 5, 11, 14]) {
      const p = Array.from({ length: n }, (_, i) => grupMerkezi(i, n, EN));
      for (const q of p) {
        expect(Math.abs(q.x)).toBeLessThan(10 * EN - 1.5);
        expect(Math.abs(q.y)).toBeLessThan(10 - 1.5);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(uzaklik(p[i], p[j])).toBeGreaterThan(1.5);
    }
  });

  it('ilk grup üstte ortada', () => {
    const p = grupMerkezi(0, 4, EN);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeGreaterThan(5);
  });

  it('elenecek köşesi sağ altta ve hiçbir grup merkezine yakın değil', () => {
    const k = ELENECEK_KOSESI(EN);
    expect(k.x).toBeGreaterThan(0);
    expect(k.y).toBeLessThan(0);
    for (let i = 0; i < 11; i++) expect(uzaklik(k, grupMerkezi(i, 11, EN))).toBeGreaterThan(2.5);
  });

  it('yığın merkezde, grup halkasının içinde kalır', () => {
    for (let i = 0; i < 2000; i += 37) {
      const p = yiginKonumu(i, 2000, 1.3);
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(3.01);
    }
  });

  it('küme ilk kartı merkezde, sonra yayılır ama dağılmaz', () => {
    const m = { x: 3, y: -2 };
    expect(kumeKonumu(m, 0)).toEqual(m);
    for (const k of [1, 50, 299, 5000]) expect(uzaklik(kumeKonumu(m, k), m)).toBeLessThanOrEqual(2.1);
    expect(uzaklik(kumeKonumu(m, 1), kumeKonumu(m, 2))).toBeGreaterThan(0.05);
  });

  it('yüzde: merkez %50, sol üst köşe %0', () => {
    expect(yuzde({ x: 0, y: 0 }, EN)).toEqual({ sol: 50, ust: 50 });
    expect(yuzde({ x: -10 * EN, y: 10 }, EN)).toEqual({ sol: 0, ust: 0 });
  });

  it('etiket büyüklüğü adetle artar ama sınırlı', () => {
    expect(etiketBoyu(1)).toBeLessThan(etiketBoyu(100));
    expect(etiketBoyu(100000)).toBeLessThanOrEqual(28);
  });
});
```

Dosya: `tests/zaman.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { HizOlcer } from '../src/arayuz/mantik/zaman';

describe('HizOlcer', () => {
  it('yeterli veri yoksa tahmin vermez', () => {
    const h = new HizOlcer();
    h.ekle(0);
    h.ekle(1000);
    expect(h.kalan(10)).toBeNull();
  });

  it('son dosyaların hızından kalan süreyi hesaplar', () => {
    const h = new HizOlcer();
    for (const t of [0, 1000, 2000, 3000]) h.ekle(t);
    expect(h.kalan(10)).toBeCloseTo(10);
  });

  it('yalnızca son pencereyi dikkate alır', () => {
    const h = new HizOlcer(3);
    for (const t of [0, 10000, 10500, 11000]) h.ekle(t);
    expect(h.kalan(4)).toBeCloseTo(2);
  });
});
```

- [ ] **Step 2: Başarısız olduğunu gör** — `npx vitest run tests/bicim.test.ts tests/gruplama.test.ts tests/duzen.test.ts tests/zaman.test.ts` → FAIL (modüller yok).

- [ ] **Step 3: Kodu yaz**

Dosya: `src/arayuz/mantik/bicim.ts`
```ts
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
```

Dosya: `src/arayuz/mantik/gruplama.ts`
```ts
import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

export const ELENECEK_ID = 'elenecek';

export function menuAnahtari(m: Pick<ArayuzMedya, 'eleme' | 'grupId'>): string {
  return m.eleme ? ELENECEK_ID : m.grupId;
}

export interface MenuOgesi {
  id: string;
  ad: string;
  adet: number;
  ozel?: 'diger' | 'elenecek';
}

/** Sol menü: dolu gruplar (çoktan aza), kullanıcı grupları (boş olsa da), sonra Diğer ve Elenecekler. */
export function grupMenusu(gruplar: Grup[], medya: ArayuzMedya[]): MenuOgesi[] {
  const say = new Map<string, number>();
  for (const m of medya) {
    const a = menuAnahtari(m);
    say.set(a, (say.get(a) ?? 0) + 1);
  }
  const normal = gruplar
    .map((g) => ({ id: g.id, ad: g.ad, adet: say.get(g.id) ?? 0, kullanici: g.kullanici }))
    .filter((g) => g.adet > 0 || g.kullanici)
    .sort((a, b) => b.adet - a.adet)
    .map(({ id, ad, adet }) => ({ id, ad, adet }));
  return [
    ...normal,
    { id: DIGER_ID, ad: 'Diğer', adet: say.get(DIGER_ID) ?? 0, ozel: 'diger' },
    { id: ELENECEK_ID, ad: 'Elenecekler', adet: say.get(ELENECEK_ID) ?? 0, ozel: 'elenecek' },
  ];
}

export function grupAdiBul(gruplar: Grup[], id: string): string {
  if (id === DIGER_ID) return 'Diğer';
  if (id === ELENECEK_ID) return 'Elenecekler';
  return gruplar.find((g) => g.id === id)?.ad ?? id;
}

export interface AyBolumu {
  ay: number;
  medya: ArayuzMedya[];
}
export interface YilBolumu {
  yil: number;
  aylar: AyBolumu[];
}

/** Yıl › Ay bölümleri: en yeni yıl ve ay başta; ay içinde çekim sırasına göre. */
export function yilAyGrupla(liste: ArayuzMedya[]): YilBolumu[] {
  const yillar = new Map<number, Map<number, ArayuzMedya[]>>();
  for (const m of liste) {
    const t = new Date(m.tarih);
    const y = t.getFullYear();
    const a = t.getMonth() + 1;
    if (!yillar.has(y)) yillar.set(y, new Map());
    const aylar = yillar.get(y)!;
    if (!aylar.has(a)) aylar.set(a, []);
    aylar.get(a)!.push(m);
  }
  return [...yillar]
    .sort((p, q) => q[0] - p[0])
    .map(([yil, aylar]) => ({
      yil,
      aylar: [...aylar]
        .sort((p, q) => q[0] - p[0])
        .map(([ay, medya]) => ({ ay, medya: [...medya].sort((p, q) => p.tarih.localeCompare(q.tarih)) })),
    }));
}

/** Izgarada görünen sıra (büyük görünümde ok tuşları bu sırayla gezer). */
export function duzlestir(b: YilBolumu[]): ArayuzMedya[] {
  return b.flatMap((y) => y.aylar.flatMap((a) => a.medya));
}
```

Dosya: `src/arayuz/mantik/duzen.ts`
```ts
/**
 * Ayıklama sahnesinin yerleşimi. Dünya koordinatları: y ∈ [-10, 10], x ∈ [-10·en, 10·en]
 * (en = ekran genişliği / yüksekliği). Ortada dönen yığın, çevresinde bir elips üzerinde grup bölgeleri,
 * sağ altta Elenecekler köşesi.
 */
export interface Nokta {
  x: number;
  y: number;
}

const ALTIN_ACI = 2.399963; // radyan; kartlar üst üste binmeden sarmal dizilir

export function grupMerkezi(i: number, n: number, en: number): Nokta {
  const aci = Math.PI / 2 - (2 * Math.PI * i) / Math.max(n, 1); // üstten başlar, saat yönünde
  return { x: Math.cos(aci) * 7 * en, y: Math.sin(aci) * 5.8 };
}

export function ELENECEK_KOSESI(en: number): Nokta {
  return { x: 8.4 * en, y: -8.2 };
}

/** Yığındaki i. kartın yeri: merkezde, `aci` ile dönen bir sarmal. z: derinlik (0–1). */
export function yiginKonumu(i: number, toplam: number, aci: number): Nokta & { z: number } {
  const t = toplam <= 1 ? 0 : i / (toplam - 1);
  const r = 0.4 + 2.6 * Math.sqrt(t);
  const a = aci + i * ALTIN_ACI;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: t };
}

/** Grubuna ulaşan k. kartın yeri: grup merkezinin çevresinde sıkı bir sarmal küme (300 karttan sonra üst üste biner). */
export function kumeKonumu(merkez: Nokta, k: number): Nokta {
  const j = k % 300;
  const r = 0.12 * Math.sqrt(j);
  const a = j * ALTIN_ACI;
  return { x: merkez.x + Math.cos(a) * r, y: merkez.y + Math.sin(a) * r };
}

/** Dünya noktasını ekranda yüzde konuma çevirir (HTML etiketleri için). */
export function yuzde(n: Nokta, en: number): { sol: number; ust: number } {
  return { sol: ((n.x / (10 * en) + 1) / 2) * 100, ust: ((1 - n.y / 10) / 2) * 100 };
}

/** Grup etiketinin yazı boyu (px): grup büyüdükçe büyür. */
export function etiketBoyu(adet: number): number {
  return 13 + Math.min(15, Math.sqrt(adet) * 1.1);
}
```

Dosya: `src/arayuz/mantik/zaman.ts`
```ts
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
```

- [ ] **Step 4: Geçtiğini gör** — dört test dosyası PASS; `npm test`, `npm run tip` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/arayuz/mantik tests/bicim.test.ts tests/gruplama.test.ts tests/duzen.test.ts tests/zaman.test.ts
git commit -m "feat(arayuz): biçim, gruplama, sahne yerleşimi ve kalan süre hesapları"
```

---

### Task 7: Electron kabuğu (ana süreç, önyükleme, işçi girişi, derleme, simge)

**Files:**
- Create: `src/isci-giris.ts`, `src/ana/ana.ts`, `src/ana/onyukle.ts`, `scripts/derle.mjs`, `scripts/simge.ts`, `src/arayuz/index.html`, `src/arayuz/main.tsx`, `src/arayuz/api.ts`, `src/arayuz/App.tsx` ve `src/arayuz/stil.css` (ikisi geçici; Task 8'de tamamlanır)
- Create (üretilen): `simge/ayikla.png`, `simge/ayikla.ico`

Bu görevde birim testi yok (Electron'a bağlı ince katman; mantığı Task 4–6'da test edildi). Doğrulama: derleme + pencerenin açılıp işçiyle konuştuğunu görmek.

- [ ] **Step 1: İşçi girişi**

Dosya: `src/isci-giris.ts`
```ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { sunucuOlustur } from './motor/sunucu';
import { sahneModeliYukle, ingilizceyeCevir } from './motor/sahne-model';
import type { IsciIstegi } from './ortak/mesajlar';

const calisma = join(homedir(), '.ayikla');
const modeller = join(calisma, 'modeller');

const sunucu = sunucuOlustur({
  calismaKlasoru: calisma,
  modelYukle: () => sahneModeliYukle(modeller),
  cevir: (metin) => ingilizceyeCevir(metin, modeller),
  gonder: (m) => process.parentPort.postMessage(m),
});

process.parentPort.on('message', (e) => {
  void sunucu.isle(e.data as IsciIstegi);
});
```

- [ ] **Step 2: Önyükleme (arayüzün göreceği tek kapı)**

Dosya: `src/ana/onyukle.ts`
```ts
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ArayuzOlayi, Istek } from '../ortak/mesajlar';

const api = {
  istek: (i: Istek): Promise<unknown> => ipcRenderer.invoke('istek', i),
  klasorSec: (): Promise<string | null> => ipcRenderer.invoke('klasor-sec'),
  aktarSec: (): Promise<unknown> => ipcRenderer.invoke('aktar-sec'),
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
```

- [ ] **Step 3: Ana süreç**

Dosya: `src/ana/ana.ts`
```ts
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, screen, utilityProcess, type UtilityProcess } from 'electron';
import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { adresCoz, baslangicKlasoru, onizlemeYolu } from './yollar';
import type { ArayuzOlayi, IsciIstegi, IsciMesaji, Istek } from '../ortak/mesajlar';

protocol.registerSchemesAsPrivileged([
  { scheme: 'ayikla', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const ONIZLEME_KLASORU = join(homedir(), '.ayikla', 'onizleme');
/** Arayüzün işçiye doğrudan iletebileceği istekler. "aktar" yalnızca klasör seçme penceresinden sonra ana süreçten gider. */
const ARAYUZDEN_IZINLI = new Set<Istek['tur']>(['say', 'baslat', 'durdur', 'gruplar', 'grupEkle', 'grupTasi', 'geriAl', 'sonArsivler']);
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

  protocol.handle('ayikla', (istek) => {
    const c = adresCoz(istek.url);
    let yol: string | null = null;
    if (c?.tur === 'onizleme') yol = onizlemeYolu(ONIZLEME_KLASORU, c.ad);
    else if (c?.tur === 'dosya' && izinliDosyalar.has(c.yol)) yol = c.yol;
    if (!yol) return new Response('Bulunamadı', { status: 404 });
    return net.fetch(pathToFileURL(yol).toString(), { headers: istek.headers });
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
  ipcMain.handle('baslangic-klasoru', () => baslangicKlasoru(process.argv, app.getAppPath(), klasorMu));

  isciAc();
  pencereAc();
});

app.on('window-all-closed', () => {
  isci?.kill();
  app.quit();
});
```

- [ ] **Step 4: Arayüz iskeleti**

Dosya: `src/arayuz/index.html`
```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AYIKLA</title>
  </head>
  <body>
    <div id="kok"></div>
    <div class="gren" aria-hidden="true"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

Dosya: `src/arayuz/main.tsx`
```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './stil.css';

createRoot(document.getElementById('kok')!).render(<App />);
```

Dosya: `src/arayuz/api.ts`
```ts
import type { AyiklaApi } from '../ana/onyukle';
import type { ArayuzMedya, ArayuzOlayi, Sayim } from '../ortak/mesajlar';
import type { Grup, SonArsiv } from '../motor/tipler';
import type { AktarmaSonucu } from '../motor/disari-aktar';

declare global {
  interface Window {
    ayikla: AyiklaApi;
  }
}

const k = () => window.ayikla;

/** Arayüzün motorla konuştuğu tek yer: tipli sarmalayıcılar. */
export const api = {
  say: (girdiler: string[]) => k().istek({ tur: 'say', girdiler }) as Promise<Sayim>,
  baslat: (girdiler: string[]) => k().istek({ tur: 'baslat', girdiler }) as Promise<{ adet: number; durduruldu: boolean }>,
  durdur: () => k().istek({ tur: 'durdur' }),
  gruplar: () => k().istek({ tur: 'gruplar' }) as Promise<Grup[]>,
  grupEkle: (ad: string) => k().istek({ tur: 'grupEkle', ad }) as Promise<{ grup: Grup; sonuc: ArayuzMedya[] }>,
  grupTasi: (anahtar: string, grupId: string) => k().istek({ tur: 'grupTasi', anahtar, grupId }) as Promise<ArayuzMedya>,
  geriAl: (anahtar: string) => k().istek({ tur: 'geriAl', anahtar }) as Promise<ArayuzMedya>,
  sonArsivler: () => k().istek({ tur: 'sonArsivler' }) as Promise<SonArsiv[]>,
  aktarSec: () => k().aktarSec() as Promise<AktarmaSonucu | null>,
  klasorSec: () => k().klasorSec(),
  baslangicKlasoru: () => k().baslangicKlasoru(),
  yolAl: (f: File) => k().yolAl(f),
  olaylariDinle: (f: (o: ArayuzOlayi) => void) => k().olaylariDinle(f),
};
```

Geçici dosyalar (Task 8'de tam hâlleriyle değiştirilir):

Dosya: `src/arayuz/App.tsx`
```tsx
import { useEffect, useState } from 'react';
import { api } from './api';

export function App() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    api.gruplar().then((g) => setN(g.length)).catch(() => setN(-1));
  }, []);
  return <h1 style={{ color: '#e8c98a', fontFamily: 'Georgia', padding: 40 }}>AYIKLA · {n === null ? '…' : `${n} grup`}</h1>;
}
```

Dosya: `src/arayuz/stil.css`
```css
body { background: #0b0a09; margin: 0; }
```

- [ ] **Step 5: Derleme betiği**

Dosya: `scripts/derle.mjs`
```js
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { build as viteBuild } from 'vite';

const kok = resolve(import.meta.dirname, '..');
process.chdir(kok);
rmSync('dist', { recursive: true, force: true });

const ortak = { bundle: true, platform: 'node', target: 'node22', logLevel: 'warning' };
// Yerel (native) ve büyük paketler dışarıda kalır; node_modules'tan yüklenir.
const DISARIDA = ['electron', 'sharp', '@huggingface/transformers', 'onnxruntime-node', 'ffmpeg-static', 'ffprobe-static', 'heic-convert', 'exifr'];

await build({ ...ortak, entryPoints: ['src/ana/ana.ts'], outfile: 'dist/ana.cjs', format: 'cjs', external: ['electron'] });
await build({ ...ortak, entryPoints: ['src/ana/onyukle.ts'], outfile: 'dist/onyukle.cjs', format: 'cjs', external: ['electron'] });
await build({ ...ortak, entryPoints: ['src/isci-giris.ts'], outfile: 'dist/isci.mjs', format: 'esm', external: DISARIDA });
await viteBuild({ configFile: resolve(kok, 'vite.config.ts'), logLevel: 'warn' });
console.log('Derlendi: dist/');
```

- [ ] **Step 6: Simge**

Dosya: `scripts/simge.ts`
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { icoYap } from '../src/ana/ico';

const kok = resolve(import.meta.dirname, '..');
// Koyu zemin, altın çerçeve, dağınık kartların üstünde altın bir "A".
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dcaa"/><stop offset="1" stop-color="#c9a764"/></linearGradient></defs>
  <rect x="8" y="8" width="240" height="240" rx="56" fill="#0b0a09"/>
  <rect x="14" y="14" width="228" height="228" rx="50" fill="none" stroke="#e8c98a" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="58" y="132" width="62" height="46" rx="6" fill="#2a241b" transform="rotate(-14 89 155)"/>
  <rect x="138" y="138" width="62" height="46" rx="6" fill="#3a3123" transform="rotate(11 169 161)"/>
  <path fill="url(#g)" fill-rule="evenodd" d="M128 46 L200 210 L170 210 L155 172 L101 172 L86 210 L56 210 Z M128 96 L111 146 L145 146 Z"/>
</svg>`;

mkdirSync(resolve(kok, 'simge'), { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(resolve(kok, 'simge', 'ayikla.png'), png);
writeFileSync(resolve(kok, 'simge', 'ayikla.ico'), icoYap(png, 256));
console.log('simge/ayikla.png ve simge/ayikla.ico üretildi');
```

- [ ] **Step 7: Derle ve aç**

Run: `npm run simge` → `simge/` iki dosya.
Run: `npm run tip` → temiz. `npm run derle` → `Derlendi: dist/`.
Run: `npm run baslat`
Expected: koyu pencere, altın başlık "AYIKLA · 10 grup" (işçi çalışıyor ve cevap veriyor). Pencereyi kapat.

- [ ] **Step 8: Commit**

```bash
git add src/isci-giris.ts src/ana/ana.ts src/ana/onyukle.ts scripts/derle.mjs scripts/simge.ts src/arayuz/index.html src/arayuz/main.tsx src/arayuz/api.ts src/arayuz/App.tsx src/arayuz/stil.css simge
git commit -m "feat: Electron kabuğu — ana süreç, işçi süreç, ayikla:// adresleri, derleme ve simge"
```

---

### Task 8: Görünüm (sinematik koyu stil) ve uygulama iskeleti

**Files:**
- Modify: `src/arayuz/stil.css`, `src/arayuz/App.tsx`

- [ ] **Step 1: Stil**

Dosya: `src/arayuz/stil.css`
```css
:root {
  --zemin: #0b0a09;
  --yuzey: #17140f;
  --yuzey2: #1f1b15;
  --cizgi: rgba(232, 201, 138, 0.16);
  --cizgi-guclu: rgba(232, 201, 138, 0.42);
  --altin: #e8c98a;
  --altin-parlak: #f3dcaa;
  --altin-koyu: #a8894f;
  --metin: #efe8da;
  --soluk: #9b9283;
  --cok-soluk: #6b645a;
  --kirmizi: #e38b74;
  --serif: 'Cormorant Garamond', Georgia, Cambria, serif;
  --sans: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  --egri: cubic-bezier(0.22, 1, 0.36, 1);
  color-scheme: dark;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #kok { height: 100%; }
body {
  background: radial-gradient(ellipse at 50% 38%, #1b1712 0%, var(--zemin) 62%);
  color: var(--metin);
  font-family: var(--sans);
  font-size: 14px;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 99;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55));
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: default; }

/* Film greni */
.gren {
  pointer-events: none;
  position: fixed;
  inset: -50%;
  z-index: 100;
  opacity: 0.07;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  animation: gren 0.9s steps(6) infinite;
}
@keyframes gren {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-3%, 2%); }
  40% { transform: translate(2%, -4%); }
  60% { transform: translate(-4%, -1%); }
  80% { transform: translate(3%, 3%); }
  100% { transform: translate(0, 0); }
}

.ekran { position: absolute; inset: 0; }
.soluk { color: var(--soluk); }
.hata { color: var(--kirmizi); }

.altin {
  background: linear-gradient(180deg, var(--altin-parlak), var(--altin) 55%, #d4b26f);
  color: #1a140a;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 12px 34px;
  border-radius: 999px;
  box-shadow: 0 10px 40px -10px rgba(232, 201, 138, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.ikincil {
  border: 1px solid var(--cizgi-guclu);
  color: var(--altin);
  padding: 9px 22px;
  border-radius: 999px;
  transition: background 0.3s;
}
.ikincil:hover:not(:disabled) { background: rgba(232, 201, 138, 0.08); }
.metin-dugme { color: var(--soluk); font-size: 12px; transition: color 0.2s; }
.metin-dugme:hover { color: var(--altin); }

/* ---------- Karşılama ---------- */
.karsilama {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  padding: 6vh 6vw 4vh;
  gap: 4vh;
}
.marka { text-align: center; }
.marka h1 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(48px, 7vw, 92px);
  letter-spacing: 0.32em;
  margin-right: -0.32em;
  color: var(--altin);
  text-shadow: 0 0 60px rgba(232, 201, 138, 0.25);
}
.marka p { color: var(--soluk); letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; margin-top: 10px; }
.birakma {
  width: min(760px, 100%);
  align-self: stretch;
  max-height: 440px;
  border: 1px dashed var(--cizgi-guclu);
  border-radius: 28px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.015), rgba(255, 255, 255, 0));
  transition: border-color 0.4s var(--egri), background 0.4s, transform 0.4s var(--egri);
}
.birakma.ustunde { border-color: var(--altin); background: rgba(232, 201, 138, 0.06); transform: scale(1.015); }
.birakma-ic { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 32px; }
.deste { position: relative; width: 90px; height: 66px; margin-bottom: 6px; }
.deste span { position: absolute; inset: 0; border-radius: 7px; border: 1px solid var(--cizgi-guclu); background: var(--yuzey2); }
.deste span:nth-child(1) { transform: rotate(-12deg) translate(-12px, 4px); }
.deste span:nth-child(2) { transform: rotate(8deg) translate(10px, 2px); }
.deste span:nth-child(3) { background: linear-gradient(135deg, #3a3124, #201b14); border-color: var(--altin-koyu); }
.birakma-baslik { font-family: var(--serif); font-size: 26px; }
.secim { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 8px; }
.secilen { color: var(--soluk); font-size: 13px; max-width: 560px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bulundu { font-family: var(--serif); font-size: 24px; color: var(--altin-parlak); }
.not { color: var(--altin); font-size: 13px; }
.son-arsivler { width: min(760px, 100%); }
.son-arsivler h2 { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--cok-soluk); font-weight: 600; margin-bottom: 10px; }
.son-arsivler ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.son-arsivler li button {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--cizgi);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(255, 255, 255, 0.015);
  transition: border-color 0.3s;
}
.son-arsivler li button:hover { border-color: var(--cizgi-guclu); }
.son-arsivler .ad { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.son-arsivler .soluk { font-size: 12px; }

/* ---------- Ayıklama ---------- */
.ayiklama { position: absolute; inset: 0; }
.ayiklama .sahne { position: absolute; inset: 0; }
.ust-serit { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 18px 26px; z-index: 5; }
.marka-kucuk { font-family: var(--serif); letter-spacing: 0.3em; color: var(--altin); font-size: 18px; }
.durum { color: var(--soluk); font-size: 13px; }
.sayaclar { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 5; }
.sayac { min-width: 132px; padding: 10px 16px; border: 1px solid var(--cizgi); border-radius: 14px; background: rgba(15, 13, 10, 0.72); backdrop-filter: blur(10px); }
.sayac .etiket { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cok-soluk); }
.sayac .deger { font-family: var(--serif); font-size: 26px; color: var(--metin); font-variant-numeric: tabular-nums; }
.sayac.vurgu .deger { color: var(--altin); }
.grup-etiketi {
  position: absolute;
  z-index: 4;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(11, 10, 9, 0.55);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.grup-etiketi .ad { font-family: var(--serif); color: var(--metin); line-height: 1.1; }
.grup-etiketi .adet { color: var(--altin); font-size: 12px; font-variant-numeric: tabular-nums; }
.grup-etiketi.elenecek .ad { color: var(--kirmizi); }
.simdiki {
  position: absolute;
  left: 26px;
  bottom: 26px;
  z-index: 5;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px 8px 8px;
  border: 1px solid var(--cizgi);
  border-radius: 14px;
  background: rgba(15, 13, 10, 0.72);
  backdrop-filter: blur(10px);
  max-width: 360px;
}
.simdiki img { width: 64px; height: 48px; object-fit: cover; border-radius: 8px; }
.simdiki .ad { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.simdiki .soluk { font-size: 12px; }
.model-uyari {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  text-align: center;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  padding: 28px;
  border: 1px solid var(--cizgi);
  border-radius: 20px;
  background: rgba(15, 13, 10, 0.9);
}

/* ---------- Sonuç ---------- */
.sonuc { position: absolute; inset: 0; display: grid; grid-template-columns: 260px 1fr; }
.yan { border-right: 1px solid var(--cizgi); background: rgba(10, 9, 8, 0.6); display: flex; flex-direction: column; padding: 20px 14px; gap: 14px; overflow-y: auto; }
.yan-ust { display: flex; align-items: center; justify-content: space-between; padding: 0 8px 10px; }
.yan nav { display: flex; flex-direction: column; gap: 2px; }
.grup { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; transition: background 0.25s; text-align: left; }
.grup:hover { background: rgba(255, 255, 255, 0.04); }
.grup.secili { background: linear-gradient(90deg, rgba(232, 201, 138, 0.16), rgba(232, 201, 138, 0.03)); color: var(--altin-parlak); }
.grup .adet { color: var(--cok-soluk); font-size: 12px; font-variant-numeric: tabular-nums; }
.grup.secili .adet { color: var(--altin); }
.grup.elenecek { color: #d9a796; }
.ayrac { height: 1px; background: var(--cizgi); margin: 10px 8px; }
.grup-ekle { color: var(--altin); text-align: left; padding: 9px 12px; border: 1px dashed var(--cizgi); border-radius: 10px; }
.grup-ekle-form input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--altin-koyu); background: var(--yuzey); color: var(--metin); font: inherit; outline: none; }
.icerik { overflow-y: auto; padding: 0 34px 60px; position: relative; }
.sonuc-ust { position: sticky; top: 0; z-index: 3; display: flex; justify-content: space-between; align-items: flex-end; padding: 26px 0 16px; background: linear-gradient(180deg, var(--zemin) 70%, transparent); }
.sonuc-ust h1 { font-family: var(--serif); font-weight: 400; font-size: 40px; }
.yil h2 { font-family: var(--serif); font-weight: 400; font-size: 30px; color: var(--altin); margin: 26px 0 6px; }
.ay h3 { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--soluk); font-weight: 600; margin: 16px 0 10px; }
.ay h3 .soluk { color: var(--cok-soluk); margin-left: 6px; }
.izgara { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.kare-kap { position: relative; }
.kare { display: block; width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; position: relative; outline: 1px solid transparent; transition: transform 0.35s var(--egri), outline-color 0.3s; }
.kare:hover { transform: scale(1.03); outline-color: var(--altin-koyu); z-index: 1; }
.kare img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rozet { position: absolute; font-size: 10px; padding: 2px 7px; border-radius: 999px; background: rgba(0, 0, 0, 0.65); }
.rozet.video { right: 6px; bottom: 6px; color: var(--altin); }
.rozet.eleme { left: 6px; top: 6px; color: #f0b3a1; }
.rozet.tahmini { right: 6px; top: 6px; color: var(--soluk); }
.geri-al { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 2; font-size: 11px; padding: 4px 12px; border-radius: 999px; background: rgba(232, 201, 138, 0.92); color: #1a140a; opacity: 0; transition: opacity 0.2s; }
.kare-kap:hover .geri-al { opacity: 1; }
.bos { color: var(--soluk); padding: 80px 0; text-align: center; font-family: var(--serif); font-size: 22px; }
.ilerleme { height: 3px; background: var(--cizgi); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
.ilerleme div { height: 100%; background: var(--altin); transition: width 0.3s; }
.bilgi { position: fixed; left: 50%; bottom: 26px; z-index: 20; padding: 11px 20px; border-radius: 999px; background: rgba(23, 20, 15, 0.95); border: 1px solid var(--cizgi-guclu); font-size: 13px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
.sag-menu { position: fixed; z-index: 30; min-width: 220px; max-height: 380px; overflow-y: auto; padding: 6px; border-radius: 12px; background: rgba(23, 20, 15, 0.98); border: 1px solid var(--cizgi-guclu); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6); display: flex; flex-direction: column; }
.sag-menu button { text-align: left; padding: 8px 12px; border-radius: 8px; }
.sag-menu button:hover { background: rgba(232, 201, 138, 0.1); }
.menu-baslik { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cok-soluk); padding: 8px 12px 4px; }

/* ---------- Büyük görünüm ---------- */
.buyuk { position: fixed; inset: 0; z-index: 40; background: rgba(5, 4, 3, 0.94); display: grid; place-items: center; }
.buyuk-ic { width: 86vw; height: 86vh; display: flex; flex-direction: column; gap: 12px; }
.buyuk-medya { flex: 1; min-height: 0; }
.buyuk-medya img, .buyuk-medya video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
.buyuk footer { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; }
.ok { position: fixed; top: 50%; transform: translateY(-50%); font-size: 46px; color: var(--altin); width: 56px; height: 96px; opacity: 0.55; transition: opacity 0.2s; }
.ok:hover { opacity: 1; }
.ok.sol { left: 10px; }
.ok.sag { right: 10px; }
.kapat { position: fixed; top: 16px; right: 22px; font-size: 20px; color: var(--soluk); }

::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-thumb { background: #2a251e; border-radius: 10px; border: 2px solid var(--zemin); }
```

- [ ] **Step 2: Uygulama iskeleti (ekran geçişleri)**

Dosya: `src/arayuz/App.tsx`
```tsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from './api';
import { Karsilama } from './ekranlar/Karsilama';
import { Ayiklama } from './ekranlar/Ayiklama';
import { Sonuc } from './ekranlar/Sonuc';
import type { ArayuzMedya, Sayim } from '../ortak/mesajlar';
import type { Grup } from '../motor/tipler';

type Ekran =
  | { ad: 'karsilama'; not?: string; girdiler?: string[] }
  | { ad: 'ayiklama'; girdiler: string[]; sayim: Sayim }
  | { ad: 'sonuc' };

export function App() {
  const [ekran, setEkran] = useState<Ekran>({ ad: 'karsilama' });
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [medya, setMedya] = useState<ArayuzMedya[]>([]);

  useEffect(() => {
    api.gruplar().then(setGruplar).catch(() => {});
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={ekran.ad}
        className="ekran"
        data-ekran={ekran.ad}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {ekran.ad === 'karsilama' && (
          <Karsilama not={ekran.not} onceki={ekran.girdiler} onBaslat={(girdiler, sayim) => setEkran({ ad: 'ayiklama', girdiler, sayim })} />
        )}
        {ekran.ad === 'ayiklama' && (
          <Ayiklama
            girdiler={ekran.girdiler}
            sayim={ekran.sayim}
            gruplar={gruplar}
            onBitti={(sonuc, durduruldu) => {
              setMedya(sonuc);
              if (durduruldu) {
                setEkran({ ad: 'karsilama', girdiler: ekran.girdiler, not: 'Durduruldu. Tekrar “Ayıkla”ya basınca kaldığı yerden sürer.' });
              } else {
                setEkran({ ad: 'sonuc' });
              }
            }}
          />
        )}
        {ekran.ad === 'sonuc' && (
          <Sonuc medya={medya} setMedya={setMedya} gruplar={gruplar} setGruplar={setGruplar} onYeni={() => setEkran({ ad: 'karsilama' })} />
        )}
      </motion.main>
    </AnimatePresence>
  );
}
```

`App.tsx` Task 9–11'deki ekranları içe aktardığı için tip kontrolü ve derleme o görevler bitince geçer. Bu yüzden Task 8, Task 9–11 ile **birlikte** commit'lenir (bkz. Task 11 Step 5).

---

### Task 9: Karşılama ekranı

**Files:**
- Create: `src/arayuz/ekranlar/Karsilama.tsx`

- [ ] **Step 1: Kodu yaz**

Dosya: `src/arayuz/ekranlar/Karsilama.tsx`
```tsx
import { useEffect, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { bulunduMetni, hataMetni, sayi, sonParca, tarihMetni } from '../mantik/bicim';
import type { Sayim } from '../../ortak/mesajlar';
import type { SonArsiv } from '../../motor/tipler';

interface Props {
  not?: string;
  onceki?: string[];
  onBaslat: (girdiler: string[], sayim: Sayim) => void;
}

export function Karsilama({ not, onceki, onBaslat }: Props) {
  const [girdiler, setGirdiler] = useState<string[] | null>(null);
  const [sayim, setSayim] = useState<Sayim | null>(null);
  const [sayiliyor, setSayiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [ustunde, setUstunde] = useState(false);
  const [arsivler, setArsivler] = useState<SonArsiv[]>([]);

  async function sec(g: string[]) {
    if (!g.length) return;
    setGirdiler(g);
    setSayim(null);
    setHata(null);
    setSayiliyor(true);
    try {
      setSayim(await api.say(g));
    } catch (h) {
      setHata(hataMetni(h));
    } finally {
      setSayiliyor(false);
    }
  }

  useEffect(() => {
    api.sonArsivler().then(setArsivler).catch(() => {});
    if (onceki?.length) void sec(onceki);
    else api.baslangicKlasoru().then((k) => k && sec([k])).catch(() => {});
  }, []);

  function birak(e: DragEvent) {
    e.preventDefault();
    setUstunde(false);
    const yollar = Array.from(e.dataTransfer.files).map((f) => api.yolAl(f)).filter(Boolean);
    void sec(yollar);
  }

  return (
    <div className="karsilama">
      <header className="marka">
        <h1>AYIKLA</h1>
        <p>Fotoğraflarını sahneye ve tarihe göre ayıkla</p>
      </header>

      <div
        className={`birakma${ustunde ? ' ustunde' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setUstunde(true);
        }}
        onDragLeave={() => setUstunde(false)}
        onDrop={birak}
      >
        <div className="birakma-ic">
          <div className="deste" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="birakma-baslik">Fotoğrafları veya klasörü buraya bırak</p>
          <button
            className="ikincil"
            onClick={async () => {
              const k = await api.klasorSec();
              if (k) void sec([k]);
            }}
          >
            Klasör seç
          </button>
          <AnimatePresence>
            {girdiler && (
              <motion.div className="secim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="secilen">{girdiler.map(sonParca).join(', ')}</p>
                {sayiliyor && <p className="soluk">Dosyalar sayılıyor…</p>}
                {sayim && <p className="bulundu">{bulunduMetni(sayim)}</p>}
                {sayim && sayim.foto + sayim.video > 0 && (
                  <motion.button
                    className="altin"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onBaslat(girdiler, sayim)}
                  >
                    Ayıkla
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {not && <p className="not">{not}</p>}
          {hata && <p className="hata">{hata}</p>}
        </div>
      </div>

      {arsivler.length > 0 ? (
        <section className="son-arsivler">
          <h2>Son arşivler</h2>
          <ul>
            {arsivler.map((a) => (
              <li key={a.girdiler.join('|')}>
                <button onClick={() => void sec(a.girdiler)}>
                  <span className="ad">{a.girdiler.map(sonParca).join(', ')}</span>
                  <span className="soluk">
                    {sayi(a.foto + a.video)} dosya · {tarihMetni(a.tarih)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div />
      )}
    </div>
  );
}
```

---

### Task 10: Dönen yığın ve Ayıklama ekranı

**Files:**
- Create: `src/arayuz/bilesenler/Yigin.tsx`, `src/arayuz/ekranlar/Ayiklama.tsx`

- [ ] **Step 1: Yığın (react-three-fiber, tek InstancedMesh)**

Dosya: `src/arayuz/bilesenler/Yigin.tsx`
```tsx
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, Object3D, type InstancedMesh } from 'three';
import { yiginKonumu, type Nokta } from '../mantik/duzen';

/** Bir kartın durumu. grup = null: hâlâ ortadaki yığında. */
export interface KartDurumu {
  grup: string | null;
  k: number; // grubundaki sırası (küme içindeki yeri)
  renk: Color;
  kalkis: number; // saniye (performance.now / 1000)
  basladi: boolean;
  x: number;
  y: number;
  bx: number;
  by: number;
}

export interface YiginVerisi {
  toplam: number;
  en: number;
  bitti: boolean;
  kartlar: KartDurumu[];
  hedef: (grup: string, k: number, en: number) => Nokta;
}

export function yeniKart(): KartDurumu {
  return { grup: null, k: 0, renk: new Color(), kalkis: 0, basladi: false, x: 0, y: 0, bx: 0, by: 0 };
}

const EN_FAZLA = 6000;
const UCUS = 1.1; // saniye
const YIGIN_RENGI = new Color('#4a4033');

function yumusak(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function Kartlar({ veri }: { veri: RefObject<YiginVerisi> }) {
  const mesh = useRef<InstancedMesh>(null);
  const kukla = useMemo(() => new Object3D(), []);
  const renk = useMemo(() => new Color(), []);
  const { size, camera } = useThree();

  useLayoutEffect(() => {
    camera.zoom = size.height / 20; // görünen yükseklik = 20 birim
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useFrame(() => {
    const m = mesh.current;
    const v = veri.current;
    if (!m || !v) return;
    const t = performance.now() / 1000;
    const n = Math.min(v.toplam, EN_FAZLA);
    m.count = n;
    const aci = t * 0.22;
    for (let i = 0; i < n; i++) {
      const k = v.kartlar[i];
      let x: number;
      let y: number;
      let z: number;
      let don: number;
      let olcek = 1;
      if (!k || !k.grup || t < k.kalkis) {
        // Yığında: altın açılı sarmal, yavaşça döner ve hafifçe dalgalanır
        const p = yiginKonumu(i, n, aci);
        x = p.x;
        y = p.y + Math.sin(t * 1.3 + i) * 0.05;
        z = p.z;
        don = aci * 0.5 + i * 0.7;
        if (k) {
          k.x = x;
          k.y = y;
        }
        renk.copy(YIGIN_RENGI).multiplyScalar(0.75 + (0.5 * ((i * 37) % 11)) / 11);
        if (v.bitti && !(k && k.grup)) olcek = 0; // okunamayanlar sonda kaybolur
      } else {
        if (!k.basladi) {
          k.basladi = true;
          k.bx = k.x;
          k.by = k.y;
        }
        const u = Math.min(1, (t - k.kalkis) / UCUS);
        const e = yumusak(u);
        const h = v.hedef(k.grup, k.k, v.en);
        const kavis = Math.sin(u * Math.PI);
        x = k.bx + (h.x - k.bx) * e;
        y = k.by + (h.y - k.by) * e + kavis * 1.2;
        z = 2 + kavis * 3 + k.k * 0.0005;
        don = (1 - e) * 1.5 + ((k.k * 0.37) % 0.5) - 0.25;
        olcek = 1 + kavis * 0.6;
        k.x = x;
        k.y = y;
        renk.copy(k.renk);
      }
      kukla.position.set(x, y, z);
      kukla.rotation.set(0, 0, don);
      kukla.scale.setScalar(olcek);
      kukla.updateMatrix();
      m.setMatrixAt(i, kukla.matrix);
      m.setColorAt(i, renk);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, EN_FAZLA]} frustumCulled={false}>
      <planeGeometry args={[0.46, 0.34]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export function Yigin({ veri }: { veri: RefObject<YiginVerisi> }) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Kartlar veri={veri} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Ayıklama ekranı**

Dosya: `src/arayuz/ekranlar/Ayiklama.tsx`
```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Color } from 'three';
import { api } from '../api';
import { Yigin, yeniKart, type YiginVerisi } from '../bilesenler/Yigin';
import { ELENECEK_KOSESI, etiketBoyu, grupMerkezi, kumeKonumu, yuzde } from '../mantik/duzen';
import { ELENECEK_ID } from '../mantik/gruplama';
import { HizOlcer } from '../mantik/zaman';
import { elemeAdi, hataMetni, onizlemeAdresi, sayi, sonParca, sureMetni } from '../mantik/bicim';
import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya, Sayim } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

interface Props {
  girdiler: string[];
  sayim: Sayim;
  gruplar: Grup[];
  onBitti: (sonuc: ArayuzMedya[], durduruldu: boolean) => void;
}

interface Sayaclar {
  taranan: number;
  gruplanan: number;
  elenecek: number;
  kalan: number | null;
  toplam: number;
}

interface ModelDurumu {
  durum: 'yukleniyor' | 'hazir' | 'hata';
  cihaz?: string;
  hata?: string;
}

export function Ayiklama({ girdiler, sayim, gruplar, onBitti }: Props) {
  const bolgeler = useMemo(() => [...gruplar.map((g) => ({ id: g.id, ad: g.ad })), { id: DIGER_ID, ad: 'Diğer' }], [gruplar]);
  const sahne = useRef<HTMLDivElement>(null);
  const [en, setEn] = useState(1.6);
  const veri = useRef<YiginVerisi>({ toplam: sayim.foto + sayim.video, en: 1.6, bitti: false, kartlar: [], hedef: () => ({ x: 0, y: 0 }) });
  const [sayac, setSayac] = useState<Sayaclar>({ taranan: 0, gruplanan: 0, elenecek: 0, kalan: null, toplam: sayim.foto + sayim.video });
  const [adetler, setAdetler] = useState<Record<string, number>>({});
  const [model, setModel] = useState<ModelDurumu>({ durum: 'yukleniyor' });
  const [calisiyor, setCalisiyor] = useState(false);
  const [simdiki, setSimdiki] = useState<ArayuzMedya | null>(null);
  const [durduruluyor, setDurduruluyor] = useState(false);
  const [deneme, setDeneme] = useState(0);

  // Kartın hedefi o anki ekran oranından hesaplanır: pencere büyüyünce kümeler de kayar.
  veri.current.hedef = (grup, k, oran) => {
    if (grup === ELENECEK_ID) return kumeKonumu(ELENECEK_KOSESI(oran), k);
    const i = bolgeler.findIndex((b) => b.id === grup);
    return kumeKonumu(grupMerkezi(i < 0 ? bolgeler.length - 1 : i, bolgeler.length, oran), k);
  };

  useEffect(() => {
    const el = sahne.current;
    if (!el) return;
    const g = new ResizeObserver(() => {
      const o = el.clientWidth / Math.max(1, el.clientHeight);
      veri.current.en = o;
      setEn(o);
    });
    g.observe(el);
    return () => g.disconnect();
  }, []);

  useEffect(() => {
    const v = veri.current;
    const hiz = new HizOlcer();
    const kumeSayisi = new Map<string, number>();
    const kartlar = new Map<string, { i: number; grup: string; renk: string }>();
    let gruplanan = 0;
    let elenecek = 0;
    let sonKalkis = 0;

    function ucur(i: number, grup: string, renk: string) {
      while (v.kartlar.length <= i) v.kartlar.push(yeniKart());
      const k = kumeSayisi.get(grup) ?? 0;
      kumeSayisi.set(grup, k + 1);
      sonKalkis = Math.max(performance.now() / 1000, sonKalkis + 0.012); // kartlar art arda kalkar
      const kart = v.kartlar[i];
      kart.grup = grup;
      kart.k = k;
      kart.renk = new Color(renk);
      kart.kalkis = sonKalkis;
      kart.basladi = false;
    }
    const artir = (grup: string, n: number) => setAdetler((a) => ({ ...a, [grup]: (a[grup] ?? 0) + n }));

    const birak = api.olaylariDinle((o) => {
      if (o.tur === 'model') {
        setModel({ durum: o.durum, cihaz: o.cihaz, hata: o.hata });
      } else if (o.tur === 'basladi') {
        v.toplam = o.toplam;
        setCalisiyor(true);
        setModel((m) => ({ ...m, durum: 'hazir' }));
        setSayac((s) => ({ ...s, toplam: o.toplam }));
      } else if (o.tur === 'dosya') {
        const grup = o.medya.eleme ? ELENECEK_ID : o.medya.grupId;
        if (o.medya.eleme) elenecek++;
        else gruplanan++;
        kartlar.set(o.medya.anahtar, { i: o.sira - 1, grup, renk: o.medya.renk });
        ucur(o.sira - 1, grup, o.medya.renk);
        artir(grup, 1);
        hiz.ekle(performance.now());
        setSimdiki(o.medya);
        setSayac({ taranan: o.sira, gruplanan, elenecek, kalan: hiz.kalan(o.toplam - o.sira), toplam: o.toplam });
      } else if (o.tur === 'kopyalar') {
        for (const a of o.anahtarlar) {
          const k = kartlar.get(a);
          if (!k || k.grup === ELENECEK_ID) continue;
          artir(k.grup, -1);
          artir(ELENECEK_ID, 1);
          gruplanan--;
          elenecek++;
          k.grup = ELENECEK_ID;
          ucur(k.i, ELENECEK_ID, k.renk);
        }
        setSayac((s) => ({ ...s, gruplanan, elenecek }));
      } else if (o.tur === 'bitti') {
        v.bitti = true;
        setSayac((s) => ({ ...s, kalan: 0 }));
        window.setTimeout(() => onBitti(o.sonuc, o.durduruldu), o.durduruldu ? 300 : 2200);
      }
    });
    api.baslat(girdiler).catch((h) => setModel({ durum: 'hata', hata: hataMetni(h) }));
    return birak;
  }, [deneme]);

  const grupAdi = (m: ArayuzMedya) => (m.eleme ? `Elenecek › ${elemeAdi(m.eleme)}` : (bolgeler.find((b) => b.id === m.grupId)?.ad ?? 'Diğer'));
  const durumMetni =
    model.durum === 'yukleniyor'
      ? 'Yapay zekâ hazırlanıyor… (ilk açılışta ~350 MB iner)'
      : calisiyor
        ? `Yapay zekâ ${model.cihaz === 'dml' ? 'ekran kartında' : 'işlemcide'} çalışıyor`
        : '';

  return (
    <div className="ayiklama" data-durum={calisiyor ? 'calisiyor' : 'hazirlaniyor'}>
      <div className="sahne" ref={sahne}>
        <Yigin veri={veri} />
      </div>

      <div className="ust-serit">
        <span className="marka-kucuk">AYIKLA</span>
        <span className="durum">{durumMetni}</span>
        <button
          className="ikincil"
          disabled={durduruluyor || model.durum === 'hata'}
          onClick={() => {
            setDurduruluyor(true);
            void api.durdur();
          }}
        >
          {durduruluyor ? 'Durduruluyor…' : 'Durdur'}
        </button>
      </div>

      <div className="sayaclar">
        <SayacKarti etiket="Taranan" deger={`${sayi(sayac.taranan)} / ${sayi(sayac.toplam)}`} />
        <SayacKarti etiket="Gruplanan" deger={sayi(sayac.gruplanan)} vurgu />
        <SayacKarti etiket="Elenecek" deger={sayi(sayac.elenecek)} />
        <SayacKarti etiket="Kalan süre" deger={sureMetni(sayac.kalan)} />
      </div>

      {bolgeler.map((b, i) => (
        <Etiket key={b.id} ad={b.ad} adet={adetler[b.id] ?? 0} konum={yuzde(grupMerkezi(i, bolgeler.length, en), en)} />
      ))}
      <Etiket ad="Elenecekler" adet={adetler[ELENECEK_ID] ?? 0} konum={yuzde(ELENECEK_KOSESI(en), en)} elenecek />

      <AnimatePresence>
        {simdiki && (
          <motion.div className="simdiki" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <img src={onizlemeAdresi(simdiki.onizlemeler[0])} alt="" />
            <div>
              <div className="ad">{sonParca(simdiki.yol)}</div>
              <div className="soluk">{grupAdi(simdiki)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {model.durum === 'hata' && (
        <div className="model-uyari">
          <p className="birakma-baslik">Ayıklama başlatılamadı</p>
          <p className="soluk">İlk açılışta yapay zekâ modeli internetten bir kez iner (~350 MB). Bağlantını kontrol edip tekrar dene.</p>
          {model.hata && <p className="hata">{model.hata}</p>}
          <button
            className="altin"
            onClick={() => {
              setModel({ durum: 'yukleniyor' });
              setDeneme((d) => d + 1);
            }}
          >
            Tekrar dene
          </button>
        </div>
      )}
    </div>
  );
}

function SayacKarti({ etiket, deger, vurgu }: { etiket: string; deger: string; vurgu?: boolean }) {
  return (
    <div className={`sayac${vurgu ? ' vurgu' : ''}`}>
      <div className="etiket">{etiket}</div>
      <div className="deger">{deger}</div>
    </div>
  );
}

function Etiket({ ad, adet, konum, elenecek }: { ad: string; adet: number; konum: { sol: number; ust: number }; elenecek?: boolean }) {
  return (
    <AnimatePresence>
      {adet > 0 && (
        <motion.div
          className={`grup-etiketi${elenecek ? ' elenecek' : ''}`}
          style={{ left: `${konum.sol}%`, top: `${konum.ust}%`, x: '-50%', y: '-50%' }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ad" style={{ fontSize: etiketBoyu(adet) }}>
            {ad}
          </span>
          <span className="adet">{sayi(adet)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### Task 11: Sonuç ekranı ve büyük görünüm

**Files:**
- Create: `src/arayuz/bilesenler/BuyukGorunum.tsx`, `src/arayuz/ekranlar/Sonuc.tsx`

- [ ] **Step 1: Büyük görünüm**

Dosya: `src/arayuz/bilesenler/BuyukGorunum.tsx`
```tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dosyaAdresi, onizlemeAdresi, sonParca, tarihMetni } from '../mantik/bicim';
import type { ArayuzMedya } from '../../ortak/mesajlar';

interface Props {
  liste: ArayuzMedya[];
  sira: number;
  setSira: (n: number | null) => void;
  grupAdi: (m: ArayuzMedya) => string;
}

/** Tıklanan dosyayı büyük gösterir; videolar oynar; ← → ile gezilir, Esc kapatır. */
export function BuyukGorunum({ liste, sira, setSira, grupAdi }: Props) {
  const m = liste[sira];
  const git = (n: number) => setSira(Math.max(0, Math.min(liste.length - 1, n)));

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSira(null);
      if (e.key === 'ArrowRight') git(sira + 1);
      if (e.key === 'ArrowLeft') git(sira - 1);
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [sira, liste.length]);

  if (!m) return null;
  return (
    <motion.div className="buyuk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSira(null)}>
      <div className="buyuk-ic" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.div
            key={m.anahtar}
            className="buyuk-medya"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {m.tur === 'video' ? (
              <video src={dosyaAdresi(m.yol)} controls autoPlay poster={onizlemeAdresi(m.onizlemeler[1] ?? m.onizlemeler[0])} />
            ) : (
              <img src={dosyaAdresi(m.yol)} alt="" style={{ backgroundImage: `url("${onizlemeAdresi(m.onizlemeler[0])}")` }} />
            )}
          </motion.div>
        </AnimatePresence>
        <footer>
          <span>{sonParca(m.yol)}</span>
          <span className="soluk">
            {tarihMetni(m.tarih)}
            {m.tahmini ? ' (tahmini)' : ''} · {grupAdi(m)}
          </span>
          <span className="soluk">
            {sira + 1} / {liste.length}
          </span>
        </footer>
      </div>
      <button
        className="ok sol"
        aria-label="Önceki"
        onClick={(e) => {
          e.stopPropagation();
          git(sira - 1);
        }}
      >
        ‹
      </button>
      <button
        className="ok sag"
        aria-label="Sonraki"
        onClick={(e) => {
          e.stopPropagation();
          git(sira + 1);
        }}
      >
        ›
      </button>
      <button className="kapat" aria-label="Kapat" onClick={() => setSira(null)}>
        ✕
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Sonuç ekranı**

Dosya: `src/arayuz/ekranlar/Sonuc.tsx`
```tsx
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { BuyukGorunum } from '../bilesenler/BuyukGorunum';
import { ELENECEK_ID, duzlestir, grupAdiBul, grupMenusu, menuAnahtari, yilAyGrupla } from '../mantik/gruplama';
import { ayAdi, elemeAdi, hataMetni, onizlemeAdresi, sayi } from '../mantik/bicim';
import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

interface Props {
  medya: ArayuzMedya[];
  setMedya: Dispatch<SetStateAction<ArayuzMedya[]>>;
  gruplar: Grup[];
  setGruplar: Dispatch<SetStateAction<Grup[]>>;
  onYeni: () => void;
}

export function Sonuc({ medya, setMedya, gruplar, setGruplar, onYeni }: Props) {
  const menu = useMemo(() => grupMenusu(gruplar, medya), [gruplar, medya]);
  const [secili, setSecili] = useState<string>(() => menu[0]?.id ?? DIGER_ID);
  const bolumler = useMemo(() => yilAyGrupla(medya.filter((m) => menuAnahtari(m) === secili)), [medya, secili]);
  const liste = useMemo(() => duzlestir(bolumler), [bolumler]);
  const sira = useMemo(() => new Map(liste.map((m, i) => [m.anahtar, i])), [liste]);
  const [buyuk, setBuyuk] = useState<number | null>(null);
  const [sagTik, setSagTik] = useState<{ x: number; y: number; m: ArayuzMedya } | null>(null);
  const [yeniGrup, setYeniGrup] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [aktarim, setAktarim] = useState<{ bitti: number; toplam: number } | null>(null);

  const grupAdi = (id: string) => grupAdiBul(gruplar, id);
  const medyaGrupAdi = (m: ArayuzMedya) => (m.eleme ? `Elenecek › ${elemeAdi(m.eleme)}` : grupAdi(m.grupId));
  const seciliAd = menu.find((g) => g.id === secili)?.ad ?? grupAdi(secili);

  useEffect(() => api.olaylariDinle((o) => o.tur === 'aktarim' && setAktarim({ bitti: o.bitti, toplam: o.toplam })), []);
  useEffect(() => {
    const kapat = () => setSagTik(null);
    window.addEventListener('click', kapat);
    return () => window.removeEventListener('click', kapat);
  }, []);
  useEffect(() => {
    if (!bilgi) return;
    const t = window.setTimeout(() => setBilgi(null), 5000);
    return () => window.clearTimeout(t);
  }, [bilgi]);

  const guncelle = (yeni: ArayuzMedya) => setMedya((l) => l.map((m) => (m.anahtar === yeni.anahtar ? yeni : m)));

  async function tasi(m: ArayuzMedya, grupId: string) {
    try {
      guncelle(await api.grupTasi(m.anahtar, grupId));
      setBilgi(`“${grupAdi(grupId)}” grubuna taşındı`);
    } catch (h) {
      setBilgi(hataMetni(h));
    }
  }

  async function geriAl(m: ArayuzMedya) {
    try {
      guncelle(await api.geriAl(m.anahtar));
      setBilgi(`Geri alındı: “${grupAdi(m.grupId)}” grubunda`);
    } catch (h) {
      setBilgi(hataMetni(h));
    }
  }

  async function grupEkle(ad: string) {
    setBilgi('Yapay zekâ yeni grubu öğreniyor ve arşivi yeniden puanlıyor…');
    try {
      const r = await api.grupEkle(ad);
      setGruplar((g) => [...g.filter((x) => x.id !== r.grup.id), r.grup]);
      setMedya(r.sonuc);
      setSecili(r.grup.id);
      setBilgi(`“${r.grup.ad}” grubu eklendi`);
    } catch (h) {
      setBilgi('Grup eklenemedi: ' + hataMetni(h));
    }
  }

  async function aktar() {
    try {
      setAktarim(null);
      const r = await api.aktarSec();
      setAktarim(null);
      if (!r) return;
      const disk = r.hatalar.some((h) => /ENOSPC|no space/i.test(h.hata));
      setBilgi(
        disk
          ? `Disk doldu: ${sayi(r.kopyalanan)} dosya kopyalanabildi.`
          : `${sayi(r.kopyalanan)} dosya kopyalandı · ${sayi(r.atlanan)} zaten vardı${r.hatalar.length ? ` · ${sayi(r.hatalar.length)} hata` : ''}. Orijinaller yerinde duruyor.`,
      );
    } catch (h) {
      setAktarim(null);
      setBilgi('Kaydedilemedi: ' + hataMetni(h));
    }
  }

  return (
    <div className="sonuc">
      <aside className="yan">
        <div className="yan-ust">
          <span className="marka-kucuk">AYIKLA</span>
          <button className="metin-dugme" onClick={onYeni}>
            Yeni arşiv
          </button>
        </div>
        <nav>
          {menu.map((g) => (
            <div key={g.id} style={{ display: 'contents' }}>
              {g.ozel === 'diger' && <div className="ayrac" />}
              <button
                className={`grup${g.id === secili ? ' secili' : ''}${g.ozel === 'elenecek' ? ' elenecek' : ''}`}
                onClick={() => {
                  setSecili(g.id);
                  setBuyuk(null);
                }}
              >
                <span>{g.ad}</span>
                <span className="adet">{sayi(g.adet)}</span>
              </button>
            </div>
          ))}
        </nav>
        {yeniGrup === null ? (
          <button className="grup-ekle" onClick={() => setYeniGrup('')}>
            + Grup ekle
          </button>
        ) : (
          <form
            className="grup-ekle-form"
            onSubmit={(e) => {
              e.preventDefault();
              const ad = yeniGrup.trim();
              setYeniGrup(null);
              if (ad) void grupEkle(ad);
            }}
          >
            <input
              autoFocus
              value={yeniGrup}
              placeholder="Örn. Araba — Enter’a bas"
              onChange={(e) => setYeniGrup(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setYeniGrup(null)}
            />
          </form>
        )}
      </aside>

      <section className="icerik">
        <header className="sonuc-ust">
          <div>
            <h1>{seciliAd}</h1>
            <p className="soluk">
              {sayi(liste.length)} dosya{secili === ELENECEK_ID ? ' · silinmez; “Geri al” ile gruba döner' : ''}
            </p>
          </div>
          <button className="altin" onClick={() => void aktar()}>
            Klasörlere kaydet
          </button>
        </header>

        {aktarim && aktarim.bitti < aktarim.toplam && (
          <div className="ilerleme" title={`${aktarim.bitti} / ${aktarim.toplam}`}>
            <div style={{ width: `${(100 * aktarim.bitti) / Math.max(1, aktarim.toplam)}%` }} />
          </div>
        )}

        {liste.length === 0 && <p className="bos">Bu grupta dosya yok</p>}

        {bolumler.map((y) => (
          <section key={y.yil} className="yil">
            <h2>{y.yil}</h2>
            {y.aylar.map((a) => (
              <div key={a.ay} className="ay">
                <h3>
                  {ayAdi(a.ay)}
                  <span className="soluk">{sayi(a.medya.length)}</span>
                </h3>
                <div className="izgara">
                  {a.medya.map((m) => (
                    <div key={m.anahtar} className="kare-kap">
                      <button
                        className="kare"
                        title={medyaGrupAdi(m)}
                        onClick={() => setBuyuk(sira.get(m.anahtar) ?? 0)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSagTik({ x: e.clientX, y: e.clientY, m });
                        }}
                      >
                        <img src={onizlemeAdresi(m.onizlemeler[0])} loading="lazy" alt="" style={{ background: m.renk }} />
                        {m.tur === 'video' && <span className="rozet video">▶ Video</span>}
                        {m.eleme && <span className="rozet eleme">{elemeAdi(m.eleme)}</span>}
                        {m.tahmini && (
                          <span className="rozet tahmini" title="Çekim tarihi bulunamadı, dosya tarihi kullanıldı">
                            ~
                          </span>
                        )}
                      </button>
                      {m.eleme && (
                        <button className="geri-al" onClick={() => void geriAl(m)}>
                          Geri al
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </section>

      {sagTik && (
        <div
          className="sag-menu"
          style={{ left: Math.min(sagTik.x, window.innerWidth - 240), top: Math.min(sagTik.y, window.innerHeight - 390) }}
          onClick={(e) => e.stopPropagation()}
        >
          {sagTik.m.eleme && (
            <button
              onClick={() => {
                void geriAl(sagTik.m);
                setSagTik(null);
              }}
            >
              Geri al (elenmesin)
            </button>
          )}
          <p className="menu-baslik">Şu gruba taşı</p>
          {[...gruplar, { id: DIGER_ID, ad: 'Diğer' }]
            .filter((g) => g.id !== sagTik.m.grupId || sagTik.m.eleme)
            .map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  void tasi(sagTik.m, g.id);
                  setSagTik(null);
                }}
              >
                {g.ad}
              </button>
            ))}
        </div>
      )}

      <AnimatePresence>
        {buyuk !== null && <BuyukGorunum liste={liste} sira={buyuk} setSira={setBuyuk} grupAdi={medyaGrupAdi} />}
      </AnimatePresence>

      <AnimatePresence>
        {bilgi && (
          <motion.div className="bilgi" initial={{ opacity: 0, y: 12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }}>
            {bilgi}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Tip kontrolü, testler, derleme**

Run: `npm run tip` → temiz. `npm test` → hepsi PASS. `npm run derle` → `Derlendi: dist/`.

- [ ] **Step 4: Hızlı görsel kontrol**

Run: `npm run baslat` — karşılama ekranı gelir; "Klasör seç" ile küçük bir test klasörü seçilip "Ayıkla"ya basılır; yığın döner, kartlar uçar, sonuç ekranı açılır. Pencereyi kapat.

- [ ] **Step 5: Commit (Task 8–11 birlikte)**

```bash
git add src/arayuz
git commit -m "feat(arayuz): Karşılama, Ayıklama (dönen yığın) ve Sonuç ekranları"
```

---

### Task 12: Tek tıkla açılış, kullanım notu, ekran görüntüsü betiği

**Files:**
- Create: `scripts/kisayol.ps1`, `scripts/ekran-goruntusu.mjs`, `KULLANIM.md`

- [ ] **Step 1: Masaüstü kısayolu**

Dosya: `scripts/kisayol.ps1`
```powershell
# Masaustune AYIKLA kisayolu olusturur. Kisayolun ustune bir klasor birakilirsa o klasorle acilir.
$kok = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $kok 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $electron)) { Write-Error "Electron bulunamadi: $electron"; exit 1 }
$masaustu = [Environment]::GetFolderPath('Desktop')
$yol = Join-Path $masaustu 'AYIKLA.lnk'
$k = (New-Object -ComObject WScript.Shell).CreateShortcut($yol)
$k.TargetPath = $electron
$k.Arguments = '"' + $kok + '"'
$k.WorkingDirectory = $kok
$k.IconLocation = (Join-Path $kok 'simge\ayikla.ico') + ',0'
$k.Description = 'Fotograf ve videolari sahneye ve tarihe gore ayiklar'
$k.Save()
Write-Output "Kisayol olusturuldu: $yol"
```

- [ ] **Step 2: Ekran görüntüsü betiği**

Dosya: `scripts/ekran-goruntusu.mjs`
```js
// Programı açar, üç ekranın ve animasyonun ekran görüntülerini alır. Dosyalara yalnızca okumak için dokunur.
// Kullanım: npm run ekran -- "<klasör>" [çıktı klasörü]
import { _electron as electron } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [klasor, cikti = 'ekran-goruntuleri'] = process.argv.slice(2);
if (!klasor) {
  console.log('Kullanım: npm run ekran -- "<klasör>" [çıktı klasörü]');
  process.exit(1);
}
const kok = resolve(import.meta.dirname, '..');
mkdirSync(cikti, { recursive: true });

const uygulama = await electron.launch({ args: [kok, klasor], cwd: kok });
const p = await uygulama.firstWindow();
const resim = async (ad) => {
  await p.screenshot({ path: join(cikti, ad) });
  console.log('kaydedildi:', join(cikti, ad));
};

try {
  await p.getByText('bulundu').waitFor({ timeout: 120_000 });
  await p.waitForTimeout(1200);
  await resim('1-karsilama.png');

  await p.getByRole('button', { name: 'Ayıkla', exact: true }).click();
  await p.locator('[data-durum="calisiyor"]').waitFor({ timeout: 600_000 });
  await p.waitForTimeout(2500);
  await resim('2-ayiklama-baslangic.png');
  await p.waitForTimeout(5000);
  await resim('3-ayiklama-ilerliyor.png');

  await p.locator('[data-ekran="sonuc"]').waitFor({ timeout: 3_600_000 });
  await p.waitForTimeout(2500);
  await resim('4-sonuc.png');

  await p.locator('.kare').first().click();
  await p.waitForTimeout(2000);
  await resim('5-buyuk-gorunum.png');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(700);

  await p.locator('.kare').nth(1).click({ button: 'right' });
  await p.waitForTimeout(600);
  await resim('6-sag-tik-menusu.png');
} finally {
  await uygulama.close();
}
```

- [ ] **Step 3: Kullanım notu**

Dosya: `KULLANIM.md`
```markdown
# AYIKLA — Kullanım

## Açmak
- Masaüstündeki **AYIKLA** simgesine çift tıkla.
- Bir klasörü simgenin üstüne sürükleyip bırakırsan program o klasörle açılır.
- Simge yoksa (veya program güncellendiyse) proje klasöründe bir kez şunu çalıştır: `npm run kur`

## Kullanmak
1. Fotoğraf klasörünü pencereye bırak veya **Klasör seç**'e bas.
2. "… fotoğraf · … video bulundu" yazısı çıkınca **Ayıkla**'ya bas.
3. Fotoğraflar ortadaki yığından gruplarına uçar. **Durdur** dersen sonra kaldığı yerden sürer.
4. Sonuç ekranında soldan grup seç; fotoğraflar yıl › ay başlıklarıyla dizilir.
   - Tıkla: büyük görünüm (← → ile gez, Esc ile kapat; videolar oynar).
   - Sağ tık: başka gruba taşı. **Elenecekler**'de "Geri al".
   - **+ Grup ekle**: Türkçe bir ad yaz (örn. "Araba"); yapay zekâ arşivi yeniden puanlar.
   - **Klasörlere kaydet**: seçtiğin klasöre `Grup\Yıl\Ay` düzeninde **kopyalar**.

## Güvenlik
- Program hiçbir dosyanı silmez, taşımaz, değiştirmez. Yalnızca okur ve istersen kopyalar.
- Hiçbir fotoğraf internete gönderilmez. Yapay zekâ modeli yalnızca ilk açılışta bir kez iner (~350 MB).
- Programın kendi dosyaları: `C:\Users\<sen>\.ayikla` (küçük resimler, kayıt, model).
```

- [ ] **Step 4: Kur ve dene**

Run: `npm run kur`
Expected: `Derlendi: dist/` ve `Kisayol olusturuldu: …\Desktop\AYIKLA.lnk`.
Masaüstündeki kısayola çift tıklayınca program açılmalı.

- [ ] **Step 5: Commit**

```bash
git add scripts/kisayol.ps1 scripts/ekran-goruntusu.mjs KULLANIM.md
git commit -m "feat: masaüstü kısayolu, kullanım notu ve ekran görüntüsü betiği"
```

---

### Task 13: Gerçek deneme ve ekran görüntüleri (yalnızca okur)

- [ ] **Step 1: Klasörün önce durumunu kaydet**

```bash
find "/c/Users/krykc/Desktop/Fotograflar" -printf "%p %s %T@ %y\n" | sort > <geçici>/once.txt
```

- [ ] **Step 2: Ekran görüntüleri**

Run: `npm run ekran -- "C:\Users\krykc\Desktop\Fotograflar" "<geçici>/ekran"`
Expected: 6 PNG (karşılama, ayıklama ×2, sonuç, büyük görünüm, sağ tık menüsü). Görüntüleri tek tek açıp kontrol et: Türkçe metinler, altın vurgu, kartlar gruplarda, ızgara yıl › ay başlıklı.
"Klasörlere kaydet" gerçek klasörde **çalıştırılmaz**.

- [ ] **Step 3: Orijinallerin değişmediğini doğrula**

```bash
find "/c/Users/krykc/Desktop/Fotograflar" -printf "%p %s %T@ %y\n" | sort | diff <geçici>/once.txt - && echo DEGISMEDI
```
Expected: `DEGISMEDI`

- [ ] **Step 4: Akıcılık** — 1.452 kartlık gerçek klasörde animasyonun takılmadığını iki ayıklama görüntüsü ve gözle kontrol et.

- [ ] **Step 5: Son kontrol** — `npm test`, `npm run tip` temiz; `git status` temiz.

---

## Öz-denetim (plan yazılırken yapıldı)

- Tasarım 4.1 Karşılama: bırakma alanı, Klasör seç, "… bulundu" + Ayıkla, Son arşivler → Task 9 (+ Task 2 `sonArsivler`, Task 4 `say`).
- 4.2 Ayıklama: dönen yığın, kartlar gruplarına uçar, etiketler büyür, Elenecekler köşesi, sayaç kartları (Taranan, Gruplanan, Elenecek, Kalan süre), Durdur + kaldığı yerden sürme → Task 10 (+ Task 6 `duzen`, `zaman`; motor önbelleği).
- 4.3 Sonuç: sol menü + adetler, Diğer, Elenecekler, + Grup ekle (yeniden tarama yok) → Task 11 + Task 4 `grupEkle` + Task 2 `yenidenPuanla`; yıl › ay ızgara → Task 6 `yilAyGrupla`; büyük görünüm, video, ok tuşları → Task 11; elle taşıma (sağ tık) → Task 4 `grupTasi`; Klasörlere kaydet → `aktar-sec` (Task 7) + Task 4 `aktar`; Geri al → Task 2 + Task 4.
- Bölüm 8 hata durumları: okunamayan dosya (motor), model inemezse Türkçe mesaj + Tekrar dene (Task 10, Task 4 testi), ekran kartı yoksa işlemci (motor) ve arayüzde hangisi olduğu yazılır, disk dolu (Task 11 mesajı), yarıda kapanma (önbellek).
- Bölüm 9 güvenlik: hiçbir yazma kullanıcı dosyasına yok; `ayikla://dosya` yalnızca işçinin bildirdiği dosyalar; arayüz `aktar` isteyemez.
- Tek tıkla açılış: Task 12 kısayol. Ekran görüntüleri: Task 13.
- Tip tutarlılığı: `Istek`, `IsciIstegi`, `ArayuzOlayi`, `ArayuzMedya`, `SonArsiv`, `YiginVerisi.hedef(grup, k, en)`, `grupMenusu`, `grupAdiBul`, `yilAyGrupla`/`duzlestir` tüm görevlerde aynı adlarla kullanıldı.
- Bilerek dışarıda: sürükle-bırak ile gruba taşıma (sağ tık var; tasarım "sürükle veya sağ tık" diyor), karanlık eşiği ayarı, NEF/AVI.
