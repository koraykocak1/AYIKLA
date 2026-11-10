# AYIKLA

Bilgisayarındaki fotoğraf ve videoları **yapay zekâyla kendiliğinden gruplara ayıran**, ücretsiz ve açık kaynak bir Windows programı.

Klasörü sürükle bırak ya da **"Bilgisayarımdaki fotoğrafları bul"**a bas. AYIKLA fotoğrafları İnsanlar, Hayvanlar, Yemek, Doğa, Deniz, Şehir… diye ayırır, kopyaları ayrıca toplar. İstediğin grubu tek tıkla masaüstüne normal bir klasör olarak kaydedersin.

## İndir

**[Son sürümü indir (Windows)](https://github.com/koraykocak1/AYIKLA/releases/latest)** → `AYIKLA-Kurulum-x.y.z.exe`

- Windows "Bilgisayarınız korundu" derse **Ek bilgi › Yine de çalıştır**'a bas. Program henüz dijital imzalı değil; bu yüzden uyarı çıkar.
- Yalnız bu sayfadan indir. Başka yerlerde paylaşılan kopyalar değiştirilmiş olabilir.
- Program yeni sürümleri kendisi bulur ve sorar; elle güncellemen gerekmez.

## Gizlilik

- **Fotoğrafların bilgisayarından çıkmaz.** Yapay zekâ senin bilgisayarında çalışır; sunucu ya da hesap yoktur.
- Program fotoğraflarını **hiçbir zaman silmez, taşımaz, değiştirmez**; yalnız okur ve istersen kopyalar.
- İnternete yalnız iki şey için çıkar: ilk ayıklamada yapay zekâ modelini bir kez indirmek (~610 MB) ve açılışta yeni sürüm var mı diye GitHub'a bakmak.
- Programın kendi küçük resimleri `C:\Users\<sen>\.ayikla` klasöründe durur. Programı kaldırırken bunları da silmek isteyip istemediğin sorulur.

## Nasıl kullanılır

1. Klasörü pencereye bırak, **Klasör seç**'e ya da **Bilgisayarımdaki fotoğrafları bul**'a bas.
2. Ayıklama bitince soldan bir grup seç.
3. **Klasöre kaydet** ile o grubu (ya da seçtiklerini) istediğin klasöre kopyala.

Ayrıntılar: [KULLANIM.md](KULLANIM.md)

## Geliştirenler için

```
npm install
npm run baslat     # programı açar
npm test           # testler
npm run paketle    # release\ klasörüne kurulum dosyası
```

Electron, React, TypeScript; yapay zekâ: CLIP (OpenAI) ve OPUS-MT, Transformers.js ile yerel. Bileşen lisansları: [docs/LISANSLAR.md](docs/LISANSLAR.md).

## Lisans

[GPL-3.0-or-later](LICENSE)
