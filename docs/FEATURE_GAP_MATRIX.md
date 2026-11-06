# AYIKLA — 130 Karar Boşluk Matrisi (FAZ 0)

Tarih: 3 Kasım 2026 · Kod tabanı: `main`, commit `f3fee81` · Kaynak: `claude_130_karar_uygulama_talimati.md`
İlgili belgeler: [PRODUCT_REQUIREMENTS_130_TR.md](PRODUCT_REQUIREMENTS_130_TR.md) · [ARCHITECTURE_AND_DATA_SAFETY.md](ARCHITECTURE_AND_DATA_SAFETY.md) · [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)

## Bu matris neye dayanıyor

Matris yalnız gerçekten okunan koda dayanır: `src/motor/*`, `src/ana/*`, `src/ortak/mesajlar.ts`, `src/cli.ts`, `src/isci-giris.ts`, `src/arayuz/*`, `tests/*`, `package.json`.

**Bugünkü ürün:** AYIKLA bir **ayıklama ve kopyalama aracıdır**, arşiv yöneticisi (DAM) değildir. Akış: klasör seç → tara (`tarayici.ts`) → önizleme, tarih, kalite, dHash ve CLIP vektörü üret (`isci.ts`) → gruplara ayır, kopyaları ve bulanık/karanlık olanları işaretle → kullanıcı düzeltir → seçilen hedefe `Grup/Yıl/Ay-Adı` biçiminde kopyala (`disari-aktar.ts`). Kaynak dosyalar yalnız okunur. Katalog `~/.ayikla/kayit.json` dosyasıdır (SQLite değil; FAZ 1 #4’ten beri `~/.ayikla/katalog.db`, SQLite). Kalıcı bir "arşiv kökü", albüm, etiket, arama, geri dönüşüm kutusu ya da yedek yoktur.

Bu yüzden 130 maddenin çoğu **Yok** durumundadır. Bu bir hata değil, ürünün bugünkü kapsamıdır. Bu oturumda uygulanan ilk parti (bkz. yol haritası, "Parti 1") için satırlar ayrıca işaretlenir.

**Durum:** ✅ Uygulanmış · 🟡 Kısmen · ⬜ Yok · ⛔ Blokeli (yol haritası, hukuk, ücret ya da önkoşul nedeniyle şimdi yapılamaz)
**Öncelik:** P0 = arşiv çekirdeği ve veri güvenliği (FAZ 1) · P1 = akıllı yerel medya (FAZ 2) · P2 = profesyonel araçlar ve cihazlar (FAZ 3) · P3 = uzun ömür ve dağıtım (FAZ 4)

## Özet sayım

| Durum | Adet |
|---|---|
| ✅ Uygulanmış | 5 (003, 025, 068, 078, 120) |
| 🟡 Kısmen | 80 |
| ⬜ Yok | 39 |
| ⛔ Blokeli | 6 (028, 034, 095, 100, 102, 113) |
| **Toplam** | **130** |

"Uygulanmış" sayısı düşük ve dürüsttür: dört maddenin ikisi yasak/sınır kuralıdır (şifre yok, telemetri yok).

**Parti 1'den sonra (3 Kasım 2026):** 029, 115, 116 "Yok"tan "Kısmen"e çıktı; 041, 048, 050, 058, 075 aynı durumda kaldı ama açıkları daraldı. Hiçbiri "Uygulanmış" sayılmadı, çünkü kalıcı arşiv ve içe aktarma henüz yok.

**FAZ 1 #2–#3’ten sonra (3 Kasım 2026):** 086 ve 087 "Yok"tan "Kısmen"e çıktı (lisans tablosu `docs/LISANSLAR.md`); 055, 064, 073, 081 "Kısmen" kaldı ama açıkları daraldı: model artık onaysız inmiyor. Karşılama ekranına onay adımı eklendi; paket seçimi, bağlantı geçmişi ve lisans çözümleri eksik olduğu için hiçbiri "Uygulanmış" sayılmadı.

**FAZ 1 #4’ten sonra (3 Kasım 2026):** katalog artık SQLite (`katalog.db`, `better-sqlite3`); `kayit.json` bir kez aktarılır ve yedek olarak kalır. 070 "Yok"tan "Kısmen"e çıktı (UNC ağ yolu reddedilir); 058 ve 107 "Kısmen" kaldı ama açıkları daraldı: online yedek, ayrıntılı şema ve arşiv manifesti henüz yok. 041’in kanıtı güncellendi.

**FAZ 1 #5’ten sonra (3 Kasım 2026):** arşiv kökü motorda var (`arsiv.ts`): kimlik, dizin yapısı, tek-yazıcı kilidi, disk harfi değişince yeniden bulma. 006, 071, 072, 121 "Yok"tan "Kısmen"e çıktı. Arayüze bağlanmadığı için hiçbiri "Uygulanmış" sayılmadı.

**FAZ 1 #6’dan sonra (3 Kasım 2026):** içerik adresli içe aktarma motorda var (`arsiv-depo.ts`, şema 2). 032 ve 047 "Yok"tan "Kısmen"e çıktı; 053, 058, 107 "Kısmen" kaldı ama açıkları daraldı.

**FAZ 1 #7’den sonra (3 Kasım 2026):** geri dönüşüm kutusu motorda var (`arsiv-kutu.ts`). 013 ve 117 "Yok"tan "Kısmen"e çıktı.

**FAZ 1 #8’den sonra (3 Kasım 2026):** sanal albüm, hiyerarşik etiket ve klasik arama motorda var (`arsiv-album.ts`, şema 3). 010 ve 026 "Yok"tan "Kısmen"e çıktı; 009 ve 117 "Kısmen" kaldı ama açıkları daraldı.

**FAZ 1 #9’dan sonra (3 Kasım 2026):** doğrulanmış tam yedek ve geri yükleme motorda var (`arsiv-yedek.ts`). 015 ve 080 "Yok"tan "Kısmen"e çıktı; 058'in açığı daraldı.

**FAZ 1 #10’dan sonra (3 Kasım 2026):** arşiv sağlık denetimi motorda var (`arsiv-saglik.ts`). 130 "Yok"tan "Kısmen"e çıktı.

**FAZ 1 #11’den sonra (3 Kasım 2026):** 120 "Kısmen"den "Uygulanmış"a çıktı: kabul şartlarının üçü de testle sağlandı ve kod mevcut dışa aktarma akışında çalışıyor (uygulama penceresinde denenmedi).

**FAZ 1 #12’den sonra (3 Kasım 2026):** uçtan uca kabul testi (DoD 1–4) yazıldı; sonuçlar yol haritasında "FAZ 1 #12 kabul raporu". Kayıp/bozuk katalogdan yeniden keşif için `arsiv-kurtar.ts` eklendi: 124 "Yok"tan "Kısmen"e çıktı; 041'in kanıtı güncellendi.

## Matris

### A. Ürün hedefi, içe aktarma, sınıflandırma (001–010)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 001 | Kişisel + profesyonel kitle | 🟡 | `arayuz/ekranlar/*` | Basit akış var; profesyonel araçlar (puan, etiket, RAW akışı) yok | P2 | 011, 035 | Basit akış 3 adımda biter; gelişmiş araçlar ayrı yerde |
| 002 | Hibrit AI (yerel temel) | 🟡 | `motor/sahne-model.ts` (CLIP yerel) | Yerel kısım var; isteğe bağlı bulut katmanı yok | P2 | 012, 079 | İnternet kapalıyken gruplama çalışır (model indirildiyse) |
| 003 | Buluta otomatik fotoğraf yok | ✅ | Kodda bulut API çağrısı yok (`fetch` yalnız `ana.ts`'te yerel dosya için) | Bulut gelirse izin ekranı şart | P0 | 081 | Ağ izleme: tarama/aktarma sırasında dış bağlantı yok |
| 004 | Esnek tarama + klasör izleme | 🟡 | `motor/tarayici.ts` `tara()` | Seçilen klasör taranır; izleme (watcher) ve sistem klasörü dışlama yok | P0 (dışlama) / P1 (izleme) | 050, 115 | Sistem/arşiv klasörü taranmaz; izlenen klasördeki yeni dosya algılanır |
| 005 | Çoklu medya biçimi | 🟡 | `tarayici.ts` FOTO/VIDEO, `ham.ts` (.nef), `onizleme.ts` (HEIC) | TIFF, GIF, CR2/CR3/ARW/DNG, MKV, PDF yok; desteklenmeyenler raporlanmıyor | P1 | 074, 049 | Her biçim için örnek dosya; desteklenmeyen sayısı görünür |
| 006 | Kullanıcı seçtiği arşiv konumu | 🟡 | `arsiv.ts` (FAZ 1 #5): `arsivOlustur` boş klasörü arşiv kökü yapar (kimlik `.ayikla-arsiv`), `Arsiv.ac` kilidi alıp kataloğu açar; dolu klasör, kaynağın içi ve ağ yolu reddedilir. Sonuç ekranında "Arşive al" (2026-11-06): arşiv yoksa klasör seçme kutusu, seçilen arşiv `arsiv.json` ile hatırlanır (`sunucu.ts` `arsivDurumu`) | Bilinen arşivler listesi, arşivi taşıma, çevrimdışı disk durumu (şimdilik yalnız "Disk takılı mı?" notu), bayat kilidi kaldırma düğmesi YAPILMADI; "Klasöre kaydet" hâlâ her seferinde hedef sorar | P0 | 071, 121 | Arşiv kökü değişir, yollar yeniden çözülür ✅ motor (`tests/arsiv.test.ts`, `arsivBul`); arayüzde "Arşive al" ✅ (`tests/sunucu.test.ts`: kaynak aynı kalır, ikinci alımda yeni kopya yok, arşiv hatırlanır) |
| 007 | Aynı / benzer + en iyi kare | 🟡 | `parmakizi.ts` dHash, `isci.ts` `kopyalariIsaretle` | Bayt-aynı ve görsel-benzer ayrılmıyor; karşılaştırma ekranı yok. Otomatik silme yok | P1 | 029, 036 | İki tür ayrı sayılır; öneri kullanıcıca değişebilir |
| 008 | İsteğe bağlı yerel yüz gruplama | ⬜ | — | Tamamı | P1 | 095, 096, 073 | Varsayılan kapalı; izinsiz yüz modeli yüklenmez |
| 009 | Çoklu kategori + sanal albüm | 🟡 | `gruplar.ts`, `isci.ts` `grupBelirle`; arşivde sanal albüm `arsiv-album.ts` (FAZ 1 #8): `albumOlustur/albumeEkle/albumdenKaldir/albumSil`, şema 3 `album`, `album_oge` | Ayıklama ekranında bir dosya hâlâ tek grupta; grup silme/düzenleme yok; arayüzde albüm ekranı YAPILMADI | P0 (albüm) / P1 | 058 | Bir öğe 2 albümde, diskte tek kopya ✅ (`tests/arsiv-album.test.ts`) |
| 010 | Birleşik arama | 🟡 | `arsiv-album.ts` `ara` (FAZ 1 #8): serbest metin (4 haneli sayı = yıl, diğer sözcükler ad/etiket/albümde), tür, tarih aralığı, albüm, etiket alt ağacı; Türkçe büyük/küçük harf | Yapay zekâ ile anlamsal arama (FAZ 2) ve arayüzde arama kutusu YAPILMADI; büyük arşivde hız ölçülmedi | P0 (klasik) / P1 (AI) | 058, 089 | "2024 deniz" sorgusu doğru sonuç verir ✅ klasik (etiket/ad/albümle; görüntüden anlama YAPILMADI) |

### B. Düzenleme, güvenlik, yedek, akıllı analiz (011–025)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 011 | Temel + ileri + AI düzenleme | ⬜ | — | Tamamı; tahribatsız düzenleme modeli yok | P2 | 052 | Düzenleme sonrası kaynak hash'i aynı |
| 012 | Yerel AI + kendi sağlayıcı (BYOK) | 🟡 | Yerel CLIP + çeviri modeli | BYOK ve maliyet bildirimi yok | P2 | 079 | Anahtar yokken tüm temel işlevler çalışır |
| 013 | Geri dönüşüm kutusu (30 gün) | 🟡 | `arsiv-kutu.ts` (FAZ 1 #7): `kutuyaTasi` (`oge.silinme`), `kutudakiler`, `kutudanGeriAl`, `kaliciSilinmeTarihi`, `kutuyuBosalt` (30 gün); kutudayken dosya yerinde kalır | Arayüzde kutu ekranı YAPILMADI; 30 günlük boşaltma kendiliğinden çalışmıyor (çağrılması gerekir); ayıklama ekranının "Elenecek" işareti kutuya bağlı değil | P0 | 058, 117 | Silinen öğe 30 gün kutuda; geri yüklenir; kaynak duruyor ✅ (`tests/arsiv-kutu.test.ts`) |
| 014 | Gelişmiş dışa aktarma | 🟡 | `disari-aktar.ts` (Grup/Yıl/Ay) | Albüm seçimi, format dönüşümü, metadata politikası, ZIP yok | P1 | 030, 054 | Dışa aktarma arşivi değiştirmez |
| 015 | Manuel + zamanlı yedek | 🟡 | `arsiv-yedek.ts` (FAZ 1 #9): `arsivYedekle` (katalog çevrimiçi yedeği + her blob doğrulanarak; aynı klasöre ikinci yedek yalnız yeniyi kopyalar), `yedektenGeriYukle` (boş klasöre, aynı kimlikle) | Zamanlı (otomatik) yedek ve arayüzde yedek ekranı YAPILMADI; arşivden silinen dosyalar eski yedekte kalır (yedek budanmaz) | P0 | 058, 080 | Yedek → başka klasöre geri yükleme → katalog aynı ✅ (`tests/arsiv-yedek.test.ts`: 7 tablo ve her blob özeti aynı) |
| 016 | Durdurulabilir arka plan analizi | 🟡 | `ana.ts` utilityProcess, `sunucu.ts` `durdur`, `kayit.json` önbelleği | Durdur var; duraklat/sürdür, CPU sınırı, "analiz edilmemiş" listesi yok. Yeniden açınca önbellek sayesinde hızlı devam | P1 | 040, 094 | Durdur → yeniden başlat → işlenmiş dosya yeniden işlenmez |
| 017 | Kaynak değişikliği algılama | 🟡 | `kayit.ts` `anahtarUret` (yol+boyut+mtime) | Değişen dosya yeni kayıt olur ama bildirilmez; taşınan dosya tanınmaz | P1 | 108 | Kaynak değişince bildirim; eski sürüm korunur |
| 018 | Yerel profiller + görünüm gizleme | ⬜ | — | Tamamı (şifresiz) | P2 | 118 | Profil değişince albüm/ayar ayrı |
| 019 | Video içerik/sahne analizi | 🟡 | `ffmpeg.ts` (süre, boyut, tarih), `isci.ts` 3 kare | Codec, sahne bölümleme, sahneye atlama yok | P1 | 091 | Videoda zaman damgalı sahne listesi |
| 020 | OCR ve belge anlama | ⬜ | — | Tamamı | P1 | 088, 073 | Türkçe örnek belgede metin aranabilir |
| 021 | Etkinlik/anı önerileri | ⬜ | (Tarih bilgisi var: `tarih.ts`) | Tamamı | P1 | 101 | Öneri "öneri" olarak görünür, reddedilebilir |
| 022 | Renk analizi ve arama | 🟡 | `renk.ts` `ortalamaRenk` (yalnız kart rengi) | Palet, baskın renk, HEX arama yok | P1 | 010 | `#1e90ff` aramasında mavi ağırlıklı sonuçlar |
| 023 | Teknik kalite ve estetik ayrı | 🟡 | `kalite.ts` netlik/parlaklık/aydınlık | Estetik puanı yok; puanlar gösterilmiyor | P1 | 007 | İki puan ayrı alanda; puan silme tetiklemez |
| 024 | Hassas içerik saptama + gizleme | ⬜ | — | Tamamı (şifresiz gizleme) | P2 | 097, 118 | Yanlış işaret düzeltilebilir; otomatik taşıma yok |
| 025 | Parola/PIN/şifreli albüm YOK | ✅ | Kodda parola/PIN yok | — (yasak madde, uygulanmayacak) | P0 | — | Kod taraması: parola/PIN/şifreleme yok |

### C. Etiket, aktarım, depolama, kullanıcı akışı (026–045)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 026 | Otomatik + manuel etiket | 🟡 | `arsiv-album.ts` (FAZ 1 #8): elle ve toplu etiket, hiyerarşi `Araçlar > Otomobil` (`etiket.ust_id`), üst etiketle süzme alt etiketleri kapsar; `oge_etiket.kaynak = 'kullanici'` | Otomatik (yapay zekâ) etiket ve arayüz YAPILMADI; etiket silme/yeniden adlandırma yok | P1 | 058 | "Araçlar > Otomobil" filtresi çalışır ✅ (`tests/arsiv-album.test.ts`) |
| 027 | Tarih/konum düzeltme | 🟡 | `tarih.ts` (6 kaynak, `tahmini` bayrağı) | Kullanıcı düzeltmesi ve konum yok | P1 | 042 | Düzeltme katalogda; kaynak dosya değişmez |
| 028 | Win/Mac ortak harici SSD + eşitleme | ⛔ | — | Mac sonra (yol haritası) | P2 | 072, 121 | — |
| 029 | Kopya bütünlüğü SHA-256 | 🟡 | `disari-aktar.ts` `tekDosya`, `dosyaOzeti` (Parti 1) | Dışa aktarmada yapıldı: SHA-256 doğrulama, 1 yeniden deneme, doğrulanmış sayı. İçe aktarma/arşiv için YAPILMADI (arşiv yok) | P0 | 116 | `tests/disari-aktar.test.ts`: bozuk kopya başarılı sayılmaz ✅ |
| 030 | Kural tabanlı klasör dışa aktarımı | 🟡 | `hedefKlasor()` Grup/Yıl/Ay | Başka şablon, özel kural yok | P1 | 014 | "Yıl/Ay/Gün" şablonu doğru klasörü üretir |
| 031 | Önizleme ve önbellek yönetimi | 🟡 | `onizleme.ts` 384 px, `~/.ayikla/onizleme` | Temizleme, eskimiş cache, alan raporu yok | P1 | — | Cache silinince yeniden üretilir; medya etkilenmez |
| 032 | Birebir dosyada tekilleştirme | 🟡 | `arsiv-depo.ts` `iceAl` (FAZ 1 #6): SHA-256 içerik adresi `medya/<sha[0:2]>/<sha>.<uzantı>`; aynı içerik bir kez kopyalanır, kaynak yolları öğenin altına eklenir (`blob`, `oge`, `kaynak_yolu`, şema 2) . Sonuç ekranındaki "Arşive al" bunu kullanır; ilerlemede "K kopya zaten arşivde" gösterilir (2026-11-06) | Ayıklama ekranının kopya işareti hâlâ dHash (görsel benzerlik); arşivi gezme ekranı (Arşivim) YAPILMADI | P1 | 029, 117 | Aynı bayt 2 kaynak → 1 kopya, 2 kaynak yolu ✅ (`tests/arsiv-depo.test.ts`); ayıklamadan arşive iki kez alınca yeni kopya yok ✅ (`tests/sunucu.test.ts`) |
| 033 | Telefon/kamera/SD aktarımı | 🟡 | SD/kamera klasörü normal klasör gibi taranabilir | MTP/PTP, yeni dosya tespiti yok (telefon ertelendi) | P2 | 029 | SD karttan alma kaynakta iz bırakmaz |
| 034 | QR eşleşmeli Wi-Fi aktarım | ⛔ | — | Telefon desteği ertelendi | P2 | 033 | — |
| 035 | Yıldız, favori, renk etiketi | ⬜ | — | Tamamı | P1 | 058 | 1.000 öğeye toplu puan tek işlemde |
| 036 | Gelişmiş görüntüleme/karşılaştırma | 🟡 | `bilesenler/BuyukGorunum.tsx` (büyük görünüm, ok tuşları) | Yakınlaştırma, slayt, yan yana kıyas yok | P1 | 007 | İki kare senkron yakınlaşır |
| 037 | Güven eşiğiyle sınıflandırma | 🟡 | `sahne-puan.ts` `DIGER_ESIK`, `KARARSIZ_FARK` | Düşük güven "Diğer"e düşer ama "öneri" diye gösterilmez | P1 | 098 | Düşük güvenli öğe "öneri" etiketiyle görünür |
| 038 | Yönetilebilir bildirimler | ⬜ | — | Tamamı | P2 | 040 | Her tür ayrı kapatılır |
| 039 | Akıllı albümler | ⬜ | — | Tamamı | P1 | 058, 057 | Kurala uyan yeni dosya kendiliğinden albümde |
| 040 | Merkezi işlem yöneticisi | 🟡 | `sunucu.ts` tek iş + `aktarim` olayı | Kuyruk, duraklat/sürdür, yeniden dene yok | P1 | 094 | 3 işten biri hata verir, diğerleri sürer |
| 041 | Kesintiden devam / crash recovery | 🟡 | `katalog.ts` SQLite transaction (FAZ 1 #4), bozuk JSON ve bozuk veritabanı kenara alınır; `disari-aktar.ts` geçici kopya (Parti 1) | İşlem günlüğü/checkpoint ve iş kuyruğunda kaldığı yerden devam YAPILMADI; arşive içe almada her dosya kendi transaction'ında (FAZ 1 #6), yarıda öldürülen içe alma yeniden çalıştırılınca kalanı tamamlar (FAZ 1 #12) | P0 | 029, 058 | Bozuk katalog `kayit.json.bozuk-*` olarak kalır ✅; yarım kopya final adla kalmaz ✅; ani kapanmadan sonra arşiv tutarlı ✅ (`tests/kabul.test.ts`, ayrı süreç öldürülerek) |
| 042 | Üç katmanlı metadata | 🟡 | `IslenmisMedya`: `tarih/tarihKaynagi` (kaynak), `grupId` (AI), `elleGrup/geriAlindi` (kullanıcı) | Katmanlar tek nesnede; ham EXIF saklanmıyor | P0 (şema) | 058 | AI yeniden çalışınca `elleGrup` korunur (testi var) |
| 043 | Düzeltmelerden yerel öğrenme | ⬜ | (`elleGrup` yalnız o dosya için) | Kural öğrenme ve silme | P2 | 042 | Silinen tercih sonraki öneriyi etkilemez |
| 044 | Dış uygulamalarla çalışma | ⬜ | — | "Birlikte aç", dışarı sürükleme | P2 | 052 | Dış düzenleme yeni sürüm olarak gelir |
| 045 | Sanal galeri | 🟡 | `kartDuzeni.ts`, `KartSahnesi.tsx` (WebGL tuval) | Tüm liste bellekte; sayfalama/sanal kaydırma yok | P1 | 076 | 100 bin öğede bellek bütçesi aşılmaz |

### D. Performans, güvenli işlem, profesyonel akış (046–067)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 046 | Donanıma duyarlı modlar | 🟡 | `sahne-model.ts` ekran kartı/işlemci seçimi | Tasarruf/Dengeli/Performans yok | P2 | 094 | Pil modunda iş hızı düşer |
| 047 | Aşamalı içe aktarma | 🟡 | `arsiv-depo.ts` `iceAl` (FAZ 1 #6) yalnız ilk aşamayı yapar: doğrulanmış kopya + SHA-256, öğe `asama = 'kopyalandi'` ile kaydedilir | Tarih/önizleme ve yapay zekâ aşamaları arşiv öğelerine bağlanmadı; iş kuyruğu yok (040, 094) | P1 | 029, 058 | Kopya bitince öğe katalogda ✅; "galeri açılır, AI sonra" YAPILMADI |
| 048 | Kopya öncesi disk alanı | 🟡 | `disari-aktar.ts` ENOSPC'de durur, geçici dosyayı siler (Parti 1) | Önceden alan hesabı ve uyarı YAPILMADI | P0 | 029 | Dolu diskte yarım dosya kalmaz; önceden uyarı |
| 049 | Bozuk/desteklenmeyen dosya | 🟡 | `isci.ts` `okunamadi` olayı; tek hata taramayı durdurmaz | Desteklenmeyen uzantılar sayılmıyor; rapor ekranı yok | P1 | 005 | Bozuk JPG raporda; tarama sürer |
| 050 | Hariç tutma kuralları | 🟡 | `tarayici.ts` `klasoreGirilir`: noktayla başlayanlar, sistem klasörleri, AppData, çalışma klasörü, `.ayikla-arsiv` işaretliler, bağlantılar (Parti 1) | Kullanıcı yönetimli kural (uzantı/klasör/boyut) YAPILMADI | P1 | 115 | `tests/tarayici.test.ts` ✅ |
| 051 | Live Photo eşleri | ⬜ | — | HEIC+MOV ilişkisi | P2 | 109 | İki parça birlikte aktarılır |
| 052 | Dosya sürüm geçmişi | ⬜ | — | Tamamı | P2 | 011 | Eski sürüme dönülür |
| 053 | Köken/provenance | 🟡 | `IslenmisMedya.yol`, `SonArsiv`; arşivde `kaynak_yolu` (FAZ 1 #6): her öğe için çoklu yol, boyut, mtime, cihaz adı, ilk/son görülme; `oge.eklenme`, `oge.ad_orijinal` (NFC) | Arayüzde köken gösterimi yok; EXIF'teki cihaz/kamera bilgisi kökene yazılmıyor | P1 | 058 | Kaynak taşınsa da ilk yol kayıtta ✅ (yollar silinmez, yalnız eklenir) |
| 054 | Gizlilik odaklı dışa aktarma | ⬜ | (Kopya birebirdir; EXIF olduğu gibi kalır) | GPS kaldırma profilleri | P1 | 014 | Çıktıda GPS gerçekten yok (okuyarak doğrula) |
| 055 | Tam çevrimdışı temel işlev | 🟡 | Model indirildikten sonra ağsız çalışır: diskte tamsa `env.allowRemoteModels=false` (`sahne-model.ts`); izinsiz indirme yok (`model-izni.ts`, FAZ 1 #2) | Karşılama onay adımı eklendi (`Karsilama.tsx`); internetsiz ilk açılışta ayrı bir mesaj YAPILMADI (indirme hatası mevcut "Ayıklama başlatılamadı" kutusunda görünür) | P0 (izin) | 073, 081 | `tests/model-izni.test.ts`: modeller inmişse yükleyici ağsız çağrılır ✅; gerçek önbellekte 0 ağ çağrısıyla açıldı ✅ |
| 056 | Klavye kısayolları | 🟡 | `BuyukGorunum.tsx` ←/→/Esc; `Sonuc.tsx` Esc | Seçim, puan, geri al kısayolu yok | P2 | 035 | Kısayollar Win/Mac'e uygun |
| 057 | Kayıtlı aramalar | ⬜ | — | Tamamı | P1 | 010 | Kayıtlı arama yeni dosyayı içerir |
| 058 | Güvenli yerel katalog (SQLite) | 🟡 | `katalog.ts` (FAZ 1 #4): `better-sqlite3`, WAL + `synchronous=FULL`, tek transaction, adım adım şema (sürüm 2'de `blob`/`oge`/`kaynak_yolu`, FAZ 1 #6); `kayit.json` → DB geçişi; bozuk DB ve bozuk JSON kenara alınır ; arşiv kataloğunun çevrimiçi yedeği + `integrity_check` (FAZ 1 #9) | Çalışma kataloğunun (`~/.ayikla`) yedeği ve meta katmanları (`meta_ai`/`meta_kullanici`) YAPILMADI; sürüm 3'te `album`/`album_oge`/`etiket`/`oge_etiket` (FAZ 1 #8) | P0 | — | Bozuk katalog veri kaybettirmez ✅; migration testi ✅ (`tests/katalog.test.ts`) |
| 059 | Güvenli güncelleme | ⬜ | `npm run kur` yalnız kısayol | Paketleme, migration öncesi yedek | P3 | 058, 100 | Güncelleme sonrası katalog açılır |
| 060 | Açık/taşınabilir arşiv | 🟡 | `kayit.json` düz JSON; dışa aktarım normal klasör | Belgelenmiş JSON/CSV dışa aktarma yok | P1 | 058 | Dışa aktarılan JSON başka araçla okunur |
| 061 | Yerel hata günlüğü | 🟡 | `okunamadi` olayı (yalnız bellekte) | Kalıcı günlük, hata kodu, yol redaksiyonu | P1 | — | Günlükte tam kişisel yol yok |
| 062 | Kaldırmada arşiv koruma | ⬜ | Kurulum paketi yok | Kaldırıcı politikası | P3 | 059 | Kaldırma arşivi silmez |
| 063 | Modüler AI | 🟡 | `SahneModeli` arayüzü (`tipler.ts`); model hatası `model:hata` olayı | Modüller ayrı açılıp kapanmıyor | P1 | 092 | Model çökünce galeri çalışır |
| 064 | Maliyetsiz + lisans uygunluğu | 🟡 | Ücretli servis yok; lisans tablosu `docs/LISANSLAR.md` (FAZ 1 #3) | Açık riskler: ffmpeg.exe GPLv3 (kaynak teklifi); kaynağı belirsiz ffprobe.exe 2026-11-03'te kaldırıldı; opus-mt ağırlık lisansı çelişkili (CC-BY 4.0 kabul edildi, atıf gerekir), `dxil.dll` lisansı doğrulanmadı | P0 (yayın öncesi) | 086 | Lisans tablosu var; "doğrulanmadı" kalemleri açık |
| 065 | Çok dil (TR + EN) | 🟡 | Arayüz yalnız Türkçe; `ingilizceyeCevir` | Dil sistemi (i18n) yok | P2 | — | Dil değişince tüm metinler değişir |
| 066 | İlk kullanım sihirbazı | ⬜ | `Karsilama.tsx` doğrudan klasör ister | Arşiv konumu, AI paket onayı | P1 | 006, 073 | Sihirbaz kısa; atlanabilir |
| 067 | Erişilebilirlik | 🟡 | `MotionConfig reducedMotion="user"`, `prefers-reduced-motion`, bazı `aria-label` | Yazı ölçekleme, tam klavye, ekran okuyucu denetimi | P2 | — | Klavyeyle uçtan uca akış |

### E. Mimari, dağıtım, süreç güvenliği (068–083)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 068 | Çapraz platform teknoloji | ✅ | Electron 45 + React 19 + TS (`package.json`) | Karar: Electron'da kalınır; Tauri geçişi maliyetli, kazancı düşük | — | — | — |
| 069 | Katmanlı modüler mimari | 🟡 | arayüz ↔ `ana.ts` IPC ↔ `isci.mjs` utilityProcess ↔ `motor/*` | Katalog/medya/AI ayrı modül değil | P1 | 058 | Motor çökünce arayüz açık kalır |
| 070 | SQLite ve WAL sınırları | 🟡 | `katalog.ts` `agYoluMu`: UNC (`\\sunucu\…`, `\\?\UNC\…`) yolda katalog açılmaz (FAZ 1 #4) | Eşlenmiş ağ sürücüsü (`Z:`) ve bulut eşitleme klasörü anlaşılmıyor | P0 (SQLite ile) | 058 | Ağ yolundaki DB reddedilir ✅ (UNC); eşlenmiş sürücü YAPILMADI |
| 071 | Mantıksal arşiv dizini | 🟡 | `arsiv.ts` (FAZ 1 #5): `<kök>/{.ayikla-arsiv, katalog/ayikla.db, medya/, onizleme/, yedek/, kilit}`; mimari belgesi bölüm 5 | Ayıklama akışının önizlemeleri ve kataloğu hâlâ `~/.ayikla` çalışma klasöründe; arşive bağlanmadı | P0 | 006 | Arşiv kökü yapısı belgelenmiş ✅; testle kuruluyor ✅ |
| 072 | Tek-yazıcı arşiv | 🟡 | `arsiv.ts` `kilitAl` (FAZ 1 #5): `kilit` dosyası yalnız yoksa oluşur (cihaz, süreç, zaman, jeton), dakikada bir tazelenir; ölü süreç ya da 5 dakikadır tazelenmemiş kilit "bayat" sayılır ve yalnız onayla (`bayatKilidiKaldir`) kaldırılır; başka cihazın taze kilidi reddedilir | Arayüzde "kilidi kaldır" sorusu YAPILMADI | P0 | 071 | İki süreç aynı arşive yazamaz ✅ (`tests/arsiv.test.ts`, ayrı Node süreciyle) |
| 073 | İsteğe bağlı AI paketleri | 🟡 | `model-izni.ts`: CLIP ve opus-mt paket tanımı (boyut, kaynak, kod/ağırlık lisansı), `model-izni.json` onayı; `sunucu.ts` onaysız yükleyiciyi çağırmaz (`modelDurumu`/`modelIzniVer` istekleri) | Karşılama ekranında onay adımı var (boyut, kaynak, lisans; "İndir ve ayıkla" / "Şimdi değil"). Paket başına seçim yok (tek onay ikisini kapsar); onayı geri alma ekranı yok | P1 | 092 | `tests/model-izni.test.ts`: onaysız sahte indirici çağrılmaz ✅ |
| 074 | Medya format motoru | 🟡 | `ffmpeg.ts`, `ham.ts`, `onizleme.ts` (sharp, heic-convert) | Biçim listesi testi, codec lisansı | P1 | 005, 086 | Her biçim için okuma testi |
| 075 | En az ayrıcalıkla erişim | 🟡 | `ana.ts` IPC izin listesi, `izinliDosyalar`, `contextIsolation`, `sandbox`; `sunucu.ts`/`cli.ts` `hedefSorunu` kaynak içine yazmayı reddeder (Parti 1) | İzinli klasör listesi, Mac sandbox YAPILMADI | P1 | 115 | `tests/sunucu.test.ts`: kaynak içine aktarma reddedilir ✅ |
| 076 | Büyük arşiv testleri | ⬜ | Gerçek deneme: 1.738 dosya (not dosyası) | 10k–500k ölçüm | P3 | 045 | Ölçüm raporu |
| 077 | Güncelleme kanalları | ⬜ | — | Tamamı | P3 | 059 | — |
| 078 | Telemetri varsayılan kapalı | ✅ | Kodda telemetri yok | — | P0 | — | Ağ izleme: telemetri bağlantısı yok |
| 079 | API sırları OS kasasında | ⬜ | (BYOK yok) | Electron `safeStorage` / Credential Manager | P2 | 012 | Anahtar düz metin dosyada yok |
| 080 | Doğrulanabilir yedek | 🟡 | `arsiv-yedek.ts` `yedekDogrula` (FAZ 1 #9): `yedek.json`'daki katalog SHA-256'sı, `PRAGMA integrity_check`, dosya sayısı, her blobun varlığı ve özeti; geri yükleme önce doğrular, sorun varsa hiçbir şey yazmaz | Arayüzde doğrulama raporu YAPILMADI | P0 | 015 | Bozuk yedek "tamam" görünmez ✅ (değişmiş blob, eksik blob, değişmiş katalog, eksik bilgi dosyası) |
| 081 | Ağ bağlantısı görünürlüğü | 🟡 | Tek ağ çıkışı HuggingFace model indirme; artık yalnız onayla açılıyor (`env.allowRemoteModels`, `model-izni.ts`) | Bağlantı geçmişi YAPILMADI | P1 | 073 | Gerçek kütüphane testi: izin kapalıyken `env.fetch` çağrılmaz ✅ |
| 082 | Aşamalı MVP | 🟡 | Ayıklama MVP'si çalışıyor | Arşiv çekirdeği önce gelmeli (yol haritası) | P0 | — | — |
| 083 | Düşük donanım hedefi | 🟡 | İşlemcide ~86 ms/resim (not dosyası) | 8 GB RAM ölçümü yok | P3 | 090 | 8 GB makinede ölçüm |

### F. Yerel AI, model yönetimi, mahremiyet (084–100)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 084 | Çoklu donanım AI katmanı | 🟡 | `sahne-model.ts` DirectML + işlemci yedeği, `cihazTutarliMi` | macOS Core ML yok (Mac sonra) | P1 | — | Ekran kartı tutarsızsa işlemci (testi var) |
| 085 | Küçük uzman model paketleri | 🟡 | CLIP ve çeviri ayrı modeller | Paket sistemi yok | P1 | 073 | Kullanılmayan paket RAM'de değil |
| 086 | Ticari dağıtım lisans denetimi | 🟡 | `docs/LISANSLAR.md`: doğrudan + dolaylı bağımlılıklar, ffmpeg/ffprobe ikilileri, DirectML, libvips, libheif; kaynak bağlantısı ve tarih (2026-11-03); karşılama ekranında Hakkında kutusu: lisanslar, OPUS-MT atfı, FFmpeg GPLv3 kaynağı (2026-11-04) | Paketle birlikte `THIRD_PARTY_NOTICES` ve GPL kaynak teklifi YAPILMADI; ffprobe kaldırıldı (2026-11-03, video bilgisi `ffmpeg.exe`'den) | P0 (yayın öncesi) | 064 | Lisans tablosu var (açık kalemler belgede işaretli) |
| 087 | Kod ve ağırlık ayrı lisans | 🟡 | `model-izni.ts` `ModelPaketi.kodLisansi`/`agirlikLisansi`/`atif`; `docs/LISANSLAR.md` bölüm 4; sürüm sabit (`ModelPaketi.surum` commit + dosya başına SHA-256, 2026-11-03) | opus-mt ağırlık lisansı kaynaklar arasında çelişkili | P1 | 092 | Her modelin kod/ağırlık lisansı kayıtlı ✅ |
| 088 | İki katmanlı OCR | ⬜ | — | Tamamı | P1 | 020 | Düşük güvende ikinci motor |
| 089 | Yerel semantik arama | 🟡 | CLIP vektörleri zaten `kayit.json`'da | Metinden arama arayüzü, indeks | P1 | 010 | "kumsalda köpek" yerel sonuç verir |
| 090 | Donanım benchmark | ⬜ | — | Tamamı | P3 | 076 | Ölçülmemiş hız ilan edilmez |
| 091 | Video adaptif örnekleme | 🟡 | `isci.ts` %10/%50/%90 kareleri | Sahne geçişi tespiti, modlar | P1 | 019 | Uzun videoda sahne sayısı doğru |
| 092 | Merkezi model yöneticisi | ⬜ | — | Tamamı | P1 | 106 | Model kaldır/yeniden indir |
| 093 | AI analiz sürüm geçmişi | ⬜ | (Vektörün model/cihazı saklanmıyor — not dosyasında açık konu) | Model adı/sürüm/güven alanı | P1 | 042 | Model değişince yalnız etkilenenler yeniden analiz |
| 094 | Merkezi öncelikli kuyruk | ⬜ | — | Tamamı | P1 | 040 | Kopyalama AI'dan önce çalışır |
| 095 | Biyometrik veri koruması | ⛔ | — | KVKK hukuki incelemesi gerekli; yüz özelliği yok | P1 | 008 | — |
| 096 | AI gerçek isim atamasın | ⬜ | — | Yüz özelliğiyle birlikte | P1 | 008 | Gruplar "Kişi 001" adıyla gelir |
| 097 | Hassas sınıflandırma yanlış pozitif | ⬜ | — | 024 ile birlikte | P2 | 024 | Otomatik taşıma yok |
| 098 | AI doğruluk testi | 🟡 | Gerçek arşivde 10 örnekte 9/10 elle kontrol (not dosyası) | Ölçüm kümesi, precision/recall | P1 | — | Ölçüm raporu; ölçülmemiş yüzde yok |
| 099 | Türkçe odaklı çok dilli AI | 🟡 | `ingilizceyeCevir` (opus-mt-tr-en) grup adları için | Sorgu dili, OCR dili | P1 | 010 | "Araba" grubu doğru tarife çevrilir |
| 100 | Ücretsiz dağıtım / imzalama | ⛔ | — | İmzalama ücretleri güncel kaynakla doğrulanmalı; imzasız dağıtım uyarısı belgelenmeli | P3 | 059 | — |

### G. Harita, senkron, yeniden analiz, profesyonel araçlar (101–112)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 101 | Harita keşfi | ⬜ | (GPS okunmuyor) | Tamamı | P2 | 042 | GPS'siz öğeler ayrı listede |
| 102 | Çok cihaz senkron çakışması | ⛔ | — | Mac ve senkron sonra | P2 | 028, 072 | — |
| 103 | Tercihe bağlı otomatik başlatma | ⬜ | — | Tamamı (varsayılan kapalı) | P2 | 004 | Varsayılan kapalı |
| 104 | Güvenli eklenti mimarisi | ⬜ | (`SahneModeli` arayüzü bir adaptör sınırı) | Sınırlar ve kurallar belgesi | P3 | 063 | — |
| 105 | Fotoğraftan/bölgeden arama | ⬜ | (Vektörler hazır) | Tamamı | P1 | 089 | Sonuçlar "benzer" etiketli |
| 106 | Güvenli model kaynağı + hash | ⬜ | HuggingFace'ten sürüm kilidi olmadan iner | Sürüm kilidi, SHA-256 | P1 | 092 | Değiştirilmiş model çalıştırılmaz |
| 107 | Geleceğe dönük arşiv uyumu | 🟡 | `katalog.ts`: `PRAGMA user_version` şema sürümü, adım adım `semaKur`; eski `kayit.json` aktarılır; daha yeni sürümün kataloğu değiştirilmez (FAZ 1 #4) | Arşiv kimliğinde sürüm var (`.ayikla-arsiv` `surum`, #5); şema 1 → 2 geçişi yazıldı ve test edildi (#6); yeni sürüme geçmeden önce otomatik yedek YAPILMADI | P0 | 058 | Eski kayıt yeni sürümde açılır ✅ (`tests/katalog.test.ts`) |
| 108 | Artımlı tarama/reanaliz | 🟡 | `anahtarUret` yol+boyut+mtime önbelleği | İçerik hash'i yok; yeniden adlandırma = yeni dosya | P1 | 029 | Yeniden adlandırılan dosya yeniden analiz edilmez |
| 109 | RAW + JPEG + XMP | 🟡 | `tarayici.ts` `hamEsleriniAyir` (yalnız NEF), `isci.ts` görsel kopya eşi | CR2/ARW/DNG ve XMP yok | P2 | 005 | XMP eşi dışa aktarmada kaybolmaz |
| 110 | Toplu yeniden adlandırma | ⬜ | (Ad çakışmasında "(2)") | Şablon, önizleme, geri alma | P2 | 123 | Kaynak adları değişmez |
| 111 | PDF contact sheet | ⬜ | — | Tamamı | P2 | — | Numaralı PDF oluşur |
| 112 | Bulut eşitlemeli yerel klasör | 🟡 | Yerel yol olarak taranabilir | Yer tutucu tespiti (114) | P1 | 114 | — |

### H. Gerçek kullanım hataları ve pratik araçlar (113–130)

| ID | Konu | Durum | Kod referansı | Eksik davranış | Öncelik | Bağımlılık | Test koşulu |
|---|---|---|---|---|---|---|---|
| 113 | Apple Fotoğraflar'dan alma | ⛔ | — | Mac sonra | P2 | — | — |
| 114 | Bulut yer tutucuları | ⬜ | — | Windows "yalnız çevrimiçi" özniteliği tespiti; izinsiz indirme yok | P1 | 112 | Yer tutucu "kopyalandı" sayılmaz |
| 115 | Kendi arşivini taramayı engelle | 🟡 | `disari-aktar.ts` `isaretKoy` + `hedefSorunu`; `tarayici.ts` işaretli klasörü atlar (Parti 1) | Arşiv kökü gelince önizleme/yedek klasörleri de dışlanmalı | P0 | 050, 075 | İşaretli hedef taranmaz ✅; kaynak içine aktarma reddedilir ✅ |
| 116 | Kopyalama sırasında kaynak değişimi | 🟡 | `disari-aktar.ts`: geçici dosya → önce/sonra stat → SHA-256 → atomik ad (Parti 1) | Değişen sürümü ayrıca kaydetme YAPILMADI | P0 | 029 | `tests/disari-aktar.test.ts`: değişen kaynak kabul edilmez ✅ |
| 117 | Albümden kaldır ≠ sil | 🟡 | `arsiv-kutu.ts` (FAZ 1 #7): "sil" yalnız kutuya taşır; "kalıcı sil" yalnız kutudaki öğeye uygulanır ve blobu `ref_sayisi` 0'a inmeden silmez; `arsiv-album.ts` `albumdenKaldir`/`albumSil` (FAZ 1 #8) yalnız bağı siler | Arayüzde üç ayrı düğme (albümden kaldır / sil / kalıcı sil) YAPILMADI | P0 | 013, 032 | Paylaşılan blob korunur ✅ (`tests/arsiv-kutu.test.ts`); albümden kaldırma arşivden silmez ✅ (`tests/arsiv-album.test.ts`) |
| 118 | Gizleme tüm yüzeylerde | ⬜ | — | Tamamı (şifresiz) | P2 | 018 | Gizli öğe aramada da yok |
| 119 | Renk profilleri, HDR, yön | 🟡 | `onizleme.ts` `sharp.rotate()` EXIF yönü | ICC/P3/HDR yönetimi | P3 | — | Döndürülmüş fotoğraf doğru yönde |
| 120 | Dosya adları ve Unicode | ✅ | `disari-aktar.ts` `guvenliAd()` (FAZ 1 #11): yasak ve kontrol karakterleri, ayrılmış adlar (`CON`, `NUL`, `COM1`…, uzantılı da) `_` ile, sondaki nokta/boşluk, NFC, ad başına 120 (dosyada 200) karakter sınırı; dışa aktarılan dosya adı da süzülür; çakışmada "(n)"; arşiv öğe adı NFC (#6) | Uygulama penceresinde DENENMEDİ; Mac'e özgü ad kuralları (`:`) ayrıca ele alınmadı | P1 | — | `CON` grubu, 260+ karakter yol, Türkçe ad doğru ✅ (`tests/dosya-adlari.test.ts`) |
| 121 | Disk harfi değişimi | 🟡 | `arsiv.ts` `arsivBul` (FAZ 1 #5): kimlikle önce son yer, sonra aynı yol her diskte, sonra disklerin ilk 2 düzeyi aranır | Bilinen arşivlerin kaydı ve açılışta kendiliğinden yeniden keşif arayüze bağlanmadı | P1 | 006, 071 | D: → E: değişince arşiv bulunur ✅ (`tests/arsiv.test.ts`, klasörlerle taklit; gerçek USB diskle DENENMEDİ) |
| 122 | Bilinmeyen tarih kaynağı | 🟡 | `tarih.ts` `TarihKaynagi` + `tahmini` | Tüm tarih türlerini ayrı saklama; saat dilimi | P1 | 042 | Tahmini tarih "tahmini" görünür |
| 123 | Toplu işlemleri geri alma | 🟡 | `geriAl` (tek öğe, eleme) | İşlem günlüğü, toplu geri alma | P1 | 058 | 5.000 öğelik değişiklik tek adımda geri alınır |
| 124 | Katalog kaybında kurtarma | 🟡 | `arsiv-kurtar.ts` `katalogKurtar` (FAZ 1 #12): bozuk katalog kenara alınır (silinmez), `medya/` dosyaları adlarındaki SHA-256 ile doğrulanıp yeni kataloğa alınır; bozuk ve tanımsız dosyalar dokunulmadan raporlanır; geri gelmeyen bilgiler (albüm, etiket, köken, orijinal ad, kutu durumu, çekim tarihi) raporda açıkça yazılır | Arayüzde sihirbaz, önizleme ve EXIF'ten tarih okuma YAPILMADI; yedek varsa onu önerme YAPILMADI | P1 | 071 | Kayıp katalog dürüst raporlanır ✅ (`tests/kabul.test.ts`, DoD 4) |
| 125 | İçe aktarma öncesi izin ekranı | 🟡 | `Karsilama.tsx` + `say` (foto/video/RAW sayısı) | Boyut, desteklenmeyen, hedef boş alan yok | P1 | 048 | Tahmin ve kesin sayı ayrı |
| 126 | Yeni eklenenler kutusu | ⬜ | — | Tamamı | P1 | 058 | İşaretlenen öğe listeden çıkar |
| 127 | Akıllı temizleme sihirbazı | 🟡 | "Elenecek" grupları (kopya/bulanık/karanlık); otomatik silme yok | Tasarruf tahmini, düşük çözünürlük, büyük dosya | P1 | 013 | Hiçbir dosya otomatik silinmez |
| 128 | Konumu Dosya Gezgini'nde aç | ⬜ | — | `shell.showItemInFolder` | P1 | — | Kayıp dosyada "bulunamadı" |
| 129 | Sürükle-bırak ve pano | 🟡 | `Karsilama.tsx` `onDrop`; kısayola bırakma | Panodan yapıştırma yok | P2 | — | Sürüklemek kaynağı taşımaz |
| 130 | Periyodik arşiv sağlık denetimi | 🟡 | `arsiv-saglik.ts` `saglikDenetimi` (FAZ 1 #10): her blobu kayıtlı SHA-256 ve boyutla karşılaştırır; eksik, değişmiş, kayıtsız dosya ve yanlış `ref_sayisi` raporlanır; `quick_check`; yalnız okur, raporu `meta` tablosuna yazar; düşük öncelik (`bekleme`) ve durdurma | "Periyodik" çalıştırma (zamanlayıcı) ve arayüzde rapor YAPILMADI; bozuk dosyayı yedekten onarma YAPILMADI | P1 | 029, 071 | Değiştirilmiş kopya bulunur ✅ (`tests/arsiv-saglik.test.ts`, aynı boyutta tek bayt değişikliği) |

## Sayım doğrulaması

Bölüm başına satır: A 10 · B 15 · C 20 · D 22 · E 16 · F 17 · G 12 · H 18 = **130**. Sayım şu komutla yeniden üretilebilir:

```bash
grep -cE '^\| [0-9]{3} ' docs/FEATURE_GAP_MATRIX.md
```
