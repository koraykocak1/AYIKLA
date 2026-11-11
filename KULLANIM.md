# AYIKLA — Kullanım

## Kurmak
1. `AYIKLA-Kurulum-0.2.1.exe` dosyasına çift tıkla.
2. Windows "Bilgisayarınız korundu" (SmartScreen) derse **Ek bilgi › Yine de çalıştır**'a bas. Program imzasız olduğu için bu uyarı çıkar; imza ücretli olduğundan şimdilik yok.
3. Lisansı kabul et, kurulacak klasörü seç. Masaüstüne ve Başlat menüsüne **AYIKLA** kısayolu eklenir.
4. Kaldırmak için: Ayarlar › Uygulamalar › AYIKLA › Kaldır. Fotoğrafların silinmez.

Geliştiriciler için: `npm run baslat` programı açar, `npm run paketle` kurulum dosyasını `release\` klasörüne üretir.

## Kullanmak
1. Fotoğraf klasörünü pencereye bırak veya **Klasör seç**'e bas.
2. "… fotoğraf · … video bulundu" yazısı çıkınca **Ayıkla**'ya bas. İlk seferde yapay zekâ modeli kendiliğinden bir kez iner (~610 MB; grup eklersen çeviri modeli ~440 MB).
3. Fotoğraflar ortadaki yığından gruplarına uçar. **Durdur** dersen sonra kaldığı yerden sürer.
4. Sonuç ekranında soldan grup seç; fotoğraflar yıl › ay başlıklarıyla dizilir.
   - Tıkla: büyük görünüm (← → ile gez, Esc ile kapat; videolar oynar).
   - Sağ tık: başka gruba taşı. **Elenecekler**'de "Geri al".
   - **+ Grup ekle**: Türkçe bir ad yaz (örn. "Araba"); yapay zekâ arşivi yeniden puanlar.
   - **Klasöre kaydet · N**: açık gruptaki N fotoğrafı seçtiğin klasöre, alt klasör açmadan **kopyalar**.

## Güvenlik
- Program kaynak fotoğraflarını hiçbir zaman silmez, taşımaz, değiştirmez. Yalnızca okur ve istersen kopyalar.
- Hiçbir fotoğraf internete gönderilmez. İnternete yalnız yapay zekâ modeli bir kez iner.
- Programın kendi dosyaları: `C:\Users\<sen>\.ayikla` (küçük resimler, kayıt, model).

## Lisans
GPL-3.0-or-later (`LICENSE`). Kullanılan bileşenlerin lisansları: `docs/LISANSLAR.md`.
