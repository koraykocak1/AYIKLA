# AYIKLA — Mimari ve Veri Güvenliği

Tarih: 3 Kasım 2026 · commit `f3fee81` + Parti 1. Bölüm 1–4 **bugünkü kodu** anlatır. Bölüm 5–7 **hedef tasarımdır**, henüz YAPILMADI.

## 1. Bugünkü modüller

```
arayuz (React, sandbox)  ──IPC "istek"──▶  ana süreç (src/ana/ana.ts)  ──postMessage──▶  işçi (dist/isci.mjs = src/isci-giris.ts)
      ▲   window.ayikla (onyukle.ts)            │ izin listesi, diyaloglar,                    │ sunucu.ts → motor/*
      └──────────── "olay" ─────────────────────┘ ayikla:// protokolü                           ▼
                                                                                ~/.ayikla/{kayit.json, onizleme/, modeller/}
```

| Katman | Dosya | Görev |
|---|---|---|
| Arayüz | `src/arayuz/*` | Karşılama → Ayıklama → Sonuç ekranları; `api.ts` tek konuşma noktası |
| Köprü | `src/ana/onyukle.ts` | `istek`, `klasorSec`, `aktarSec`, `yolAl`, `olaylariDinle` |
| Ana süreç | `src/ana/ana.ts`, `yollar.ts` | IPC izin listesi (`ARAYUZDEN_IZINLI`), `aktar` yalnız klasör diyaloğundan sonra, `ayikla://` yalnız önizleme ve bu oturumda bildirilen dosyalar |
| İşçi | `src/motor/sunucu.ts` | İstekler: `say`, `baslat`, `durdur`, `gruplar`, `grupEkle`, `grupTasi`, `geriAl`, `sonArsivler`, `aktar` |
| Motor | `tarayici.ts`, `isci.ts`, `tarih.ts`, `onizleme.ts`, `ham.ts`, `ffmpeg.ts`, `kalite.ts`, `parmakizi.ts`, `renk.ts`, `sahne-model.ts`, `sahne-puan.ts`, `gruplar.ts`, `kayit.ts`, `disari-aktar.ts` | Tarama, analiz, gruplama, katalog, dışa aktarma |
| Komut satırı | `src/cli.ts` | Aynı motor, arayüzsüz |

Electron güvenliği: `contextIsolation: true`, `sandbox: true`, menü yok, CSP (`index.html`).

## 2. Bugünkü veri modeli

**Katalog:** `~/.ayikla/kayit.json` (tek JSON). Şema `KayitVerisi` (`kayit.ts`), örnek değerler uydurmadır:

```jsonc
{
  "surum": 1,
  "medya": { "<anahtar>": { /* IslenmisMedya */ } },
  "kullaniciGruplari": [ { "id": "k-araba", "ad": "Araba", "tarifler": ["..."], "ingilizce": "car", "kullanici": true } ],
  "sonArsivler": [ { "girdiler": ["C:\\Örnek"], "tarih": "2026-11-01T10:00:00.000Z", "foto": 12, "video": 1 } ]
}
```

- `anahtar = sha1(yol | boyut | round(mtime))`. İçerik hash'i değildir; yeniden adlandırılan dosya yeni kayıt olur.
- `IslenmisMedya` üç katmanı tek nesnede tutar: kaynak (`yol`, `boyut`, `tarih`, `tarihKaynagi`, `tahmini`), AI (`grupId`, `vektor`, `kalite`, `parmakizi`, `eleme`), kullanıcı (`elleGrup`, `geriAlindi`).
- Önizlemeler: `~/.ayikla/onizleme/<anahtar>.jpg` (384 px), yeniden üretilebilir.
- Modeller: `~/.ayikla/modeller/` (CLIP, opus-mt-tr-en). İlk kullanımda HuggingFace'ten iner.

## 3. Bugünkü veri güvenliği gerçeği

| Konu | Durum |
|---|---|
| Kaynak dosya | Yalnız okunur (`stat`, `readFile`, `sharp`, `ffprobe`). Kodda kaynağa yazan ya da silen çağrı yok ✅ |
| Katalog yazımı | `kayit.json.tmp` → `rename`: yarıda kesilirse eski katalog kalır ✅ |
| Bozuk katalog | Parti 1: `yukle()` bozuk ya da bilinmeyen sürümdeki dosyayı `kayit.json.bozuk-<zaman>` olarak kenara alır; kilitli dosyada boş kayıtla devam etmez ✅ |
| Dışa aktarma | Parti 1: geçici dosya + SHA-256 + kaynak değişim kontrolü + atomik ad; "zaten var" kararı hash ile; üzerine yazma yok ✅ |
| Yarım kopya | Parti 1: yalnız gizli `.…ayikla-gecici` adla oluşur ve her durumda silinir ✅ (elektrik kesintisinde geride kalan geçici dosyayı tarama zaten atlar) |
| Hedef konumu | Parti 1: kaynağın içi, kaynağı içine alan klasör ve çalışma klasörü reddedilir; hedef köküne `.ayikla-arsiv` işareti konur ✅ |
| Ağ | Yalnız model indirme; fotoğraf gönderimi yok ✅ |

## 4. Güvenli kopya akışı (Parti 1'de dışa aktarma için uygulandı: `disari-aktar.ts` `tekDosya`)

1. Kaynağın `stat` bilgisini al (boyut, mtime).
2. Hedef klasörde gizli geçici dosyaya (`.<ad>.ayikla-gecici`) akışla yaz; yazarken kaynağın SHA-256'sını hesapla.
3. Geçici dosyayı ayrıca okuyup SHA-256'sını karşılaştır.
4. Kaynağı yeniden `stat` et: boyut/mtime değiştiyse kopyayı at, bir kez yeniden dene, yine değişirse "kaynak değişti" hatası.
5. Final ad boşsa geçiciyi final ada taşı; doluysa ve hash'i aynıysa "zaten vardı"; değilse `ad (2)`.
6. Hata ya da disk dolu: geçici dosyayı sil, raporla. Başarı/hata/atlanan sayıları ayrı.
7. Kaynak hiçbir adımda yazılmaz.

## 5. Hedef: arşiv dizini (YAPILMADI)

```
<ArşivKökü>/
  .ayikla-arsiv            # kimlik + sürüm (JSON); taramada bu klasör atlanır
  katalog/ayikla.db        # SQLite (WAL, yalnız yerel disk)
  medya/<sha256[0:2]>/<sha256>.<uzantı>   # içerik adresli tek fiziksel kopya
  onizleme/                # yeniden üretilebilir
  kutu/                    # geri dönüşüm kutusu (30 gün)
  yedek/                   # doğrulanmış katalog yedekleri
  kilit                    # tek-yazıcı kilidi (cihaz, süreç, zaman)
```

Parti 1 bunun yalnız ilk parçasını getirir: dışa aktarma hedefinin köküne `.ayikla-arsiv` işareti yazılır, tarayıcı bu işareti taşıyan alt klasörleri atlar (madde 115). İşaret klasörle birlikte taşındığı için arşiv başka yere taşınsa da dışlama sürer.

## 6. Hedef SQLite şeması (YAPILMADI, taslak)

| Tablo | Alanlar (özet) | Not |
|---|---|---|
| `blob` | `sha256` PK, `boyut`, `yol_goreli`, `ref_sayisi` | Fiziksel dosya; ref > 0 iken silinmez (117) |
| `oge` | `id`, `blob_sha256`, `ad_orijinal`, `tur`, `eklenme`, `silinme` (kutu), `gizli` | Mantıksal medya |
| `kaynak_yolu` | `oge_id`, `yol`, `boyut`, `mtime`, `son_gorulme` | Köken (053), çoklu yol |
| `meta_kaynak` | `oge_id`, EXIF/GPS/tarih alanları | Katman (a) |
| `meta_ai` | `oge_id`, `modul`, `model`, `surum`, `deger`, `guven`, `zaman` | Katman (b), 093 |
| `meta_kullanici` | `oge_id`, `alan`, `deger`, `zaman` | Katman (c); AI'dan önceliklidir |
| `album`, `album_oge` | | Albümden kaldırmak yalnız `album_oge` satırını siler |
| `islem_gunlugu` | `id`, `tur`, `once`, `sonra`, `zaman` | Toplu geri alma (123) |
| `is_kuyrugu` | `id`, `tur`, `durum`, `oncelik`, `deneme` | 040, 094 |
| `sema_surumu` | `surum` | Migration (107) |

Kurallar: her toplu değişiklik tek transaction; yedek `VACUUM INTO` ya da online backup + `PRAGMA integrity_check`; veritabanı ağ yolunda açılmaz (070). SQLite paketi seçimi (ör. Node'un yerleşik `node:sqlite` modülü ya da `better-sqlite3`) lisans ve Electron uyumu denetlenerek yapılacak.

## 7. Tek yazıcı ve gizlilik sınırları

- **Tek yazıcı (YAPILMADI):** arşiv kökünde `kilit` dosyası, yalnız yoksa oluşturulur; içinde cihaz adı, süreç kimliği, zaman. Süreç yaşamıyorsa kullanıcıya sorularak bayat kilit kaldırılır.
- **Şifre/PIN yok.** "Gizli" yalnız görünüm filtresidir; dosyalar Dosya Gezgini'nden açılabilir ve bu açıkça söylenir.
- **Ağ:** yalnız model indirme. Hedef: ilk indirmeden önce boyut ve lisansla birlikte onay (055, 073, 081).
- **API anahtarı (ileride):** Electron `safeStorage` / Windows Credential Manager; düz dosyada ve günlükte yok.
- **Yüz verisi (ileride):** ayrı izin, yerel, tek tuşla silinir; KVKK incelemesi önce.
