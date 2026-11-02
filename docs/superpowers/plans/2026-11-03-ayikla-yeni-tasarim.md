# AYIKLA yeni tasarım — uygulama planı (3 Kasım 2026)

Kaynak kararlar: [docs/ilham/kararlar.md](../../ilham/kararlar.md). Canlı önizlemeler: `docs/ilham/onizlemeler/`.
Kapsam: yalnızca `src/arayuz`. **Motor (`src/motor`) değişmez.** Gerekli tüm bilgi zaten geliyor
(ör. `tarih` ISO olarak saatiyle birlikte geliyor; tarih + saat göstermek için motora dokunmak gerekmiyor).

## Çalışma şekli
- Ekran ekran ilerlenir. Her ekran bitince: `npm.cmd run tip` + `npm.cmd test` → `npm.cmd run baslat` ile gerçek
  uygulamada gerçek bir klasörle denenir → ekran görüntüsü kullanıcıya gösterilir → **kullanıcı onaylarsa** commit.
  Onay gelmeden bir sonraki ekrana geçilmez.
- Önizlemelerdeki kod kopyalanmaz; aynı mantık React + TypeScript ile, okunur parçalar hâlinde yeniden yazılır.
- Hareket kuralları: yalnızca `transform` / `opacity` canlandırılır; animasyonlar kare sayısına değil gerçek zamana
  (`performance.now`) bağlanır; sistemde "hareketi azalt" açıksa dönme/uçuş kapanır, yalnız solma kalır.
- Renk: siyah ve sıcak zemin, sarı `#FACC15`, etiketler küçük büyük harf monospace.

## Adım 0 — Ortak temel
1. `stil.css`: renk ve yazı değişkenleri (`--sari`, `--zemin`, mono etiket sınıfı), sarı düğme ve çerçeveli düğme.
2. `hareket.ts`: kart yayı (`kartYayi`: sertlik/sönüm), küre dönüş hızı, kıvılcım sayısı gibi değerler tek yerde.
3. `bilesenler/KorArkaPlan.tsx`: kor kıvılcımları (canvas). `App.tsx`'te tüm ekranların altında **tek katman**;
   ekran değişince yeniden başlamaz. Pencere gizliyken durur.
- Kontrol: üç ekranda da arka plan görünür, işlemci kullanımı makul.

## Adım 1 — Karşılama (karar 1 / B)
1. `bilesenler/NoktaKure.tsx`: büyük sarı noktalı küre (three.js, tek çizimde binlerce nokta), yavaş döner;
   fare itince noktalar uzay hissiyle dağılıp yavaşça döner (itme 140px, dönüş 0.0022, sürtünme 0.975).
2. `ekranlar/Karsilama.tsx` yeniden: ortada "ayıkla" + "KLASÖRÜ KÜREYE BIRAK", altta sarı "AYIKLA ›",
   köşelerde son arşivler ve "KLASÖR SEÇ". Mevcut bırakma/seçme/sayma mantığı aynen korunur.
- Kontrol: klasör bırakma, klasör seçme, son arşivden açma, "Durduruldu" notu.

## Adım 2 — Ayıklama (karar 2 / C + sarı enerji halkası)
1. `bilesenler/SariHalka.tsx`: ortada içten dışa açılarak (1.4 sn) beliren halka, 11 neon tel, alev kıvrımları,
   fareyle teller itilir.
2. `bilesenler/GrupKureleri.tsx`: üstte gruplar yan yana küçük noktalı küreler; fotoğraf geldikçe büyür, altında sayı.
3. `bilesenler/YildizTozu.tsx`: motordan gelen her "işlendi" olayı halkadan kopan yıldız tozu olur ve sarmal çizerek
   ≈4–5 sn'de grubuna süzülür; elenecekler gri. Çok hızlı akışta toz sayısı sınırlanır (sayılar yine doğru kalır).
4. `bilesenler/AyiklaYazisi.tsx`: kalın, seyrek zerrecikli füme "AYIKLA", ~0.9 sn'de bütün olarak belirir, yansımalı.
5. `ekranlar/Ayiklama.tsx`: üstte ince sarı ilerleme çizgisi, altta "AYIKLANIYOR · %" ve "DURDUR".
   Olay akışı, durdurma ve bitince sonuca geçiş aynen korunur. Eski `Yigin.tsx` artık kullanılmıyorsa silinir.
- Kontrol: 2.000+ dosyalık klasörde akıcılık; durdur → karşılama → kaldığı yerden devam.

## Adım 3 — Sonuç (karar 3 / A: IZGARA + KÜRE)
1. `mantik/bicim.ts`: `tarihSaat(iso)` → `21 EKİM 2024 · 20:18` (+ test).
2. `mantik/kartDuzeni.ts` (saf fonksiyonlar, + test):
   - `izgaraYerlesimi(liste, genislik)` → her kartın yeri, yıl/ay başlıklarının yeri, toplam yükseklik.
   - `kureYerlesimi(i, n, donus, egim, yaricap)` → küre üstündeki yer ve yön.
3. `bilesenler/KartSahnesi.tsx`: CSS 3B sahne + tek bir döngüde çalışan yay motoru (her kart kendi yayıyla uçar).
   - Izgara: büyük kartlar (160×112), altında tarih + saat; yıl › ay başlıkları; ataletli kaydırma.
     **Binlerce fotoğrafta yalnız ekranda görünenler (+ biraz pay) çizilir**, böylece takılma olmaz.
   - Küre (gösteri): sürükle-çevir, fareyle eğ, arkadakiler soluk. Çok büyük gruplarda kürede en fazla ~300 kart
     gösterilir (ızgarada hepsi durur).
   - IZGARA ⇄ KÜRE geçişinde kartlar sırayla uçar.
4. `ekranlar/Sonuc.tsx` yeniden:
   - Sol: grup listesi, kayan sarı işaret, adetler (taşımada parlar), "+ GRUP EKLE", toplam.
   - Üst: grup adı, dosya sayısı ve yıl aralığı, IZGARA | KÜRE anahtarı, sarı "KLASÖRLERE KAYDET ›".
   - Sağ tık menüsü "ŞU GRUBA TAŞI" (+ elenecekte "GERİ AL · ELENMESİN"); kart soldaki gruba uçar; altta
     "GERİ AL" düğmeli bildirim. Mevcut `tasi`, `geriAl`, `grupEkle`, `aktar` mantığı korunur.
   - Kaydetme ilerlemesi: üstte ince sarı çizgi; bitince sonuç bildirimi (disk dolu uyarısı dahil).
5. `bilesenler/BuyukGorunum.tsx`: kart yerinden büyüyerek açılır; altta tarih + saat; ok tuşları, ESC; video oynar.
- Kontrol: grup değiştirme, taşı + geri al, grup ekle, büyük görünüm, kaydetme; 2.000+ fotoğraflı grupta akıcılık.

## Adım 4 — Son kontrol
- `npm.cmd run tip`, `npm.cmd test`, gerçek arşivle baştan sona deneme, "hareketi azalt" açıkken deneme.
- Ekran görüntüleri (`npm.cmd run ekran`) kullanıcıya gösterilir. Kullanılmayan eski stil/bileşenler temizlenir.

## Sonra (bu planın dışında, sırası gelince)
Windows'ta eksik kalan işler ve hata ayıklama → yayına hazırlık (lisans kontrolü, kurulum dosyası, README,
kişisel dosya temizliği) → Mac sürümü.
