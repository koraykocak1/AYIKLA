# motion.dev ana sayfası — tasarım ve animasyon analizi (2 Kasım 2026)

AYIKLA'nın yeni tasarımı için ilham kaynağı. Burada **sitenin kodu yok**, yalnızca her bölümde ne
gördüğümüz, nasıl çalıştığı ve AYIKLA'da nereye uyarlanacağı yazıyor. Kodları kendimiz, Motion
kütüphanesiyle (`motion/react`) ve Motion becerisinin kurallarıyla (`.claude/skills/motion`) yazacağız.

## Genel görünüm (her bölümde ortak)
- **Renkler:** saf siyah zemin (#000 / #0b0b0b), koyu gri kartlar (#141414 civarı), ana vurgu **sarı**
  (#FFF312 – #FACC15 arası), küçük vurgu yeşil (Motion+ düğmesi).
- **Yazı:** büyük başlıklar sade, ince grotesk (sans-serif); düğmeler ve etiketler
  **küçük, büyük harf, tek aralıklı (monospace)**: `GET STARTED`, `LAYOUT DOCS →`.
- **Çizgiler:** ince gri ayırıcılar, bölümler kart kart; köşe yuvarlaklığı çok az.
- **Üst menü:** sabit, yarı saydam siyah; kaydırınca altında ince çapraz çizgiler beliriyor.
- **Düğme:** sarı dolgu + siyah büyük harf yazı + küçük ok (`›`). İkincil düğme: çerçeveli.
- **Kaydırma:** yumuşak, ataletli (Lenis tarzı).

## Bölüm bölüm

### 1. Giriş — parçacık küre
- Binlerce sarı noktadan oluşan, kendi ekseninde yavaş dönen küre (WebGL).
- Ekvatorunda daha yoğun, parlayan bir **toz kuşağı** var (Satürn halkası gibi).
- Fare küre üstünde gezince noktalar fareden **itiliyor** ve yay (spring) ile yerine dönüyor;
  küre fare yönüne hafifçe eğiliyor.
- Yanında: büyük başlık, kısa açıklama, kopyalanabilir komut kutusu + sarı düğme.
- **AYIKLA'da:** Karşılama ekranının merkezi. Klasör bırakılınca küre parlıyor; "Ayıkla"ya basınca
  küre gruplara bölünüyor (sohbette denemesi yapıldı ve beğenildi).

### 2. Layout animasyonları (RUNWAY / BACKSTAGE / OBJECTS)
- Yan yana fotoğraf kartları. Alttaki sekmeler değişince kartlar **yer değiştirip yeniden
  diziliyor**, boyutları akıcı şekilde değişiyor.
- Karta tıklayınca kart, bulunduğu yerden **büyüyerek** büyük görünüme geçiyor (`layoutId`).
- Sekme altındaki seçili işaret sekmeler arasında kayıyor.
- **AYIKLA'da:** Sonuç ekranında grup değişince fotoğraflar uçarak yeni yerlerine dizilir;
  küçük resim tıklanınca aynı resim büyüyerek tam ekrana açılır; sol menüdeki seçili işaret kayar.

### 3. Hareket (gesture) animasyonları
- Eğik duran 3 sinematik ürün kartı. Üzerine gelince büyüyor, basınca hafif küçülüyor,
  **sürükleyince fırlatılabiliyor**, bırakınca yaylanıp yerine dönüyor.
- **AYIKLA'da:** Fotoğrafı sürükleyip başka bir grubun küresine atma (sağ tık menüsüne ek).
  Üzerine gelince kart büyür ve fareye doğru hafif 3B eğilir.

### 4. Kaydırma (scroll) animasyonları
- Yatay kayan fotoğraf şeridi; altında `0%`dan `100%`e dolan ince ilerleme çizgisi.
- **AYIKLA'da:** Sonuç ekranında yıl/ay başlıkları üstte yapışık kalır; kenarda yılların durduğu
  ince bir zaman çubuğu kaydırmayla dolar.

### 5. Yay (spring) animasyonları
- Siyah kutuda sarı bir kare fareyi **gecikmeli ve yaylı** takip ediyor. Stiffness / Damping /
  Mass kaydırıcılarıyla his anında değişiyor.
- **AYIKLA'da:** Tüm hareketlerin ortak hissi: imleci takip eden sarı ışık hâlesi, yaylı açılan
  menüler. Değerler `src/arayuz/hareket.ts`'de tek yerde tutulur.

### 6. Dört küçük özellik kartı
- Donanım hızlandırma, çıkış animasyonları (`AnimatePresence`), 3B (Three.js nesnelerini aynı
  yaylarla canlandırma), küçük boyut. Sade yazı kartları, ince dikey çizgilerle ayrılmış.
- **AYIKLA'da:** Kürenin parçacıklarını Motion yaylarıyla sürmek (proje zaten `three` ve
  `@react-three/fiber` kullanıyor).

### 7. Motion+ vitrini (ücretli bölüm — yalnızca görünüm ilhamı)
- **Motion UI kartı:** yelpaze gibi açılmış ürün kartları, ortadaki öne çıkmış.
  → AYIKLA: "Son arşivler" kartları yelpaze gibi dizilebilir.
- **Örnek kasası:** küçük ekran görüntülerinden ızgara.
- **Performance Doctor:** büyük harf not (B), "F → A" not yükselmesi, kırmızı/yeşil önce-sonra
  satırları. → AYIKLA: ayıklama sonunda özet kartı ("619 fotoğraf elendi" gibi).
- **Motion Studio:** zaman çizelgesi editörü (0.0 – 1.5 sn cetveli, katman satırları).
- **Sayaçlar:** rakamlar **makara gibi dönerek** (0–9 sütunları kayarak) sayıya ulaşıyor.
  → AYIKLA: "1.733 fotoğraf bulundu" sayısı makara gibi dönerek gelsin.

### 8. Galeri vitrini — HELIX / BARREL / RING / SPHERE (en önemli bölüm)
- Onlarca fotoğraf kartı 3B uzayda bir şekil oluşturup yavaşça dönüyor:
  - **Helix:** sarmal merdiven gibi dönen kartlar.
  - **Barrel:** silindir yüzeyine dizilmiş kartlar.
  - **Ring:** tek halka.
  - **Sphere:** kartlar küre yüzeyine dizilmiş.
- Sekmeyle şekil değişince **her kart yaylı şekilde yeni yerine uçuyor**.
- **AYIKLA'da:** Sonuç ekranında yeni "gezinti" görünümü: seçili grubun fotoğrafları küre veya
  sarmal şeklinde döner, fareyle çevrilir, tıklanan kart öne gelip açılır. Ayıklama ekranında da
  fotoğraflar büyük küreden gruplarına bu yöntemle uçar. Kendi kodumuzla yapılacak; sitenin
  bileşeni ücretli (Motion+) ve kullanılmayacak.

### 9. Partnerler, "Made with Motion", son haberler
- Sade logo kartları; topluluk işlerinden kayan şerit; tarihli liste. Satır üzerine gelince hafif
  vurgu.
- **AYIKLA'da:** Son arşivler listesi bu sade, tarihli satır düzeninde olabilir.

### 10. Kapanış ve rehberler
- İki büyük seçenek kartı yan yana; altında iki sütun bağlantı listesi, büyük harf başlıklar.

## AYIKLA için çıkan tasarım kuralları
1. Siyah zemin + sarı vurgu; başka renk yalnızca grupları ayırmak için ve soluk.
2. Etiket ve düğmeler küçük, büyük harf, monospace; başlıklar sade ve büyük.
3. Her şey fareye tepki verir ama yayla ve sakin: itilme, eğilme, büyüme.
4. Fotoğraflar 3B şekillerde (küre, sarmal, halka) yaşar; geçişlerde her kart kendi yolundan uçar.
5. Sayılar makara gibi döner; ilerleme ince sarı çizgiyle gösterilir.
6. "Azaltılmış hareket" açıksa dönme ve uçuş kapanır, yalnızca yumuşak solma kalır.
