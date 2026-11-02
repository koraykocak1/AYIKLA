# AYIKLA yeni tasarım — alınan kararlar (2 Kasım 2026)

Kaynak: [motion-dev-analizi.md](motion-dev-analizi.md). Renk: siyah zemin + sarı (#FACC15), etiketler küçük büyük harf monospace.

## 1. Karşılama — ONAYLANDI (B)
- Büyük sarı noktalı küre ekranın ortasında (yarıçap ≈ kısa kenarın %50'si), yavaş döner.
- Ortasında "ayıkla" yazısı ve "KLASÖRÜ KÜREYE BIRAK"; altta sarı "AYIKLA ›" düğmesi; köşelerde son arşiv ve "KLASÖR SEÇ".
- Fare: noktalar uzay boşluğundaki gibi ağır dağılır (itme yarıçapı 140px, dönüş yayı 0.0022, sürtünme 0.975),
  fare hızı arttıkça daha çok saçılır; uzaklaşan nokta hafif büyüyüp krem rengine döner.

## 2. Ayıklama — ONAYLANDI (C + sarı enerji halkası)
- Üstte 5 grup küresi yan yana (İNSANLAR, HAYVANLAR, YEMEK, DOĞA, ELENECEK); fotoğraf geldikçe küre büyür, altında sayı. Halka/dalga efekti YOK.
- Ortada (aşağıda) sarı enerji halkası — videodan alınmaz, kodla çizilir: soldan dalgalı alev çizgisi gelip çemberi
  çizer (3.2 sn), 11 ince neon tel titreşir, kenarlardan alev kıvrımları çıkar; fareyle teller itilir (uzay hissi).
- Fotoğraflar görünmez: her fotoğraf küçük sarı yıldız tozu bulutu olarak halkadan kopar, sarmal çizerek yavaşça
  (≈4–5 sn) grubuna süzülür; elenecekler gri toz.
- Üstte ince sarı ilerleme çizgisi, altta "AYIKLANIYOR · %" ve "DURDUR".
- Canlı önizleme: [onizlemeler/ayiklama-sari-halka.html](onizlemeler/ayiklama-sari-halka.html)

## 3. Sonuç — SEÇİLDİ (A · Izgara ⇄ 3B; yalnızca IZGARA + KÜRE)
- Canlı önizleme: [onizlemeler/sonuc-secenekler.html](onizlemeler/sonuc-secenekler.html) (B zaman çarkı ve C zaman sarmalı elendi, kodda gizli duruyor).
- **IZGARA = asıl çalışma alanı:** yıl › ay başlıkları; büyük kartlar (160×112); her kartın altında `GÜN AY YIL · SS:DD` (saat sarı).
  Tıkla → kart yerinden büyüyerek büyük görünüme açılır (ok tuşları, ESC); büyük görünümde de tam tarih + saat.
- **KÜRE = gösteri:** sağ üstteki IZGARA | KÜRE anahtarıyla her kart kendi yayıyla küre yüzeyine uçar; küre yavaş döner,
  sürükleyince ataletle çevrilir, fare yukarı/aşağı eğer; arkadaki kartlar soluk. Tıklama çalışır ama asıl bakış ızgarada.
- Sol grup listesi: kayan sarı işaret; grup değişince eski kartlar düşüp söner, yenileri sırayla uçarak gelir.
- Sağ tık → "ŞU GRUBA TAŞI" menüsü; kart soldaki grubun üstüne uçup kaybolur, sayı parlar, altta "GERİ AL" bildirimi.
  Elenecek fotoğrafta ek olarak "GERİ AL · ELENMESİN".
- "KLASÖRLERE KAYDET ›" sarı düğme; basınca üstte ince sarı ilerleme çizgisi, bitince bilgi bildirimi.
- Arka plan: aynı kor kıvılcımları; imleci yavaşça takip eden soluk sarı ışık hâlesi.

## Tüm sayfaların arka planı — kor kıvılcımları (örnek video analizinden, kodla)
- Zemin: neredeyse siyah, alttan çok hafif sıcak (koyu kahve-kızıl) radyal ışık.
- ~230 turuncu-altın kıvılcım yavaşça yukarı süzülür; yumuşak türbülansla kıvrılır, ara sıra esintiyle yana savrulur.
- Derinlik: uzaktakiler küçük/soluk/yavaş, yakındakiler iri, parlak ve hareket izli (kısa çizgi). Titreyerek doğar ve söner.
- Fare yaklaşınca kıvılcımlar hafifçe kenara kayar. Arka plan ayrı bir katmanda, ön plandaki her şeyin altında durur.
- Önizleme aynı dosyada: onizlemeler/ayiklama-sari-halka.html

## "AYIKLA" başlık animasyonu (örnek video analizinden, kodla) — kullanıcı onayı bekliyor
- Video mantığı: soldan sağa duman/toz akımı süzülür; geçtiği yerde yazı zerreciklerden harf harf belirir; altında soluk ayna yansıması.
- Uygulama: kalın, harf aralıklı "AYIKLA"; zerrecikler cephe geçince yaylı yerine oturur; cephede ince duman telleri ve toz; sarı-altın renk.
- Yer (önizlemede): ayıklama ekranında gruplar ile halka arasında (ekran yüksekliğinin %37'si). Fareyle zerrecikler dağılır, yavaşça geri toplanır.
- Performans notu: animasyonlar kare sayısına değil gerçek zamana bağlanmalı (uygulamada performance.now ile).

### Düzeltmeler (kullanıcı isteği)
- Halka soldan çizgi olarak GELMEZ: doğrudan ortada, biraz içten dışa açılıp parlayarak belirir (1.4 sn).
- "AYIKLA" yazısı gri-füme tonlarında; harf harf değil, bütün yazı silüet olarak ~0.9 sn'de birden belirir. Yansıma korunur.
- "AYIKLA" yazı tarzı: C — çok kalın (900), seyrek iri zerrecikler (aralık ≈ yazı boyu × 0.065, zerrecik ≈ × 0.046), füme gri.
