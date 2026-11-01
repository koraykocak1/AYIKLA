# AYIKLA — Tasarım Belgesi

Tarih: 1 Kasım 2026
Durum: Kullanıcı onayladı, yapım planı bekleniyor.
İlham: Instagram reel'i (carlofebbraio_) — fotoğrafların ortada dönen bir yığından gruplara uçtuğu, Claude Code ile yapılmış ayıklama programı. Bizimki sıfırdan, kendi tasarımımız.

## 1. Amaç

Telefondan bilgisayara aktarılmış, karışık duran fotoğraf ve videoları tek tuşla:
- **sahneye** göre (Deniz, Orman, Şehir…) gruplamak,
- her grubu **tarihe** göre (yıl › ay) sıralamak,
- **kopya, bulanık ve çok karanlık** olanları ayrı bir gruba koymak,
- bunu **animasyonlu**, göze hoş gelen bir arayüzle yapmak.

Başarı ölçütü: Kullanıcı bir klasörü sürükleyip "Ayıkla"ya basar; birkaç dakika içinde fotoğrafları doğru gruplarda ve tarih sırasında görür; hiçbir orijinal dosya değişmez.

## 2. Kısıtlar

- Windows 11, NVIDIA RTX 3050 Ti (4 GB), Node.js kurulu, Python yok.
- **Ücretsiz ve internetsiz** çalışmalı. Ücretli API yok. Yapay zekâ modeli yalnızca ilk açılışta bir kez iner (~350 MB).
- Kullanıcı kod bilmiyor: kurulum ve kullanım tek tıklık olmalı, tüm metinler Türkçe.
- KAINE uygulamasından ayrı proje: `Desktop\AYIKLA`.

## 3. Teknik yol

**Electron + React + Vite (TypeScript)** seçildi.
- Elenen: Tauri (Rust kurulumu gerekir), tarayıcı sitesi (dosya erişimi sınırlı).

| İş | Araç |
|---|---|
| Masaüstü kabuk | Electron |
| Arayüz | React + Vite |
| Dönen yığın animasyonu | three.js (react-three-fiber) — binlerce kare tek çizimde (instancing) |
| Geçişler | Motion |
| Tarih/GPS okuma | exifr |
| Video tarihi ve kareleri | FFmpeg / ffprobe (ffmpeg-static ile pakete gömülü) |
| Küçük önizleme, netlik ve parlaklık ölçümü | sharp |
| Sahne tanıma | transformers.js + CLIP (zero-shot; ONNX, mümkünse ekran kartı) |
| Kopya bulma | Görsel parmak izi (dHash/pHash) + Hamming mesafesi |
| Kayıt / önbellek | SQLite (better-sqlite3) |

Ayrıntılı araç notları: `~/.claude/skills/medya-arsivi-araclari/SKILL.md`.

## 4. Ekranlar

Tarz: **Sinematik koyu** — siyaha yakın zemin, altın vurgu (#e8c98a civarı), hafif film greni, yumuşak geçişler.

### 4.1 Karşılama
- Ortada büyük bırakma alanı: "Fotoğrafları veya klasörü buraya bırak" (+ "Klasör seç" butonu).
- Bırakınca: "1.240 fotoğraf · 86 video bulundu" ve altın **Ayıkla** butonu belirir.
- Daha önce taranmış klasörler altta "Son arşivler" olarak listelenir.

### 4.2 Ayıklama
- Tüm medya küçük kareler olarak ortada **dönen bir yığın** oluşturur.
- Her dosya işlendikçe karesi yığından kopar, kendi grubunun bölgesine uçar; grup etiketleri büyür.
- Elenecekler kenardaki ayrı bir köşeye düşer.
- Üstte sayaç kartları: Taranan, Gruplanan, Elenecek, Kalan süre.
- "Durdur" butonu; yarıda kalan iş sonra kaldığı yerden sürer.

### 4.3 Sonuç
- **Sol menü:** gruplar ve adetleri; ardından "Diğer" ve "Elenecekler"; listenin sonunda **+ Grup ekle** (yazılan isim, örn. "Araba", yeni bir CLIP etiketi olur ve tüm arşiv yeniden puanlanır — fotoğraflar yeniden taranmaz).
- **Sağ alan:** seçili grup, yıl › ay başlıklarıyla ızgara.
- Tıklayınca büyük görünüm; videolar oynar; ok tuşlarıyla gezinme.
- Bir fotoğrafı elle başka gruba taşıma (sürükle veya sağ tık) — yapay zekâ yanılırsa düzeltmek için.
- **Klasörlere kaydet:** hedef klasör seçilir, kopyalar `Hedef\Grup\Yıl\Ay-Adı\` düzeninde çıkar. Orijinaller yerinde kalır.
- Elenecekler grubunda "Geri al" (normal gruba döndür). Silme yok.

## 5. Gruplar

Hazır liste: Deniz/Plaj, Orman/Doğa, Dağ, Şehir, Kar, Gece, Yemek, İnsanlar/Selfie, Hayvanlar, Ekran görüntüsü. Hiçbirine yeterince benzemeyen → **Diğer**.

- Her grup CLIP'e birkaç İngilizce tarif ile verilir (örn. Deniz: "a photo of the sea", "a beach", "ocean waves"); arayüzde Türkçe ad görünür.
- Bir dosya en yüksek puanlı gruba girer; puan eşiğin altındaysa "Diğer".
- Ekran görüntüsü ayrıca dosya adı ve boyut oranı ile de tanınır.
- Kullanıcının eklediği gruplar kaydedilir ve sonraki açılışlarda da kullanılır.

## 6. Arka plandaki akış

Her dosya için, sırayla (ve önbellekte varsa atlanarak):

1. **Bul:** Klasör alt klasörleriyle taranır. Desteklenen: jpg, jpeg, png, heic, webp, mp4, mov, 3gp.
2. **Tarih:** EXIF `DateTimeOriginal` → video `creation_time` → Google Takeout `.json` → dosya adındaki tarih (`IMG_20240812`, `WhatsApp Image 2024-08-12` vb.) → dosya değiştirilme tarihi (bu durumda "tahmini" işareti).
3. **Önizleme:** sharp ile küçük resim (videoda %10/%50/%90 karelerinden).
4. **Kalite:** Netlik (Laplace varyansı) ve ortalama parlaklık ölçülür; eşik altı → bulanık / karanlık.
5. **Kopya:** Görsel parmak izi; çok yakın olanlardan en net ve en büyük çözünürlüklü olan kalır, diğerleri "Elenecekler › Kopya".
6. **Sahne:** CLIP görüntü vektörü hesaplanır ve **saklanır**; gruplara göre puanlanır (video: karelerin ortalaması).
7. **Kayıt:** Sonuçlar SQLite'a yazılır. Aynı dosya (yol + boyut + değiştirilme tarihi) tekrar gelirse yeniden işlenmez.

Ağır işler arayüzü dondurmamak için ayrı bir işçi süreçte (worker) yapılır; ilerleme arayüze olay olarak akar ve animasyonu besler.

## 7. Parçalar (birbirinden bağımsız birimler)

| Birim | Görevi | Girdi → Çıktı |
|---|---|---|
| `tarayici` | Klasörde medya dosyalarını bulur | klasör yolu → dosya listesi |
| `tarih` | Bir dosyanın çekim tarihini bulur | dosya → tarih + kaynak + "tahmini mi" |
| `onizleme` | Küçük resim / video kareleri üretir | dosya → küçük resim(ler) |
| `kalite` | Netlik ve parlaklık ölçer | küçük resim → bulanık mı, karanlık mı |
| `parmakizi` | Kopyaları bulur | küçük resimler → kopya grupları |
| `sahne` | CLIP ile vektör ve grup puanı | küçük resim + grup listesi → grup + puan |
| `kayit` | SQLite önbelleği | sonuçları yazar/okur |
| `isci` | Yukarıdakileri sırayla çalıştırır, ilerleme yollar | dosya listesi → olay akışı |
| `disari-aktar` | Kopyaları klasörlere çıkarır | seçim + hedef → kopyalanan dosyalar |
| Arayüz | Karşılama, Ayıklama, Sonuç ekranları | olay akışı + kayıt → ekran |

## 8. Hata durumları

- Açılamayan / bozuk dosya: atlanır, "Okunamayanlar" listesine yazılır; iş durmaz.
- Model inemezse (internet yok, ilk açılış): anlaşılır Türkçe mesaj + "Tekrar dene"; tarih gruplaması yine çalışır, sahne grupları beklemede kalır.
- Ekran kartı kullanılamazsa: işlemciyle devam eder (daha yavaş), kullanıcıya bilgi verilir.
- Disk dolu (dışa aktarırken): kopyalama durur, ne kadarının kopyalandığı gösterilir.
- Program yarıda kapanırsa: önbellek sayesinde kaldığı yerden sürer.

## 9. Güvenlik kuralları

- Program **hiçbir dosyayı silmez, taşımaz, değiştirmez**. Yalnızca okur ve (istenirse) kopyalar.
- Hiçbir fotoğraf internete gönderilmez.

## 10. Test

- Birim testleri: tarih bulma (her kaynak + dosya adı kalıpları), kopya bulma, kalite eşikleri, dışa aktarma klasör düzeni.
- Örnek test klasörü: bilinen deniz/orman/şehir/kopya/bulanık fotoğraflardan oluşan küçük set; sahne doğruluğu elle kontrol edilir.
- Arayüz: programı çalıştırıp üç ekran ve animasyon ekran görüntüsüyle doğrulanır; 2.000+ dosyada akıcılık kontrol edilir.

## 11. İlk sürüme girmeyenler

Yüz tanıma, harita görünümü, Instagram carousel hazırlama, silme özelliği, telefon/bulut bağlantısı.
