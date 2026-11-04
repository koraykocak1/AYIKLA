# AYIKLA — Lisans tablosu

**Kontrol tarihi:** 2026-11-03 (her satır bu tarihte kontrol edildi; aksi yazıyorsa o satırdaki tarih geçerlidir)
**Kapsam:** maddeler 064, 086, 087. `package.json`'daki doğrudan bağımlılıklar, programla birlikte dağıtılan önemli dolaylı bileşenler ve iki yapay zekâ modeli.

> Bu tablo hukuki görüş değildir. Yayın öncesi (P0) karar vermek için hazırlanmış bir envanterdir. "Doğrulanmadı" yazan satırlar çözülmeden yayın yapılmamalıdır.

## Nasıl doğrulandı

| Yöntem | Ne için |
|---|---|
| Kurulu paketin `package.json` `license` alanı (`node_modules/<paket>/package.json`) | Sürüm ve paketin kendi beyanı |
| İkilinin kendisi: `ffmpeg.exe -version`, `ffprobe.exe -version`, dosya sürüm bilgisi | Derleme seçenekleri (`--enable-gpl` vb.) ve gerçek sürüm |
| Projenin resmî deposu (GitHub `LICENSE`/`README`), HuggingFace API ve model kartı, NuGet lisans sayfası | Lisans metni ve çelişkiler |

## 1. Doğrudan bağımlılıklar (programla dağıtılır)

| Paket | Sürüm | Lisans | Yükümlülük | Kaynak | Kontrol |
|---|---|---|---|---|---|
| `@huggingface/transformers` | 4.3.2 | Apache-2.0 | Lisans metni + NOTICE (varsa) dağıtımla verilir | [github.com/huggingface/transformers.js](https://github.com/huggingface/transformers.js) | 2026-11-03 |
| `@react-three/fiber` | 9.8.2 | MIT | Telif + lisans metni | [github.com/pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 2026-11-03 |
| `better-sqlite3` | 13.0.3 | MIT | Telif + lisans metni. Hazır yerel ikili (`prebuilds/win32-x64.node`) paketle gelir; derleme yok | [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (`LICENSE`) | 2026-11-03 |
| `exifr` | 7.1.3 | MIT | Telif + lisans metni | [github.com/MikeKovarik/exifr](https://github.com/MikeKovarik/exifr) | 2026-11-03 |
| `ffmpeg-static` (paket) | 5.3.0 | GPL-3.0-or-later | Bkz. bölüm 3: ikili GPLv3 | [github.com/eugeneware/ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) | 2026-11-03 |
| ~~`ffprobe-static` (paket)~~ | ~~3.1.0~~ | — | **Kaldırıldı (2026-11-03).** Video süresi, boyutu ve tarihi artık `ffmpeg.exe -i` çıktısından okunuyor (`src/motor/ffmpeg.ts`); program `ffprobe.exe` taşımıyor | — | 2026-11-03 |
| `heic-convert` | 2.1.0 | ISC | Telif + lisans metni; çözücü LGPL, bkz. bölüm 2 | [github.com/catdad-experiments/heic-convert](https://github.com/catdad-experiments/heic-convert) | 2026-11-03 |
| `motion` | 14.9.0 | MIT | Telif + lisans metni | [github.com/motiondivision/motion](https://github.com/motiondivision/motion) | 2026-11-03 |
| `react`, `react-dom` | 19.3.1 | MIT | Telif + lisans metni | [github.com/facebook/react](https://github.com/facebook/react) | 2026-11-03 |
| `sharp` | 0.35.5 | Apache-2.0 | Lisans metni; içindeki libvips LGPL, bkz. bölüm 2 | [github.com/lovell/sharp](https://github.com/lovell/sharp) (README "Licensing") | 2026-11-03 |
| `three` | 0.187.0 | MIT | Telif + lisans metni | [github.com/mrdoob/three.js](https://github.com/mrdoob/three.js) | 2026-11-03 |
| `electron` (çalışma zamanı; `devDependencies`'te ama programla dağıtılır) | 45.2.1 | MIT; içindeki Chromium çok lisanslı | `LICENSE` ve `LICENSES.chromium.html` paketle birlikte verilmeli (ikisi de `node_modules/electron/dist` içinde var) | [github.com/electron/electron](https://github.com/electron/electron) | 2026-11-03 |

**Yalnız geliştirmede kullanılanlar (dağıtılmaz):** `typescript` 7.0.2 Apache-2.0 · `vite` 8.3.5 MIT · `vitest` 5.0.5 MIT · `esbuild` 0.28.2 MIT · `tsx` 4.23.15 MIT · `playwright-core` 1.64.1 Apache-2.0 · `@vitejs/plugin-react` 6.1.2 MIT · `@types/*` MIT. Kaynak: kurulu paketlerin `package.json` alanı, 2026-11-03.

## 2. Önemli dolaylı bileşenler

| Bileşen | Sürüm | Nereden gelir | Lisans | Yükümlülük | Kaynak | Kontrol |
|---|---|---|---|---|---|---|
| SQLite | 3.53.4 | better-sqlite3 içine gömülü | Kamu malı (public domain) | Yükümlülük yok | [sqlite.org/copyright.html](https://www.sqlite.org/copyright.html) | 2026-11-03 |
| `onnxruntime-node` | 1.30.0 | transformers.js | MIT | Telif + lisans metni | [github.com/microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) (`LICENSE`) | 2026-11-03 |
| `onnxruntime-web` | 1.31.0-dev.20260914 | transformers.js | MIT | Telif + lisans metni. Not: geliştirme (dev) sürümü | aynı depo | 2026-11-03 |
| `DirectML.dll` | 1.15.4 | `onnxruntime-node/bin/napi-v6/win32/x64` | Microsoft'un kendi lisansı ("Microsoft Software License Terms – DirectML"), açık kaynak değil | Geliştirdiğin uygulamanın içinde dağıtılabilir; tek başına dağıtılamaz | [nuget.org/packages/Microsoft.AI.DirectML/1.15.4/License](https://www.nuget.org/packages/Microsoft.AI.DirectML/1.15.4/License) | 2026-11-03 |
| `dxcompiler.dll` | 1.8.2502.8 | aynı klasör | University of Illinois/NCSA (LLVM) | Telif + lisans metni | [github.com/microsoft/DirectXShaderCompiler](https://github.com/microsoft/DirectXShaderCompiler) (`LICENSE.TXT`) | 2026-11-03 |
| `dxil.dll` | — | aynı klasör | **doğrulanmadı** (Microsoft'un imzalama ikilisi; ayrı lisans metni bulunamadı) | doğrulanmadı | — | 2026-11-03 |
| `@img/sharp-win32-x64` (libvips 8.18.7 ve ekleri) | 0.35.5 | sharp | Apache-2.0 **ve** LGPL-3.0-or-later | LGPL: kütüphane ayrı DLL olarak kalmalı (değiştirilebilir), lisans metni ve kaynak bağlantısı verilmeli. Paketteki diğer kütüphaneler (`versions.json`: aom, cairo, glib, heif, pango, rsvg, tiff, webp…) kendi lisanslarıyla gelir; tek tek **doğrulanmadı** | [sharp.pixelplumbing.com/install](https://sharp.pixelplumbing.com/install), [github.com/lovell/sharp-libvips](https://github.com/lovell/sharp-libvips) | 2026-11-03 |
| `heic-decode` | 2.1.0 | heic-convert | ISC | Telif + lisans metni | [github.com/catdad-experiments/heic-decode](https://github.com/catdad-experiments/heic-decode) | 2026-11-03 |
| `libheif-js` (libheif + libde265, JS/WASM'a derlenmiş) | 1.23.5 | heic-decode | LGPL-3.0 | LGPL: ayrı dosya olarak kalmalı; lisans metni + kaynak bağlantısı verilmeli. libheif ve libde265 ikisi de LGPL (örnek uygulamaları MIT) | [github.com/catdad-experiments/libheif-js](https://github.com/catdad-experiments/libheif-js), [github.com/strukturag/libheif](https://github.com/strukturag/libheif), [github.com/strukturag/libde265](https://github.com/strukturag/libde265) | 2026-11-03 |

LGPL bileşenleri şu an programın içine gömülmüyor: `scripts/derle.mjs` dosyasındaki `DISARIDA` listesi sharp, better-sqlite3, heic-convert ve transformers paketlerini `node_modules` içinden ayrı dosyalar olarak yüklüyor. Paketleme (FAZ 4) yapılırken bu düzen korunmalı.

## 3. ffmpeg ve ffprobe ikilileri: GPL mi?

**Evet. İkisi de GPLv3 ile dağıtılıyordu; `ffprobe` 2026-11-03'te kaldırıldı, yalnız `ffmpeg.exe` kaldı.**

| İkili | Sürüm | Derleyen | Derleme seçenekleri | Lisans | Kaynak kodu | Kontrol |
|---|---|---|---|---|---|---|
| `ffmpeg-static/ffmpeg.exe` (Windows x64) | 6.1.1 essentials | gyan.dev | `--enable-gpl --enable-version3`, libx264, libx265 ve başka kütüphanelerle | **GPL-3.0** (paketteki `ffmpeg.exe.README` ve `ffmpeg.exe.LICENSE` dosyalarında yazıyor) | Paket README'si FFmpeg commit'ini veriyor ([e38092ef93](https://github.com/FFmpeg/FFmpeg/commit/e38092ef93)). Ek kütüphanelerin tam kaynağının gyan.dev'den sağlandığı **doğrulanmadı** | 2026-11-03 |
| ~~`ffprobe-static/bin/win32/x64/ffprobe.exe`~~ | ~~4.0.2 (2018)~~ | ~~Zeranoe~~ | — | — | **Kaldırıldı (2026-11-03)**: paket `npm uninstall` ile çıkarıldı, `scripts/derle.mjs` listesinden silindi. Kaynağı belirsiz ikili artık dağıtılmıyor | 2026-11-03 |

**Ne anlama geliyor:**
- AYIKLA bu programları ayrı bir süreç olarak çalıştırıyor (`src/motor/ffmpeg.ts`). Kendi kodumuzun bu yüzden GPL olması gerekmiyor; ama bu bir yorumdur, hukuki görüş değildir.
- İkilileri dağıtırsak GPLv3'ün gereklerini yerine getirmemiz şart: lisans metnini vermek, kaynak koduna ulaşma yolunu (ya da yazılı teklif) sunmak, kullanıcının ikiliyi değiştirebilmesine engel olmamak.
- **Çözüldü (2026-11-03):** eski (2018) ve kaynağı belirsiz `ffprobe.exe` kaldırıldı; süre/boyut/tarih `ffmpeg.exe` ile okunuyor. Geriye tek GPL ikili kaldı: `ffmpeg.exe` (gyan.dev 6.1.1). Onun kaynak teklifi hâlâ açık iş (086).
- x264 ve x265 GPL lisanslı, patent konusu olabilecek kodlayıcılar. AYIKLA video kodlamıyor, yalnız kare çıkarıyor (kod çözüyor); ama ikilinin içinde bu kodlayıcılar yine de var. Patent durumu **doğrulanmadı**.

## 4. Yapay zekâ modelleri: kod ve ağırlık ayrı

| Model | Bölüm | Lisans | Yükümlülük | Kaynak | Kontrol |
|---|---|---|---|---|---|
| CLIP ViT-B/32 (`Xenova/clip-vit-base-patch32`, OpenAI'nin modelinin ONNX'e çevrilmiş hâli) | **Kod** (OpenAI CLIP) | MIT | Telif + lisans metni | [github.com/openai/CLIP](https://github.com/openai/CLIP) (`LICENSE`, "Copyright (c) 2021 OpenAI") | 2026-11-03 |
| | **Ağırlık** | MIT (Xenova model kartında `license: mit`) | Telif + lisans metni | [huggingface.co/Xenova/clip-vit-base-patch32](https://huggingface.co/Xenova/clip-vit-base-patch32) | 2026-11-03 |
| | Not | OpenAI'nin kendi HuggingFace sayfasında ([openai/clip-vit-base-patch32](https://huggingface.co/openai/clip-vit-base-patch32)) lisans alanı **boş**. Ağırlıkların MIT kapsamında olduğunu OpenAI'nin ayrıca söylediği **doğrulanmadı**; dayanak, Xenova kartı ve OpenAI deposunun MIT lisansı. Model kartı modelin genel kullanıma sunulmak için geliştirilmediğini belirtiyor (sorumluluk notu, lisans şartı değil) | — | — | 2026-11-03 |
| OPUS-MT Türkçe→İngilizce (`Xenova/opus-mt-tr-en`, Helsinki-NLP modelinin ONNX'i) | **Kod** (OPUS-MT eğitim hattı) | MIT (Copyright Joerg Tiedemann) | Telif + lisans metni | [github.com/Helsinki-NLP/OPUS-MT-train](https://github.com/Helsinki-NLP/OPUS-MT-train) (`LICENSE`) | 2026-11-03 |
| | **Ağırlık** | **Çelişkili.** HuggingFace kartı: Apache-2.0. Resmî OPUS-MT deposu: modeller **CC-BY 4.0** ile dağıtılır. Xenova kartında lisans alanı yok | **Ağır olan kabul edilir: CC-BY 4.0. Atıf zorunlu.** Bkz. aşağıdaki atıf metni | [huggingface.co/Helsinki-NLP/opus-mt-tr-en](https://huggingface.co/Helsinki-NLP/opus-mt-tr-en) · [OPUS-MT-train README](https://github.com/Helsinki-NLP/OPUS-MT-train#pre-trained-models) · [creativecommons.org/licenses/by/4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-11-03 |

**CC-BY 4.0 atıf yükümlülüğü (opus-mt):** Modeli içeren ya da indiren her dağıtımda şu dört bilgi verilmeli: (1) eserin sahibi, (2) lisansın adı ve bağlantısı, (3) kaynağın bağlantısı, (4) değişiklik yapıldıysa bunun belirtilmesi. Burada değişiklik var: ONNX'e çeviriyi Xenova yaptı. Önerilen metin (Hakkında ekranı ve paketle gelen lisans dosyası için):

> Türkçe→İngilizce çeviri modeli: OPUS-MT `opus-mt-tr-en`, Helsinki-NLP, Helsinki Üniversitesi (J. Tiedemann, S. Thottingal, "OPUS-MT — Building open translation services for the World", EAMT 2020). Lisans: CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Kaynak: https://huggingface.co/Helsinki-NLP/opus-mt-tr-en. ONNX biçimine çeviren: Xenova (https://huggingface.co/Xenova/opus-mt-tr-en).

**Model boyutları** (program yalnız fp32 dosyalarını açar; HuggingFace API dosya listesi, 2026-11-03): CLIP `vision_model.onnx` 351,7 MB + `text_model.onnx` 254,1 MB + yapılandırma ≈ **610 MB**. opus-mt `encoder_model.onnx` 204,6 MB + `decoder_model_merged.onnx` 230,5 MB + yapılandırma ≈ **440 MB**. Eski metinlerdeki "~350 MB" bilgisi yanlıştı.

**Sürüm sabitleme (yapıldı, 2026-11-03):** Modeller artık `main` dalından değil, sabit bir commit'ten iner: CLIP `6b7c523703ae26e39be4b03774966f8571c7f523` (2026-10-28), OPUS-MT `78247f41f354af036d24e6f0f8a3d02c6806f96e` (2025-07-14). Bunlar HuggingFace API'sindeki güncel commit'lerdi ve bu bilgisayardaki çalışan kopyanın 12 dosyasının özetleri bunlarla birebir aynıydı. Her dosyanın SHA-256'sı `src/motor/model-izni.ts`'te kayıtlı; indirme olduğunda inen dosyalar bununla doğrulanır, uyuşmayan silinmeden kenara alınır. Zaten inmiş modellerde her açılışta doğrulama yapılmaz (~1 GB okuma olmasın diye).

## 5. Uygulamadaki karşılığı

- Onay ekranında gösterilen boyut, kaynak ve lisans bilgileri `src/motor/model-izni.ts` dosyasındaki `CLIP_PAKETI` ve `CEVIRI_PAKETI` tanımlarından geliyor. Bu tablo değişirse orası da güncellenmeli.
- Hakkında kutusu karşılama ekranında (2026-11-04, `src/arayuz/bilesenler/Hakkinda.tsx`); OPUS-MT atıf metni orada. Bu tablo değişirse orası da güncellenmeli.
- Henüz YAPILMADI: paketlenen programın yanına `LICENSE`/`THIRD_PARTY_NOTICES` dosyası koymak, FFmpeg için GPL kaynak teklifi.
