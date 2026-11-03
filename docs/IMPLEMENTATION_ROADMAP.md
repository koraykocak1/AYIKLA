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

**Parti 1 ayrıntıları ve sınırları**
- Arayüz değişmedi. Kaydetme sonucundaki "kopyalandı" sayısı artık yalnız SHA-256 ile doğrulanmış kopyaları sayar.
- Kayıt klasörü kaynağın içinde seçilirse arayüzde mevcut "Kaydedilemedi: …" mesajıyla Türkçe neden görünür.
- Sistem klasörü listesi Windows içindir; Mac karşılığı YAPILMADI.
- Kullanıcının doğrudan seçtiği işaretli klasör yine taranır (bilinçli seçim). İşaret yalnız iç içe bulunan klasörlerde dışlama yapar.
- Bozuk `kayit.json` kenara alındığında kullanıcıya ekranda haber verilmiyor (`kurtarilan` alanı hazır) — YAPILMADI.

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
- Bozuk veritabanı `katalog.db.bozuk-<zaman>` olarak kenara alınıp eski `kayit.json`'dan yeniden kurulur; bu durumda geçişten sonraki düzeltmeler yalnız kenara alınan dosyada kalır. Kullanıcıya ekranda haber verilmiyor (`kurtarilan` alanı hazır) — YAPILMADI.
- Programın eski sürümüne dönülürse eski sürüm `kayit.json`'u okur; yeni katalogdaki değişiklikleri görmez.
- Eşlenmiş ağ sürücüsü algılanmıyor; yalnız UNC yolu reddediliyor.

**FAZ 1 #2–#3 ayrıntıları ve sınırları**
- Modeller zaten indirildiyse hiçbir şey değişmez: onay sorulmaz, onay dosyası yazılmaz, model yalnız diskten açılır.
- Karşılama: model inmemişse klasör seçilince ayıklama kendiliğinden başlamaz; kürenin altında boyut, kaynak ve lisans gösteren kutu açılır ("İndir ve ayıkla" / "Şimdi değil"). Mevcut stiller (`.altin`, `.ikincil`) kullanıldı. Geliştirme önizlemesinde `?ilk` adresiyle denenir. CLI `--indirmeye-izin-ver` ister.
- Tarayıcı önizlemesinde kutunun açıldığı ve onayın kaydedildiği görüldü; ekran geçişi gizli panelde animasyon durduğu için izlenemedi (eski akış da aynı). Gerçek Electron penceresinde DENENMEDİ.
- Gerçek boyut ~610 MB (CLIP) + ~440 MB (çeviri). Ayıklama ekranındaki "~350 MB" metinleri düzeltildi.
- Lisans riskleri: ffmpeg.exe ve ffprobe.exe GPLv3 (ffprobe 2018 Zeranoe derlemesi, kaynağı belirsiz); opus-mt ağırlıkları CC-BY 4.0 kabul edildi (atıf gerekir); model sürümü sabitlenmedi.
