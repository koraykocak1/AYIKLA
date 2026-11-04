import { motion } from 'motion/react';
import { egri, sure } from '../hareket';

/** Hakkında ve lisanslar (kaynak: docs/LISANSLAR.md). Adresler düz metin: pencere içinde site açılmasın. */
const SATIRLAR = [
  {
    ad: 'CLIP ViT-B/32 (OpenAI)',
    lisans: 'MIT',
    ayrinti: 'Fotoğrafları sahneye göre tanır. Kod ve ağırlık MIT · huggingface.co/Xenova/clip-vit-base-patch32',
  },
  {
    ad: 'OPUS-MT Türkçe → İngilizce',
    lisans: 'CC-BY 4.0',
    ayrinti:
      'Helsinki-NLP, Helsinki Üniversitesi (J. Tiedemann, S. Thottingal, “OPUS-MT — Building open translation services for the World”, EAMT 2020) · creativecommons.org/licenses/by/4.0 · huggingface.co/Helsinki-NLP/opus-mt-tr-en · ONNX biçimine çeviren: Xenova',
  },
  {
    ad: 'FFmpeg 6.1.1 (gyan.dev)',
    lisans: 'GPLv3',
    ayrinti: 'Videolardan kare çıkarır; ayrı program olarak çalışır · Kaynak: github.com/FFmpeg/FFmpeg (commit e38092ef93) · gnu.org/licenses/gpl-3.0',
  },
  {
    ad: 'Diğer bileşenler',
    lisans: 'MIT · Apache · LGPL',
    ayrinti:
      'Electron, React, three.js, Motion, better-sqlite3 (SQLite kamu malı), exifr: MIT · Transformers.js, sharp: Apache-2.0 · libvips, libheif: LGPL-3.0 · Tam liste: docs/LISANSLAR.md',
  },
];

export function Hakkinda({ onKapat }: { onKapat: () => void }) {
  return (
    <motion.section
      className="model-onay"
      aria-label="Hakkında"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: sure.yavas, ease: egri.yumusak }}
    >
      <p className="mo-baslik">AYIKLA 0.1.0</p>
      <p className="soluk">
        Ücretsiz ve açık kaynak. Fotoğrafların bilgisayarından çıkmaz; yalnız yapay zekâ modeli bir kez, onayınla iner.
      </p>
      <ul>
        {SATIRLAR.map((s) => (
          <li key={s.ad}>
            <span className="mo-ad">{s.ad}</span>
            <span className="mo-boyut">{s.lisans}</span>
            <span className="mo-ayrinti">{s.ayrinti}</span>
          </li>
        ))}
      </ul>
      <div className="mo-dugmeler">
        <button className="ikincil" onClick={onKapat}>
          Kapat
        </button>
      </div>
    </motion.section>
  );
}
