# AYIKLA — Uygulama Yol Haritası

Tarih: 3 Kasım 2026 · Durum kaynağı: [FEATURE_GAP_MATRIX.md](FEATURE_GAP_MATRIX.md) · Kurallar: [PRODUCT_REQUIREMENTS_130_TR.md](PRODUCT_REQUIREMENTS_130_TR.md)

Sıra: **önce Windows, sonra Mac; telefon ertelendi; ücretsiz açık kaynak yayın.** Kaynak dosya güvenliği hiçbir zaman sonraki faza bırakılmaz. Her görev küçük, testli ve tek commit'tir. Arayüz tasarımı korunur; yeni ekran gerekiyorsa mevcut siyah-sarı sistemle yapılır ve önce kullanıcıya gösterilir.

## Parti 1 — En riskli P0 açıklar (uygulandı, 3 Kasım 2026; commit bekliyor)

Yalnız `src/motor` ve testler; arayüz görünümü değişmez.

| # | Görev | Maddeler | Dosyalar | Bitti sayılması için |
|---|---|---|---|---|
| 1.1 | Güvenli kopya: geçici dosya + SHA-256 (kaynak ve kopya) + kaynak değişim kontrolü + atomik bitiş + hata/disk dolunda geçiciyi silme. "Zaten vardı" kararı ad+boyut yerine hash ile | 029, 041, 048, 116 | `disari-aktar.ts`, `tests/disari-aktar.test.ts` | Bozuk/yarım kopya final adla kalmaz; aynı adlı farklı içerik "(2)" olur; sonuçta doğrulanan/atlanan/hata ayrı |
| 1.2 | Hedef güvenliği: hedef kaynak klasörün içindeyse, kaynak hedefin içindeyse ya da hedef çalışma klasörüyse aktarma reddedilir | 075, 115 | `disari-aktar.ts`, `sunucu.ts`, `cli.ts` | Reddedilen aktarma hiçbir dosya yazmaz; anlaşılır Türkçe hata |
| 1.3 | Arşiv işareti: hedef köke `.ayikla-arsiv` yazılır; tarayıcı işaretli alt klasörleri, çalışma klasörünü ve Windows sistem klasörlerini atlar; bağlantı (junction/symlink) klasörlerine girmez | 004, 050, 115 | `disari-aktar.ts`, `tarayici.ts`, `isci.ts`, `sunucu.ts` | Kaynak içine konmuş eski bir dışa aktarma klasörü yeniden taranmaz |
| 1.4 | Bozuk katalog koruması: `kayit.json` okunamazsa önce `kayit.json.bozuk-<zaman>` olarak saklanır, sonra boş kayıtla devam edilir | 041, 058 | `kayit.ts`, `tests/kayit.test.ts` | Bozuk dosya kaybolmaz; kullanıcı düzeltmeleri kurtarılabilir |
| 1.5 | Kaynak dokunulmazlık testi: tüm akış (ayıkla + dışa aktar) öncesi/sonrası kaynak klasörün dosya listesi ve SHA-256'ları aynı | Kural 1, DoD 1 | `tests/kaynak-korunur.test.ts` | Test geçer |

Parti 1 dışında kalanlar (YAPILMADI): disk alanı ön hesabı (048'in geri kalanı), kalıcı hata günlüğü, arayüzde doğrulanmış sayıların ayrıntılı gösterimi.

## FAZ 1 — Arşiv çekirdeği (P0), Parti 1'den sonra

| # | Görev | Maddeler | Önkoşul | Bitti şartı |
|---|---|---|---|---|
| 2 | Model indirme onayı: ilk indirmeden önce boyut, kaynak ve lisansı göster | 055, 073, 081 | — | Onaysız ağ çağrısı yok (test: sahte indirici çağrılmaz) |
| 3 | Lisans tablosu: tüm bağımlılıklar + model ağırlıkları (`docs/LISANSLAR.md`) | 064, 086, 087 | — | Her paket için kod ve ağırlık lisansı, kaynak, tarih |
| 4 | SQLite paket seçimi ve katalog modülü; `kayit.json`'dan migration | 058, 070, 107 | 3 | Migration testi: eski JSON → DB, kullanıcı düzeltmeleri korunur |
| 5 | Arşiv kökü (`.ayikla-arsiv` kimliği), dizin yapısı, tek-yazıcı kilidi | 006, 071, 072, 121 | 4 | İki süreç aynı arşive yazamaz; disk harfi değişince arşiv bulunur |
| 6 | İçerik adresli içe aktarma (blob + ref sayısı), birebir tekilleştirme | 032, 047, 053 | 1.1, 4, 5 | Aynı bayt 2 kaynak → 1 blob, 2 kaynak yolu |
| 7 | Geri dönüşüm kutusu + albümden kaldır / sil / kalıcı sil ayrımı | 013, 117 | 6 | 30 gün; paylaşılan blob korunur |
| 8 | Sanal albüm + temel etiket + klasik arama | 009, 010, 026 | 4 | Bir öğe iki albümde, tek kopya; ad/tarih/tür araması |
| 9 | Doğrulanmış yedek ve geri yükleme | 015, 080 | 4, 5 | Yedek → geri yükle → katalog + hash aynı |
| 10 | Arşiv sağlık denetimi (düşük öncelikte, isteğe bağlı) | 130 | 6 | Değiştirilmiş kopya bulunur |
| 11 | Ayrılmış dosya adları, uzun yol, Unicode NFC | 120 | — | `CON`, 260+ karakter, Türkçe ad testleri |
| 12 | Uçtan uca kabul testi (talimattaki DoD 1–4) | DoD | 1–11 | Her senaryo geçti / başarısız / çalıştırılamadı diye raporlanır |

## FAZ 2 — Akıllı yerel medya (P1)

Önerilen sıra: AI sonuç sürümü (093) → güven eşiği ve "öneri" gösterimi (037) → metinden yerel arama (CLIP vektörleri zaten var; 089, 010) → bayt-aynı / görsel-benzer ayrımı ve karşılaştırma (007, 036) → renk paleti ve HEX arama (022) → iş kuyruğu, duraklat/sürdür (016, 040, 094) → biçim genişletme TIFF/GIF/CR2/CR3/ARW/DNG/MKV (005, 074, 109) → bulut yer tutucu tespiti (112, 114) → video sahne örnekleme (019, 091) → OCR (020, 088) → etkinlik önerileri (021) → yüz gruplama (008, 095, 096; KVKK incelemesinden sonra).

## FAZ 3 — Profesyonel araçlar ve cihazlar (P2)

Tahribatsız düzenleme ve sürümler (011, 052), puan/favori (035), toplu adlandırma (110), contact sheet (111), gizlilik dışa aktarma profilleri (054), Live Photo ve XMP (051, 109), dış uygulamalar (044), profiller ve gizleme (018, 024, 097, 118), çok dil (065). **Ertelenenler:** telefon/Wi-Fi aktarımı (033, 034), Mac ve çok cihaz senkronu (028, 102, 113).

## FAZ 4 — Uzun ömür ve dağıtım (P3, sürekli)

Büyük arşiv ölçümleri (076, 083, 090), renk yönetimi/HDR (119), paketleme, güncelleme ve kanallar (059, 077), kaldırıcı politikası (062), imzalama ve imzasız dağıtım uyarıları (100), erişilebilirlik denetimi (067), eklenti sınırları (104).

## İlerleme kaydı

| Tarih | Parti | Sonuç |
|---|---|---|
| 2026-11-03 | FAZ 0 belgeleri | Matris 130/130 ve dört belge yazıldı |
| 2026-11-03 | Parti 1 (1.1–1.5) | Uygulandı. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 23 dosya, 125 test geçti (önce 105); `npm.cmd run derle` temiz. Gerçek arşivde ve uygulama penceresinde denenmedi |
| 2026-11-03 | FAZ 1 #2–#3 (motor + belge) | Model indirme onayı motorda: onay yoksa ve model diskte eksikse yükleyici çağrılmaz, kütüphanenin ağı kapalı (`model-izni.ts`). Lisans tablosu `docs/LISANSLAR.md`. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 24 dosya, 132 test geçti (önce 125). Gerçek önbellek ağsız açıldı (0 ağ çağrısı). Karşılama ekranına onay adımı eklendi (kullanıcı taslağı onayladı) |
| 2026-11-03 | FAZ 1 #4 (katalog) | `better-sqlite3` 13.0.3 seçildi (kullanıcı onayı; MIT, hazır ikili, Electron 45 ve Node 26 altında derlemesiz çalıştı). `src/motor/katalog.ts` `kayit.ts`’in yerine geçti, dışa açık davranış aynı. `kayit.json` bir kez aktarılır, silinmez. 058/107 Kısmen kaldı, 070 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 24 dosya, 139 test geçti (önce 132); `npm.cmd run derle` temiz. Gerçek `kayit.json`’un kopyası (1.744 kayıt) Electron altında aktarıldı, sayılar tuttu. Uygulama penceresinde DENENMEDİ |
| 2026-11-03 | FAZ 1 #5 (arşiv kökü) | `src/motor/arsiv.ts`: `arsivOlustur`, `arsivKimligiOku`, `arsivBul`, `kilitAl`/`kilitDurumu`, `Arsiv.ac`/`kapat`; `katalog.ts`'e `veritabaniAc` eklendi (davranış aynı). 006, 071, 072, 121 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 25 dosya, 148 test geçti (önce 139). İki süreç testi ayrı bir Node süreciyle yapıldı. Gerçek USB diskte ve uygulama penceresinde DENENMEDİ; arayüze bağlanmadı |
| 2026-11-03 | FAZ 1 #6 (içe aktarma) | `src/motor/arsiv-depo.ts` `iceAl`: SHA-256 içerik adresli blob, `ref_sayisi`, öğe ve çoklu kaynak yolu; şema `user_version` 2 (`blob`, `oge`, `kaynak_yolu`) ve 1 → 2 geçiş testi; `disari-aktar.ts` `geciciyeKopyala` dışa açıldı. 032, 047 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 26 dosya, 155 test geçti (önce 148). Gerçek arşivde ve arayüzde DENENMEDİ |
| 2026-11-03 | FAZ 1 #7 (kutu) | `src/motor/arsiv-kutu.ts`: kutuya taşı / geri al / kalıcı sil / 30 günde boşalt; paylaşılan blob `ref_sayisi` > 0 iken silinmez; geri alınan öğe aynı içerikteki canlı öğeyle birleşir. Şema değişmedi (`oge.silinme` #6'da vardı). 013, 117 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 27 dosya, 160 test geçti (önce 155). Arayüzde DENENMEDİ |
| 2026-11-03 | FAZ 1 #8 (albüm, etiket, arama) | `src/motor/arsiv-album.ts`: sanal albüm, hiyerarşik elle etiket, klasik arama (`ara`); şema `user_version` 3 (`album`, `album_oge`, `etiket`, `oge_etiket`); `arsiv-kutu.ts` geri almada albüm/etiket bağlarını da taşır. 010, 026 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 28 dosya, 165 test geçti (önce 160). Arayüzde DENENMEDİ |
| 2026-11-03 | FAZ 1 #9 (yedek) | `src/motor/arsiv-yedek.ts`: `arsivYedekle`, `yedekDogrula`, `yedektenGeriYukle`. Şema değişmedi. 015, 080 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 29 dosya, 169 test geçti (önce 165). Gerçek ikinci diskte ve arayüzde DENENMEDİ |
| 2026-11-03 | FAZ 1 #10 (sağlık denetimi) | `src/motor/arsiv-saglik.ts`: `saglikDenetimi`, `sonSaglikRaporu`. Şema değişmedi (rapor `meta` tablosunda). 130 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 30 dosya, 172 test geçti (önce 169). Arayüzde ve büyük arşivde DENENMEDİ |
| 2026-11-03 | FAZ 1 #11 (dosya adları) | `disari-aktar.ts` `guvenliAd`: ayrılmış adlar, kontrol karakterleri, sondaki nokta/boşluk, NFC, uzunluk sınırı; dışa aktarılan dosya adı da süzülüyor. 120 Kısmen → Uygulanmış. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 31 dosya, 177 test geçti (önce 172). 260+ karakterlik yola kopyalama Node'un uzun yol desteğiyle çalıştı. Uygulama penceresinde DENENMEDİ |
| 2026-11-03 | FAZ 1 #12 (kabul testi) | `tests/kabul.test.ts`: DoD 1–4, 9 senaryo, hepsi geçti; çalıştırılamayanlar aşağıdaki raporda. Yeni `src/motor/arsiv-kurtar.ts` (kayıp/bozuk katalogdan yeniden keşif, DoD 4 için); `iceAl`'a durdurma sinyali eklendi. 124 Yok → Kısmen. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 186 test geçti (önce 177); `npm.cmd run derle` temiz. Uygulama penceresinde DENENMEDİ |
| 2026-11-03 | Yayın öncesi: ffprobe kaldırıldı | `ffprobe-static` (içinde 2018 tarihli, kaynağı belirsiz GPL `ffprobe.exe`) `npm uninstall` ile çıkarıldı; yeni paket kurulmadı. `videoBilgisi` aynı bilgileri (süre, boyut, oluşturma tarihi) paketteki `ffmpeg.exe -i` çıktısından okuyor; video olmayan dosyada yine hata veriyor. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 188 test geçti (önce 186); `npm.cmd run derle` temiz. Gerçek telefon videolarıyla ve uygulama penceresinde DENENMEDİ |
| 2026-11-03 | Yayın öncesi: model sürümü sabit | `model-izni.ts` `ModelPaketi.surum` (commit) + `ozetler` (SHA-256), `indirmeSablonu`, `modelDosyalariniDogrula`; `sahne-model.ts` indirme adresini sabit commit'e bağlar, yüklemeleri sıraya koyar, indirme olduysa dosyaları doğrular. Kütüphanenin `revision` seçeneği BİLEREK kullanılmadı: önbellek yolunu değiştirip inmiş ~1 GB modeli yeniden indirtirdi. `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 190 test geçti (önce 188). Gerçek önbellek: 12 dosya sabit sürümle aynı, iki model ağsız açıldı, 0 ağ çağrısı. Sıfırdan gerçek indirme DENENMEDİ (1 GB, onay ister) |
| 2026-11-04 | Yayın öncesi: bozuk katalog haberi + Hakkında (kullanıcı taslağı onayladı) | Motor: `katalogDurumu` isteği kenara alınan kayıt dosyasının yolunu bir kez döndürür (`sunucu.ts`). Arayüz: karşılama ekranında mevcut sarı `.not` satırıyla haber; alt şeritte küçük "Hakkında" yazısı → model onay kutusu görünümünde lisans kutusu (`bilesenler/Hakkinda.tsx`; CLIP MIT, OPUS-MT CC-BY 4.0 atfı, FFmpeg GPLv3 kaynağı, diğer paketler). Yeni CSS yalnız `.hakkinda-dugme` (iki satır). Adresler düz metin (pencere içinde site açılmasın). `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 191 test geçti (önce 190); `npm.cmd run derle` temiz. Geliştirme önizlemesinde (`?bozuk`) görüldü, konsol temiz. Gerçek Electron penceresinde DENENMEDİ |
| 2026-11-06 | Arşiv ekranları 1/4: Sonuç ekranında "Arşive al" (kullanıcı taslağı onayladı) | Motor: `arsivDurumu` ve `arsiveAl` istekleri, `arsivAlim` olayı (`sunucu.ts`); bilinen arşiv çalışma klasöründe `arsiv.json` (`{kok, kimlik}`); öğe seçimi "Klasöre kaydet" ile aynı (elenmeyenler + RAW eşleri); `iceAl` ilerlemesine ara sayımlar eklendi (geriye uyumlu). Ana süreç: `arsiv-sec` penceresi; `arsiveAl` yalnız ana süreçten ve yalnız seçilmiş ya da bilinen arşiv yolu için gider. Arayüz: "Klasöre kaydet" `.ikincil`, "Arşive al" `.altin`; arşiv yoksa "Arşivin nerede dursun?" kutusu; ilerleme satırı "arşive alınıyor N / T · K kopya zaten arşivde". `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 193 test geçti (önce 191); `npm.cmd run derle` temiz. Tarayıcı önizlemesinde (`?hizli&arsivyok`) sonuç ekranı, kutu ve ilerleme satırı görüldü. Gerçek Electron penceresinde ve USB diskte DENENMEDİ; `bayat-kilit` için yalnız mesaj var, kilidi kaldırma düğmesi sonraki görevde |
| 2026-11-06 | Arşiv ekranları 2–4: Arşivim, Kutu, Yedek (kullanıcı taslağı onayladı) | Motor: `arsivGoster`, `arsivIslem` (albüm/etiket/kutu/kalıcı sil), `bayatKilidiKaldir`, `yedekDurumu`, `arsivDenetle`, `yedekAl`, `geriYukle`; arşiv her iş için açılıp kapanır, son yedek `arsiv.json`’da. Ana süreç: `yedek-sec`, `geri-yukle-sec` pencereleri; `yedekAl`/`geriYukle` yalnız ana süreçten. Arayüz: karşılamada "Arşivim"; `Arsivim.tsx` (arama, albümler, etiketler, Kutu, seçim satırı, kalıcı sil onayı, bayat kilit notu), `YedekKutusu.tsx`. Ayrıca `katalogDurumu` arayüz izin listesine eklendi (bozuk kayıt uyarısı pencerede görünmüyordu). `npx.cmd tsc --noEmit` temiz; `npx.cmd vitest run` 32 dosya, 195 test geçti (önce 193); `npm.cmd run derle` temiz. Tarayıcı önizlemesinde Arşivim, Kutu, kalıcı sil onayı, Yedek kutusu ve kilit notu görüldü. Gerçek Electron penceresinde, USB/ikinci diskte DENENMEDİ; arşivde önizleme resmi yok (boş kare) |
| 2026-11-06 | Kullanıcı denemesinden düzeltmeler | "Arşive al" ve "Klasöre kaydet" yalnız açık grubu alır (düğmede sayı); "Klasöre kaydet" alt klasör açmaz, işaret dosyası Windows'ta gizlenir; arşive alma durdurulabilir. 197 test geçti |
| 2026-11-09 | Yayın hazırlığı: lisans ve Windows kurulum dosyası (kullanıcı onayı) | Lisans GPL-3.0-or-later (`LICENSE`, `package.json`). `electron-builder` 26.17.0 (geliştirme bağımlılığı, MIT) ile `npm run paketle` → `release/AYIKLA-Kurulum-0.1.0.exe` (NSIS, ~270 MB, imzasız). Yerel paketler (`better-sqlite3`, `sharp`, `onnxruntime-node`, `ffmpeg-static`) `asarUnpack`; `ffmpeg.ts` kurulu programda `app.asar.unpacked` yolunu kullanır. Kurulu paketin içinde dördü de yüklendi (ELECTRON_RUN_AS_NODE ile). `KULLANIM.md` kurulum, SmartScreen ve yeni düğmelerle güncellendi. Kullanıcı kurulum dosyasıyla kurdu; kurulu programda ayıklama ve "Klasöre kaydet" çalıştı (2026-11-09). Arşivim/Yedek kurulu programda ayrıca denenmedi |
| 2026-11-11 | İlk herkese açık yayın (kullanıcı onayı) | Görsel tur: Arşive al/Arşivim arayüzden kaldırıldı, Klasöre kaydet ana düğme (açık grup, alt klasörsüz), ‹ Ana ekran, + klasör ekle, Bilgisayarımdaki fotoğrafları bul, Sonuçlara dön, çoklu seçim, karanlık/bulanık artık elenmez, model onay kutusu kaldırıldı, sade Hakkında, hafif üzerine gelme hareketi, pencere gezinme koruması. electron-updater 6.8.10 ile GitHub üzerinden otomatik güncelleme; kaldırırken .ayikla silme sorusu. Geçmişteki e-posta GitHub gizli adresiyle değiştirildi (yerel yedek: yedek-eposta-oncesi dalı). Depo: github.com/koraykocak1/AYIKLA (herkese açık), sürüm v0.2.0 yayında. 197 test geçti. Otomatik güncelleme ilk kez 0.2.1 yayınlandığında gerçek olarak denenecek |

**Parti 1 ayrıntıları ve sınırları**
- Arayüz değişmedi. Kaydetme sonucundaki "kopyalandı" sayısı artık yalnız SHA-256 ile doğrulanmış kopyaları sayar.
- Kayıt klasörü kaynağın içinde seçilirse arayüzde mevcut "Kaydedilemedi: …" mesajıyla Türkçe neden görünür.
- Sistem klasörü listesi Windows içindir; Mac karşılığı YAPILMADI.
- Kullanıcının doğrudan seçtiği işaretli klasör yine taranır (bilinçli seçim). İşaret yalnız iç içe bulunan klasörlerde dışlama yapar.
- Bozuk `kayit.json` kenara alındığında karşılama ekranında bir kez sarı notla söylenir (2026-11-04, `katalogDurumu` isteği).

**FAZ 1 #12 kabul raporu (talimat bölüm 6, DoD 1–4; 3 Kasım 2026)**

Testler sentetik dosyalarla geçici klasörlerde çalıştı; gerçek kişisel arşiv kullanılmadı. Hepsi motor düzeyindedir: arşiv işlevleri henüz arayüze bağlı değil.

| DoD | Senaryo | Sonuç | Nasıl doğrulandı |
|---|---|---|---|
| 1 | Kaynak korunur: içe aktarma | geçti | `tests/kabul.test.ts` DoD 1: kaynak klasördeki her dosyanın yolu, SHA-256'sı, boyutu ve mtime'ı önce/sonra aynı |
| 1 | … arşivde silme (kutu + kalıcı sil) | geçti | aynı test |
| 1 | … etiket/albüm (kullanıcı metadatası) | geçti | aynı test |
| 1 | … dışa aktarma | geçti | aynı test (arşivden) + `tests/kaynak-korunur.test.ts` (ayıklama akışından) |
| 1 | … yedek alma | geçti | aynı test |
| 1 | … düzenleme | çalıştırılamadı | Düzenleme özelliği yok (FAZ 3, madde 011) |
| 1 | … EXIF tarih düzeltmesi | çalıştırılamadı | Arşivde tarih düzeltme özelliği yok (madde 042/122) |
| 1 | … toplu adlandırma | çalıştırılamadı | Özellik yok (madde 110) |
| 2 | 1.000 dosyada kopya doğrulaması, aynı içerik tek kopya | geçti | DoD 2: 1.000 dosya (100'ü tekrar) → 900 blob, 1.000 kaynak yolu; sağlık denetimi 900/900 sağlam |
| 2 | Aynı içeriği tekrar alma | geçti | aynı test: ikinci alma 1.000 "kayıtlı", yeni satır yok |
| 2 | Bozuk dosya raporu | geçti (kısmen) | Okunamayan (klasör) ve kaybolan dosya hatada raporlanır, diğerleri sürer. İçe almada görüntü çözülmez: içeriği bozuk JPEG baytlarıyla alınır (görüntü bozukluğu ayıklama akışında `okunamadi` olarak raporlanır) |
| 2 | Disk dolması | geçti (benzetimle) | `ENOSPC` hatası kancayla verildi: durur, yarım kopya kalmaz, sonraki dosyaya geçmez. Gerçek dolu disk DENENMEDİ |
| 2 | Kullanıcı iptali | geçti | `iceAl` durdurma sinyali: alınanlar kayıtlı, kalanlar dokunulmamış, yeniden başlatınca tamamlanır. Arayüzde iptal düğmesi YOK |
| 2 | Ani kapanma | geçti | Ayrı Node süreci 300 dosyayı alırken 50. dosyadan sonra `SIGKILL` ile öldürüldü; açılışta bayat kilit onayla kaldırıldı, sağlık denetimi temiz, yeniden alma 300'e tamamladı. Elektrik kesintisi / işletim sistemi çökmesi DENENMEDİ |
| 2 | Kopyalama sırasında kaynak değişimi | geçti | `tests/arsiv-depo.test.ts`: kopya sırasında değişen kaynak kaydedilmez, yarım kopya kalmaz |
| 3 | Albümden kaldırma arşivden silmez | geçti | DoD 3 |
| 3 | 30 gün varsayılan kutu; geri yükleme | geçti | DoD 3 (29. gün silinmez, geri alınır) |
| 3 | Aynı fiziksel kopyayı paylaşan kayıt korunur | geçti | DoD 3 (31. gün eski öğe kalıcı silinir, blob ve yeni öğe kalır) |
| 3 | Kaynak dosyaya dokunulmuyor | geçti | DoD 3 kaynak görüntüsü |
| 4 | Katalog aç/kapat | geçti | DoD 4 |
| 4 | Migration | geçti | `tests/katalog.test.ts`: şema 1 → 3, eski kayıtlar korunur |
| 4 | Bütünlük testi | geçti | `quick_check` (sağlık denetimi), `integrity_check` (yedek) |
| 4 | Online backup ve geri yükleme | geçti | DoD 4 + `tests/arsiv-yedek.test.ts` |
| 4 | Bozuk/kayıp katalogdan yeniden keşif, kurtarılamayan bilginin dürüst raporu | geçti | DoD 4: bozuk katalog kenara alındı (silinmedi), 4 öğe kurtarıldı, tanımsız dosya raporlandı, "albümler, etiketler, köken, orijinal ad, kutu durumu, çekim tarihi geri gelmedi" raporda. Arayüzde sihirbaz YOK |

DoD 5–10 bu görevin kapsamında değil (büyük arşiv, mahremiyet, çapraz platform, AI, metadata çıktısı, işlem takibi); FAZ 2–4'e kaldı.

**FAZ 1 #12 ayrıntıları ve sınırları**
- `arsiv-kurtar.ts` `katalogKurtar`: yalnız katalog kayıp ya da bozuksa çalışır, arşiv açıkken (kilitliyken) çalışmaz. Bozuk katalog ve yan dosyaları `.bozuk-<zaman>` olarak kenara alınır. Kurtarılan öğenin adı içerik adıdır (`<sha>.jpg`), tarihi dosya tarihidir; öğe `asama = 'kurtarildi'` ile işaretlenir.
- `iceAl`'a durdurma sinyali (`AbortSignal`) eklendi; sonuçta `durduruldu` alanı var. Var olan çağrılar etkilenmedi.

**FAZ 1 #11 ayrıntıları ve sınırları**
- `guvenliAd` grup klasörü adına ve (200 karakter sınırıyla) dışa aktarılan dosyanın adına uygulanır. Ayrılmış ad örnekleri: `CON` → `CON_`, `aux.txt` → `aux_.txt`; `Console`, `COM10` değişmez. Boş kalan ad `Adsız` olur.
- Mac'ten gelen ayrışık (NFD) Türkçe adlar hedefte birleşik (NFC) yazılır; kaynak adı değişmez.
- Uzun yol: Node, Windows'ta mutlak yolları kendisi `\\?\` biçimine çevirdiği için 260+ karakterlik hedefte kopyalama ve SHA-256 doğrulaması çalıştı. Dosya Gezgini ve başka programlar bu kadar uzun yolları açamayabilir; kullanıcıya uyarı YAPILMADI.
- Değişiklik dışa aktarmadaki klasör/dosya adlarını etkiler; daha önce `CON` gibi adlarla oluşan klasör zaten oluşamadığı için eski arşivlerle uyumsuzluk beklenmiyor.

**FAZ 1 #10 ayrıntıları ve sınırları**
- Denetim yalnız okur; hiçbir dosyayı onarmaz, taşımaz ya da silmez (testte `medya/` görüntüsü önce ve sonra aynı). Tek yazdığı, katalogdaki `meta.son_saglik_denetimi` satırıdır.
- Bulduğu sorunlar: değişmiş (boyut ya da SHA-256 tutmuyor), eksik (kaydı var, dosyası yok), kayıtsız (`medya/` içinde kaydı olmayan dosya; yarım kopyalar ve kenara alınmış `.bozuk-*` dosyalar da burada görünür), yanlış `ref_sayisi`, `PRAGMA quick_check` sonucu.
- `bekleme` ile her dosyadan sonra ara verilir, `durdur` ile kesilir (rapor `bitti: false`). Kendiliğinden (periyodik) çalıştırma, arayüzde rapor ve yedekten onarma YAPILMADI.

**FAZ 1 #9 ayrıntıları ve sınırları**
- Yedek arşivin tam kopyasıdır: `katalog/ayikla.db` (SQLite çevrimiçi yedeği, arşiv açıkken alınır, `integrity_check` geçmeden yerine konmaz), `medya/` (her blob adındaki SHA-256 ile okurken ve yazdıktan sonra doğrulanır), `yedek.json` (katalog özeti, şema sürümü, blob sayısı; en son yazılır).
- Yedek klasörünün işareti `tur: "yedek"` taşır: tarayıcı onu atlar, `arsivBul` onu arşiv sanmaz. Hedef boş olmalı ya da aynı arşivin eski yedeği olmalı; arşivin içi, arşivi içine alan klasör ve ağ yolu reddedilir.
- Aynı klasöre yeniden yedek: yedekte aynı özetle duran blob atlanır (yine okunur, özet karşılaştırılır). Arşivden kalıcı silinen dosyalar eski yedekte kalır; yedek budama YAPILMADI.
- Geri yükleme yalnız boş klasöre yapılır ve önce yedeğin tamamını doğrular; tek bir sorun varsa hiçbir şey yazılmaz. Geri yüklenen arşiv aynı kimliği taşır; eski arşiv de duruyorsa `arsivBul` ikisini birden döndürür.
- Zamanlı yedek, arayüz ve çalışma kataloğunun (`~/.ayikla`) yedeği YAPILMADI. Gerçek USB/ikinci diskte DENENMEDİ.

**FAZ 1 #8 ayrıntıları ve sınırları**
- Albüm ve etiket yalnız bağdır; öğe diskte tek kopya kalır. Albümden kaldırmak ve albümü silmek öğeyi silmez, kutuya taşımaz. Kalıcı silinen öğenin bağları veritabanında kendiliğinden (`ON DELETE CASCADE`) kalkar.
- Ad karşılaştırması NFC + Türkçe küçük harfle yapılır ("İzmir" = "izmir"). Aramada ayrıca "ı" ile "i" aynı sayılır (ISTANBUL ↔ İstanbul).
- Arama: 4 haneli sayı (1800–2199) yıl sayılır; diğer her sözcük öğenin adında, etiket yolunda (üst etiketler dahil) ya da albüm adında geçmeli. Sözcük süzmesi bellekte yapılır; büyük arşivde (100 bin+) hız ölçülmedi.
- Yıl, kaydedilen tarihin UTC hâlinden okunur; yılbaşı gecesi çekilen kare yerel saate göre bir önceki yıla düşebilir.
- Otomatik (yapay zekâ) etiket, etiket silme/yeniden adlandırma ve arayüzde albüm/etiket/arama ekranı YAPILMADI.

**FAZ 1 #7 ayrıntıları ve sınırları**
- Kutu ayrı bir klasör değil, katalogdaki durumdur (`oge.silinme`, ISO tarih). Kutudaki öğenin dosyası `medya/` içinde yerinde kalır; geri almak yalnız bu alanı siler.
- Kalıcı silme iki adımlıdır: yalnız kutudaki öğe kalıcı silinir. Önce katalog tek transaction'da güncellenir, sonra dosya silinir; dosya silinemezse kayıtsız dosya kalır (#10 bulur), kaydı olup dosyası olmayan öğe oluşmaz.
- Silinen her dosyanın arşivin `medya/` klasörünün içinde olduğu ayrıca denetlenir; kaynak dosyalara dokunulmaz (testte kaynak klasörün görüntüsü aynı).
- Kutudaki içerik yeniden içe alınırsa yeni öğe açılır, blob paylaşılır (`ref_sayisi` 2). Eski öğeyi geri almak iki öğe yaratmaz: kaynak yolları canlı öğeye taşınır.
- 30 günlük boşaltma (`kutuyuBosalt`) kendiliğinden çalışmaz; açılışta ya da arayüzden çağrılması YAPILMADI. Arayüzde kutu ekranı YAPILMADI.

**FAZ 1 #6 ayrıntıları ve sınırları**
- Aynı içerik bir kez kopyalanır: önce kaynağın SHA-256'sı alınır; blob yoksa geçici dosyaya kopyalanır, kaynak değişmedi mi ve kopyanın özeti tutuyor mu bakılır, sonra içerik adına taşınır. Kaynak yalnız okunur (testte kaynak klasörün özet/boyut/mtime görüntüsü önce ve sonra aynı).
- Aynı içerik ikinci bir yoldan gelirse yeni öğe oluşmaz; yol `kaynak_yolu`'na eklenir. Aynı yol yeniden gelirse yalnız `son_gorulme` güncellenir.
- `ref_sayisi`: blobu kullanan öğe sayısı. İçerik yalnız kutudaki bir öğede varsa yeniden içe alınınca yeni öğe açılır ve blob paylaşılır (#7 bunu korur).
- Çökmeden kalmış kayıtsız dosya aynı içerikteyse kullanılır, farklıysa silinmez, `.bozuk-<zaman>` olarak kenara alınır. Kayıtlı blob yerinde ve boyutu tutuyorsa yeniden okunmaz; sessiz bozulmayı #10 yakalar.
- Arşivin kendi içinden ve desteklenmeyen türde dosya alınmaz. Disk dolarsa durur.
- Yalnız ilk aşama (kopya + özet). Tarih okuma, önizleme, yapay zekâ ve arayüzdeki "arşive al" düğmesi YAPILMADI. Ayıklama akışı (`~/.ayikla`) değişmedi.
- Çalışma kataloğu (`~/.ayikla/katalog.db`) da şema 2'ye geçer; yeni tablolar orada boş kalır.

**FAZ 1 #5 ayrıntıları ve sınırları**
- Arşiv yalnız boş (ya da olmayan) klasörde kurulur; içinde dosya olan klasör reddedilir, hiçbir şey yazılmaz. Parti 1'in dışa aktarma işareti (kimliksiz `.ayikla-arsiv`) arşiv sayılmaz.
- Kimlik dosyası: `{uygulama, tur: "arsiv", surum: 1, kimlik: <UUID>, ad, olusturma}`. Daha yeni sürümün arşivi açılmaz.
- Kilit: `kilit` dosyası `wx` ile (yalnız yoksa) yazılır, dakikada bir tazelenir. Ölü süreç, 5 dakikadır tazelenmemiş kilit ya da yarım yazılmış kilit "bayat" sayılır; kullanıcıya sorulmadan kaldırılmaz (`bayatKilidiKaldir`). Başka bilgisayarın taze kilidi doğrulanamadığı için reddedilir. Bırakırken yalnız kendi jetonunu taşıyan kilit silinir.
- Disk harfi: `arsivBul` önce son yere, sonra aynı yola her diskte, sonra disklerin ilk 2 klasör düzeyine bakar; `Windows`, `Program Files` vb. atlanır. Aynı kimlikte birden çok klasör varsa hepsi döner (seçim kullanıcıda).
- Arayüz bağlantısı (arşiv seç, bilinen arşivler, "kilidi kaldır" sorusu) YAPILMADI; taslak onayı bekliyor. Ayıklama akışı hâlâ `~/.ayikla` çalışma klasörünü kullanıyor.
- Gerçek USB disk ve iki ayrı uygulama penceresiyle DENENMEDİ (iki süreç testi Node ile).

**FAZ 1 #4 ayrıntıları ve sınırları**
- Katalog yeri: `~/.ayikla/katalog.db` (çalışırken yanında `-wal`, `-shm`). Eski `kayit.json` olduğu yerde kalır; programın yeni sürümü onu bir daha okumaz.
- Medya kaydı tabloda JSON olarak duruyor (şema sürümü 1). Ayrıntılı şema #6 ve #8'de gelecek.
- Bozuk veritabanı `katalog.db.bozuk-<zaman>` olarak kenara alınıp eski `kayit.json`'dan yeniden kurulur; bu durumda geçişten sonraki düzeltmeler yalnız kenara alınan dosyada kalır. Karşılama ekranında bir kez sarı notla söylenir (2026-11-04).
- Programın eski sürümüne dönülürse eski sürüm `kayit.json`'u okur; yeni katalogdaki değişiklikleri görmez.
- Eşlenmiş ağ sürücüsü algılanmıyor; yalnız UNC yolu reddediliyor.

**FAZ 1 #2–#3 ayrıntıları ve sınırları**
- Modeller zaten indirildiyse hiçbir şey değişmez: onay sorulmaz, onay dosyası yazılmaz, model yalnız diskten açılır.
- Karşılama: model inmemişse klasör seçilince ayıklama kendiliğinden başlamaz; kürenin altında boyut, kaynak ve lisans gösteren kutu açılır ("İndir ve ayıkla" / "Şimdi değil"). Mevcut stiller (`.altin`, `.ikincil`) kullanıldı. Geliştirme önizlemesinde `?ilk` adresiyle denenir. CLI `--indirmeye-izin-ver` ister.
- Tarayıcı önizlemesinde kutunun açıldığı ve onayın kaydedildiği görüldü; ekran geçişi gizli panelde animasyon durduğu için izlenemedi (eski akış da aynı). Gerçek Electron penceresinde DENENMEDİ.
- Gerçek boyut ~610 MB (CLIP) + ~440 MB (çeviri). Ayıklama ekranındaki "~350 MB" metinleri düzeltildi.
- Lisans riskleri: ffmpeg.exe ve ffprobe.exe GPLv3 (ffprobe 2018 Zeranoe derlemesi, kaynağı belirsiz); opus-mt ağırlıkları CC-BY 4.0 kabul edildi (atıf gerekir); model sürümü sabitlenmedi.
