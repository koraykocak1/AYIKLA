# AYIKLA — 130 Ürün Kararı (Gereksinimler)

Kaynak: kullanıcının `claude_130_karar_uygulama_talimati.md` dosyası (3 Kasım 2026). Kimlikler (001–130) aynen korunmuştur; her madde tek satırda kısaltılmıştır. Ayrıntılı metin kaynak dosyadadır. Bugünkü durum için: [FEATURE_GAP_MATRIX.md](FEATURE_GAP_MATRIX.md).

## Değiştirilemez kurallar (bütün maddelerin üstünde)

1. **Kaynak dosyaya dokunulmaz.** Düzenleme, taşıma, üzerine yazma, silme yok. Arşivdeki silme kaynağa yansımaz.
2. **Yerel öncelikli gizlilik.** Açık izin olmadan fotoğraf, video, yüz, OCR metni ya da dosya yolu buluta gitmez. Telemetri varsayılan kapalı.
3. **Sıfır maliyet.** Temel özellik ücretsiz ve aboneliksiz. Ücretli API/model/sertifika zorunlu olamaz. Kod ve ağırlık lisansları ayrı incelenir.
4. **ŞİFRE/PIN YOK.** Uygulama parolası, PIN, şifreli albüm, kurtarma anahtarı yapılmaz. Gizleme yalnız görünüm kuralıdır. Tek istisna: kullanıcının kendi AI API anahtarı işletim sistemi kasasında saklanır.
5. **Mevcut arayüz korunur.** Siyah + sarı (#FACC15) tasarım yeniden çizilmez; yeni işlevler var olan bileşenlere eklenir.
6. **Önce güvenilir arşiv, sonra AI.** Kopyalama, SHA-256, katalog, geri dönüşüm kutusu, yedek ve kurtarma önce kanıtlanır.
7. **Modüler, çapraz platform, kaynak dostu.** Önce Windows, sonra Mac (yol haritası). Telefon desteği ertelendi. İşlemcide çalışır; ekran kartı isteğe bağlı.

## Çelişki çözüm kuralları

| Çelişki | Karar |
|---|---|
| 018/024'teki eski PIN ve "şifreli özel albüm" fikirleri ↔ 025 | 025 kazanır: şifre yok, yalnız görünümden gizleme |
| "Gizli" ↔ güvenlik | "Gizli" hiçbir yerde "şifreli" ya da "korumalı" diye anlatılmaz |
| Tauri önerisi (068) ↔ çalışan Electron uygulaması | Electron'da kalınır; geçiş yalnız ölçülmüş kazançla düşünülür |
| Telefon/Wi-Fi aktarımı (033, 034) ↔ yol haritası | Ertelendi; Windows klasör/SD kart akışı önce |
| Mac maddeleri (028, 102, 113) ↔ yol haritası | Windows bitince |
| Model indirme (073, 055) ↔ çevrimdışı/izin (003, 081) | Model indirmek fotoğraf göndermez, ama ilk indirme açık onayla yapılmalı |
| Eleme/temizleme (007, 127) ↔ kaynak kuralı | Hiçbir puan ya da öneri otomatik silmeye yol açmaz |

## A. Ürün hedefi, içe aktarma ve sınıflandırma

- **001** Kişisel + profesyonel kullanıcı; basit akış ve gelişmiş araçlar tek üründe.
- **002** Hibrit AI: temel analiz yerel; bulut isteğe bağlı; internetsiz temel işlev sürer.
- **003** Açık onay olmadan hiçbir görsel veri dış sunucuya gitmez; gönderilecekse ne/nereye/neden gösterilir.
- **004** İzinle tüm disk ya da seçili klasör taraması; izlenen klasörde yeni dosya algılama; sistem/hariç klasörler taranmaz.
- **005** JPG, PNG, HEIC/HEIF, WEBP, TIFF, RAW (CR2/CR3/NEF/ARW/DNG), GIF, MP4/MOV/AVI/MKV, PDF; desteklenmeyenler raporlanır.
- **006** Arşiv konumu kullanıcı seçer (iç/harici disk), sonradan güvenle değişir; çıkarılan disk "çevrimdışı" görünür.
- **007** Birebir aynı ve görsel benzer ayrı bulunur; en iyi kare önerilir; otomatik silme yok.
- **008** Yerel yüz gruplama: varsayılan kapalı, adlandır/birleştir/ayır/gizle, veriler silinebilir.
- **009** Bir öğe birden çok kategori ve albümde, fiziksel çoğaltma olmadan; kategori ekle/düzenle/sil.
- **010** Klasik + doğal dil + birleşik filtre araması; eş anlamlı ve çok dilli.

## B. Düzenleme, güvenlik, yedekleme ve akıllı analiz

- **011** Kırp/döndür/pozlama/renk vb. + isteğe bağlı AI düzenleme; tahribatsız, geri alınabilir.
- **012** Ücretsiz yerel AI temel yol; isteğe bağlı kullanıcı API'si; anahtar sistem kasasında, maliyet önceden açıklanır.
- **013** Uygulama geri dönüşüm kutusu: varsayılan 30 gün, süre ayarlı, geri yükleme ve erken kalıcı silme; kaynak asla silinmez.
- **014** Tek/albüm/çoklu albüm dışa aktarma; format dönüşümü, metadata tut/kaldır, ZIP, klasör yapısı; arşivi değiştirmez.
- **015** Günlük/haftalık/aylık/elle yedek; medya + katalog + ayarlar birlikte, doğrulanabilir; başka bilgisayara geri yükleme.
- **016** Arka planda durdur/sürdür; yeniden açılışta kaldığı yerden; CPU/RAM sınırı; analiz edilmemişler listesi.
- **017** Kaynak değişti/taşındı bildirimi; eşitleme isteğe bağlı ve varsayılan kapalı; eski sürüm kaybolmaz; kaynak silinince arşiv silinmez.
- **018** Yerel profiller ve görünüm gizleme; şifre yok, güvenlik iddiası yok.
- **019** Video metadata, nesne/olay, sahne bölümleme ve sahneye atlama; yerel ve isteğe bağlı.
- **020** Yerel OCR ve belge türü önerisi; Türkçe; düşük güvenli okuma düzeltilebilir.
- **021** Gezi, doğum günü, düğün gibi etkinlik önerileri; belirsizlik kesin bilgi gibi gösterilmez.
- **022** Baskın renk, palet, renk seçerek ya da HEX ile arama.
- **023** Teknik kalite ve estetik ayrı puan; en iyi kare önerisi; puan silme tetiklemez.
- **024** Kimlik/kart/belge gibi hassas içeriği isteğe bağlı yerel tespit ve gizleme; şifreli albüm yok; otomatik taşıma/silme yok.
- **025** Parola, PIN, şifreli albüm, kurtarma anahtarı YOK; yalnız görünümden gizleme.

## C. Etiketler, aktarım, depolama, kullanıcı akışı

- **026** AI etiket önerisi + elle etiket; toplu ve hiyerarşik etiket; etikete göre filtre.
- **027** Tarih/saat/saat dilimi/konum düzeltme; önce katalogda, isteğe bağlı çıktı EXIF'inde; kaynağa yazma yok.
- **028** Windows/Mac ortak harici SSD arşivi; bulutsuz eşitleme; çakışma güvenliği.
- **029** Her kopya SHA-256 ile kaynağa karşı doğrulanır; bozuklar yeniden denenir; doğrulanmadan "başarılı" denmez.
- **030** Yıl/ay/gün, etkinlik, kategori, kişi, tür şablonlarıyla dışa aktarma klasörleri; özel kural.
- **031** Küçük resim/video kareleri; kalite ayarı, cache temizliği ve alan raporu; cache silmek medya silmek değildir.
- **032** İsteğe bağlı birebir tekilleştirme: tek fiziksel kopya, tüm kaynak yolları bilinir; benzerler birleştirilmez.
- **033** Telefon/kamera/SD aktarımı; yeni dosya bulma, tekrar ve hash kontrolü.
- **034** QR eşleşmeli yerel Wi-Fi aktarım; süreli eşleşme; internet zorunlu değil.
- **035** 1–5 yıldız, favori, renk etiketi, seçim listeleri; toplu değişiklik.
- **036** Galeri, tam ekran, yakınlaştırma, slayt, yan yana senkron kıyas, önce/sonra.
- **037** Yüksek güven otomatik, orta/düşük güven öneri; eşikler ölçülerek.
- **038** Ayrı ayrı açılıp kapanan, sel yaratmayan bildirimler.
- **039** Kurallı, kendini güncelleyen akıllı albümler; fiziksel kopya yok.
- **040** Tek iş kuyruğu/durum merkezi: ilerleme, hata, duraklat/sürdür/iptal/yeniden dene.
- **041** İşlem günlüğü/checkpoint; yarım dosya arşive girmez; açılışta tutarlı devam; idempotent tekrar.
- **042** Üç katman: kaynak EXIF, AI/OCR çıktısı, kullanıcı düzeltmesi; karıştırılmaz.
- **043** Kullanıcı düzeltmelerinden yerel öğrenme; öğrenilenler silinebilir.
- **044** Dış düzenleyicide açma, paylaşma, sürükle-bırak; dönüşü yeni sürüm olarak alma.
- **045** Sanal galeri: yalnız görünen alanın önizlemesi, sayfalama, bellek bütçesi.

## D. Performans, güvenli işlem ve profesyonel iş akışları

- **046** Tasarruf/Dengeli/Performans modları; GPU zorunlu değil.
- **047** Aşamalı içe aktarma: önce kopya+hash, sonra metadata/önizleme, sonra AI; her dosyanın durumu tutulur.
- **048** Kopya öncesi alan hesabı; disk dolunca güvenli duraklama ve geçici dosya temizliği.
- **049** Bozuk/desteklenmeyen dosyalar ayrı raporlanır; tek hata taramayı durdurmaz; RAW–XMP ilişkisi korunur.
- **050** Uzantı/klasör/disk/boyut/sistem klasörü dışlama kuralları; ilk taramadan önce ve izlemede uygulanır.
- **051** Live Photo fotoğraf + video tek mantıksal çekim; iki parça korunur.
- **052** Sürüm geçmişi: kaynak, düzenlemeler, AI alternatifleri; tahribatsız tanımlar.
- **053** Köken geçmişi: ilk klasör, cihaz, eklenme tarihi, son görülen yol, çoklu yollar.
- **054** Gizlilik dışa aktarma profilleri (GPS kaldır vb.); çıktı üzerinde doğrulanır.
- **055** Temel işlevler tam çevrimdışı; ağ yalnız model indirme, güncelleme ve seçilen bulut AI için.
- **056** Win/Mac'e uygun klavye kısayolları; özelleştirme.
- **057** Kayıtlı aramalar; dinamik sonuç.
- **058** SQLite katalog; indeks, transaction, bütünlük kontrolü, migration, online backup.
- **059** Kullanıcı kontrollü güvenli güncelleme; migration öncesi yedek; kurtarma.
- **060** Tüm veriler açık biçimlerde (JSON/CSV + medya) dışa aktarılabilir; kilitlenme yok.
- **061** Yerel hata günlüğü, hata kodu, kişisel bilgi redaksiyonu; otomatik rapor yok.
- **062** Kaldırmada arşiv silinmez; katalog/yedek temizliği isteğe bağlı.
- **063** AI modülleri ayrı açılıp kapanır; biri çökerse diğerleri ve galeri çalışır.
- **064** Ücretli bulut/API'ye bağlı temel işlev yok; dağıtım lisansları tek tek incelenir.
- **065** Türkçe + İngilizce arayüz; genişleyebilir dil sistemi; OCR/arama/arayüz dili ayrı.
- **066** Kısa ilk kullanım sihirbazı: arşiv konumu, kaynak izinleri, dışlamalar, AI paketleri, disk onayı.
- **067** Erişilebilirlik: yazı ölçekleme, klavye, ekran okuyucu, azaltılmış hareket, renk körlüğü.

## E. Teknoloji mimarisi, dağıtım, süreç güvenliği

- **068** Tek kod tabanı; mevcut teknoloji ölçülmeden değiştirilmez.
- **069** Katmanlı mimari; uzun işler arka plan işçisinde; arayüz bloklanmaz; hata yalıtımı.
- **070** SQLite + WAL yerel diskte; aynı DB ağ paylaşımında çoklu bilgisayarda açılmaz.
- **071** Arşiv kökünde katalog/medya/önizleme/manifest/yedek ayrımı; benzersiz dosya kimliği.
- **072** Tek-yazıcı: aynı arşive iki cihaz aynı anda yazamaz; bayat kilit kurtarma.
- **073** İsteğe bağlı AI paketleri; boyut, RAM/GPU, lisans, sürüm gösterilir.
- **074** Modüler format motoru (FFmpeg/RAW/EXIF/HEIC/PDF); codec lisansları doğrulanır.
- **075** En az ayrıcalıkla dosya erişimi; yalnız izin verilen kaynak ve hedef.
- **076** 10k/50k/100k/500k öğe testleri; kapasite iddiası ölçümden sonra.
- **077** Kararlı/Beta/Geliştirici kanalları; deneysel yükseltmeye zorlama yok.
- **078** Telemetri varsayılan kapalı; açık rızalı, kimliksiz hata raporu ayrı ayarda.
- **079** API sırları Credential Manager/Keychain'de; düz metinde yok.
- **080** Doğrulanabilir yedek/geri yükleme; "yedek tamam" yalnız doğrulanınca.
- **081** Ağ bağlantısı görünürlüğü; zorunlu dış çıkış yok.
- **082** Aşamalı MVP: önce arşiv çekirdeği, sonra AI, sonra profesyonel ve cihaz özellikleri.
- **083** 8 GB RAM hedefi (garanti değil, test hedefi); GPU isteğe bağlı hızlandırma.

## F. Yerel AI çalıştırma, model yönetimi ve mahremiyet

- **084** CPU varsayılan; DirectML/Windows ML ve Core ML adaptörleri; GPU yoksa CPU.
- **085** Küçük uzman model paketleri; kullanılmayan paket indirilmez ve RAM'de tutulmaz.
- **086** Kod, bağımlılık, FFmpeg, ağırlık, veri seti lisansları tek tek denetlenir.
- **087** Kod ve ağırlık lisansı ayrı kaydedilir (kaynak, tarih).
- **088** İki katmanlı OCR: temel motor + karmaşık belgede ikinci motor.
- **089** Yerel embedding ile metinden görsel arama; artımlı ve sürüme bağlı indeks.
- **090** Donanım sınıflarına göre gerçek benchmark; ölçülmemiş hız ilan edilmez.
- **091** Video adaptif örnekleme: metadata > sahne geçişi > örnek kare > yoğun analiz.
- **092** Merkezi model yöneticisi; indirilen model geçici alanda doğrulanıp atomik etkinleşir.
- **093** Her AI sonucunda model adı/sürümü/zamanı/güveni; manuel düzeltme ayrı.
- **094** Öncelikli ortak kuyruk: kopyalama > metadata > kategori > arama > benzer > OCR > yüz > video > iyileştirme.
- **095** Yüz verisi ayrı izinle, yerel, silinebilir; KVKK incelemesi dağıtım öncesi.
- **096** AI kişilere gerçek isim vermez; "Kişi 001"; internette kimlik araması yok.
- **097** Hassas sınıflandırma düzeltilebilir ve isteğe bağlı; kullanıcı verisi model eğitimine gitmez.
- **098** Her AI modülü için ölçüm kümesi ve eşik; ölçülmemiş doğruluk iddiası yok.
- **099** Türkçe odaklı çok dilli AI; arayüz/OCR/sorgu dili bağımsız.
- **100** Bütçesiz ilk dağıtım; imzalama ücretleri ayrıca doğrulanır; imzasız dağıtımın uyarıları dürüstçe belgelenir.

## G. Harita, senkronizasyon, yeniden analiz ve profesyonel araçlar

- **101** GPS'li fotoğraflar haritada; haritadan konum düzeltme; çevrimdışı harita seçeneği.
- **102** Çok cihaz çakışmaları saptanır; kör "son yazan kazanır" yok.
- **103** İsteğe bağlı otomatik başlatma; varsayılan kapalı.
- **104** Güvenli eklenti sınırları; ilk sürümde denetimsiz üçüncü taraf kod yok.
- **105** Örnek fotoğraf ya da bölgesiyle benzer arama; sonuçlar "benzer" diye sunulur.
- **106** Model kaynağı: sürüm kilidi, SHA-256, lisans, boyut sınırı; bozuk model çalışmaz.
- **107** Şema sürümü, belgelenmiş migration, arşiv manifest sürümü; eski arşivler açılır.
- **108** Artımlı tarama: boyut, tarih, hash, analiz durumu, model sürümü; yeniden adlandırma içerik değişimi sayılmaz.
- **109** RAW + JPEG + XMP tek mantıksal grup; parçalar korunur; isme kör güvenilmez.
- **110** Toplu yeniden adlandırma şablonları; önizleme, çakışma kontrolü, geri alma; kaynak adı değişmez.
- **111** PDF contact sheet ve sunum paketleri.
- **112** iCloud/OneDrive/Drive/Dropbox yerel klasörleri kaynak olarak; yer tutucular ayırt edilir.

## H. Gerçek kullanım hata senaryoları ve pratik araçlar

- **113** Apple Fotoğraflar'dan yalnız desteklenen export yöntemleriyle güvenli alma.
- **114** Bulut yer tutucusu gerçek orijinal sayılmaz; izinsiz indirme yok; tam inmemiş dosya "kopyalandı" sayılmaz.
- **115** Arşiv, cache, yedek ve geçici klasörler kaynak taramasından otomatik dışlanır; arşiv taşınsa da.
- **116** Kopyalama sırasında kaynak değişirse tutarsız kopya kabul edilmez: geçici hedef + kontrol + atomik bitiş.
- **117** Albümden kaldır ≠ arşivden sil (kutuya) ≠ kalıcı sil (onayla); kaynak asla silinmez.
- **118** Gizleme tüm görünür yüzeylerde geçerli; özel anahtarla görünür; şifreleme iddiası yok.
- **119** ICC, sRGB/P3, HDR, EXIF yönü, önizlemede renk yönetimi.
- **120** Yasak karakter, ayrılmış ad, uzun yol, büyük/küçük harf, Unicode normalizasyonu; orijinal ad katalogda aynen.
- **121** Disk harfi değişince arşiv kimliğiyle yeniden keşif; yeniden kopyalamaya zorlama yok.
- **122** EXIF, dosya, aktarım ve kullanıcı tarihleri ayrı; indirme tarihi "çekim tarihi" gibi sunulmaz.
- **123** Toplu değişikliklerde işlem günlüğü, önizleme ve tek adımda geri alma.
- **124** Katalog kaybında arşivden kurtarma sihirbazı; geri gelemeyen veri dürüstçe söylenir.
- **125** İçe aktarma öncesi özet ve izin ekranı: sayı, boyut, tekrar, desteklenmeyen, hedef alan.
- **126** "Yeni gelenler / incelenmemiş" kutusu.
- **127** Akıllı temizleme sihirbazı; otomatik silme yok; seçilen önce kutuya gider.
- **128** Arşiv kopyasının ya da kaynağın konumunu Dosya Gezgini/Finder'da aç; yolu kopyala.
- **129** Sürükle-bırak ve panodan ekleme; sürükleme kaynağı taşımaz.
- **130** Periyodik arşiv sağlık denetimi (SHA-256); hash denetiminin dosyayı kurtaramayacağı açıkça söylenir.
