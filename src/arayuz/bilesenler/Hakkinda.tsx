import { useState } from 'react';
import { motion } from 'motion/react';
import { egri, sure } from '../hareket';

/**
 * Hakkında ve lisanslar (kaynak: docs/LISANSLAR.md). Üstte sade özet; zorunlu atıflar (CC-BY yazarları,
 * GPL kaynak adresi) "Lisans ayrıntıları" altında. Adresler düz metin: pencere içinde site açılmasın.
 */
const SATIRLAR = [
  {
    is: 'Fotoğraf tanıma',
    ad: 'CLIP (OpenAI)',
    lisans: 'MIT',
    ayrinti: 'CLIP ViT-B/32. Kod ve ağırlık MIT · huggingface.co/Xenova/clip-vit-base-patch32',
  },
  {
    is: 'Grup adı çevirisi',
    ad: 'OPUS-MT (Helsinki Üniversitesi)',
    lisans: 'CC-BY 4.0',
    ayrinti:
      'OPUS-MT Türkçe → İngilizce. Helsinki-NLP, Helsinki Üniversitesi (J. Tiedemann, S. Thottingal, “OPUS-MT — Building open translation services for the World”, EAMT 2020) · creativecommons.org/licenses/by/4.0 · huggingface.co/Helsinki-NLP/opus-mt-tr-en · ONNX biçimine çeviren: Xenova',
  },
  {
    is: 'Video kareleri',
    ad: 'FFmpeg 6.1.1',
    lisans: 'GPLv3',
    ayrinti: 'gyan.dev derlemesi; ayrı program olarak çalışır · Kaynak: github.com/FFmpeg/FFmpeg (commit e38092ef93) · gnu.org/licenses/gpl-3.0',
  },
  {
    is: 'Diğerleri',
    ad: 'Electron, React, SQLite…',
    lisans: 'MIT · Apache · LGPL',
    ayrinti:
      'Electron, React, three.js, Motion, better-sqlite3 (SQLite kamu malı), exifr: MIT · Transformers.js, sharp: Apache-2.0 · libvips, libheif: LGPL-3.0 · Tam liste: docs/LISANSLAR.md',
  },
];

export function Hakkinda({ onKapat }: { onKapat: () => void }) {
  const [ayrinti, setAyrinti] = useState(false);
  return (
    <motion.section
      className="model-onay"
      aria-label="Hakkında"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: sure.yavas, ease: egri.yumusak }}
    >
      <p className="mo-baslik">
        AYIKLA 0.2.2 <span className="mo-boyut">· GPLv3</span>
      </p>
      <p className="soluk">Ücretsiz ve açık kaynak. Fotoğrafların bilgisayarından çıkmaz. Açılışta yalnız yeni sürüm var mı diye GitHub'a bakar.</p>
      <ul>
        {SATIRLAR.map((s) => (
          <li key={s.ad}>
            <span className="mo-ad">
              <span className="soluk">{s.is}:</span> {s.ad}
            </span>
            <span className="mo-boyut">{s.lisans}</span>
            {ayrinti && <span className="mo-ayrinti">{s.ayrinti}</span>}
          </li>
        ))}
      </ul>
      {ayrinti && (
        <p className="mo-ayrinti">
          AYIKLA, GNU Genel Kamu Lisansı sürüm 3 ya da sonrası (GPL-3.0-or-later) ile dağıtılır; tam metin programla gelen LICENSE dosyasında · gnu.org/licenses/gpl-3.0
        </p>
      )}
      <div className="mo-dugmeler">
        <button className="metin-dugme etiket" onClick={() => setAyrinti((a) => !a)} style={{ marginRight: 'auto' }}>
          {ayrinti ? 'Ayrıntıları gizle' : 'Lisans ayrıntıları ›'}
        </button>
        <button className="ikincil" onClick={onKapat}>
          Kapat
        </button>
      </div>
    </motion.section>
  );
}
