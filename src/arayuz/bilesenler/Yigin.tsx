import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  LinearFilter,
  Object3D,
  SRGBColorSpace,
  ShaderMaterial,

  Vector2,
  type InstancedMesh,
  type WebGLRenderer,
} from 'three';
import { yiginKonumu, type Nokta } from '../mantik/duzen';
import ResimIsci from './resimIsci?worker&inline';

/** Bir kartın durumu. grup = null: hâlâ ortadaki yığında. */
export interface KartDurumu {
  grup: string | null;
  k: number; // grubundaki sırası (küme içindeki yeri)
  renk: Color;
  kalkis: number; // saniye (performance.now / 1000)
  basladi: boolean;
  x: number;
  y: number;
  bx: number;
  by: number;
}

export interface YiginVerisi {
  toplam: number;
  en: number;
  bitti: boolean;
  kartlar: KartDurumu[];
  hedef: (grup: string, k: number, en: number) => Nokta;
  /** i. kartın üzerine fotoğrafı (küçük resim adresi) yükler; Yigin bağlanınca dolar. */
  resimIste?: (i: number, adres: string) => void;
}

export function yeniKart(): KartDurumu {
  return { grup: null, k: 0, renk: new Color(), kalkis: 0, basladi: false, x: 0, y: 0, bx: 0, by: 0 };
}

const EN_FAZLA = 6000;
const UCUS = 1.1; // saniye
const BELIRME = 0.45; // fotoğrafın renkten resme geçişi (sn)
const YIGIN_RENGI = new Color('#4a4033');

// Doku atlası: 4096×4096, her kart için 64×48'lik (4:3) bir hücre → 64 × 85 = 5.440 kart
const ATLAS = 4096;
const HG = 64;
const HY = 48;
const SUTUN = ATLAS / HG;
const ATLAS_KAPASITE = SUTUN * Math.floor(ATLAS / HY);
const AYNI_ANDA = 12; // işçide aynı anda hazırlanan küçük resim
const KARE_BASINA = 24; // bir karede GPU'ya yazılan en fazla hücre

function yumusak(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function azaltilmisHareket(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const golgeciVertex = /* glsl */ `
  attribute vec3 hucre; // xy: atlas hücresinin köşesi, z: fotoğrafın görünürlüğü (0-1)
  varying vec2 vUv;
  varying vec3 vHucre;
  varying vec3 vRenk;
  void main() {
    vUv = uv;
    vHucre = hucre;
    #ifdef USE_INSTANCING_COLOR
      vRenk = instanceColor;
    #else
      vRenk = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const golgeciFragment = /* glsl */ `
  uniform sampler2D atlas;
  uniform vec2 hucreBoyu;
  varying vec2 vUv;
  varying vec3 vHucre;
  varying vec3 vRenk;
  void main() {
    vec2 p = vHucre.xy + vec2(vUv.x, 1.0 - vUv.y) * hucreBoyu;
    vec3 foto = texture2D(atlas, p).rgb;
    vec3 c = mix(vRenk, foto, vHucre.z);
    // Kenarlara doğru hafif kararma: kartlar birbirinden ayrışsın, sinematik dursun
    vec2 k = min(vUv, 1.0 - vUv);
    float kenar = smoothstep(0.0, 0.05, min(k.x * 0.75, k.y));
    c *= 0.5 + 0.5 * kenar;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function Kartlar({ veri }: { veri: RefObject<YiginVerisi> }) {
  const mesh = useRef<InstancedMesh>(null);
  const kukla = useMemo(() => new Object3D(), []);
  const renk = useMemo(() => new Color(), []);
  const { size, camera, gl } = useThree();
  const azalt = useMemo(azaltilmisHareket, []);

  // Atlas: koyu başlar; küçük resimler tek tek kendi hücrelerine kopyalanır (tüm doku yeniden yüklenmez)
  const atlas = useMemo(() => {
    const tuval = document.createElement('canvas');
    tuval.width = ATLAS;
    tuval.height = ATLAS;
    const c = tuval.getContext('2d')!;
    c.fillStyle = '#1a1712';
    c.fillRect(0, 0, ATLAS, ATLAS);
    const t = new CanvasTexture(tuval);
    t.flipY = false;
    t.generateMipmaps = false;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);

  const malzeme = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { atlas: { value: atlas }, hucreBoyu: { value: new Vector2((HG - 1) / ATLAS, (HY - 1) / ATLAS) } },
        vertexShader: golgeciVertex,
        fragmentShader: golgeciFragment,
      }),
    [atlas],
  );

  // Kart başına hücre köşesi (sabit) + görünürlük (her karede güncellenir)
  const hucre = useMemo(() => {
    const d = new Float32Array(EN_FAZLA * 3);
    for (let i = 0; i < Math.min(EN_FAZLA, ATLAS_KAPASITE); i++) {
      d[i * 3] = ((i % SUTUN) * HG + 0.5) / ATLAS;
      d[i * 3 + 1] = (Math.floor(i / SUTUN) * HY + 0.5) / ATLAS;
    }
    return new InstancedBufferAttribute(d, 3);
  }, []);
  const yuklenme = useMemo(() => new Float64Array(EN_FAZLA).fill(Infinity), []);
  /** Çözülmüş, GPU'ya yazılmayı bekleyen hücre resimleri. */
  const hazir = useRef<{ i: number; resim: ImageBitmap }[]>([]);

  useLayoutEffect(() => {
    camera.zoom = size.height / 20; // görünen yükseklik = 20 birim
    camera.updateProjectionMatrix();
  }, [size, camera]);

  // Küçük resim kuyruğu: sırayla, aynı anda en fazla AYNI_ANDA tane
  useEffect(() => {
    const renderer = gl as WebGLRenderer;
    renderer.initTexture(atlas);
    const kuyruk: { i: number; adres: string }[] = [];
    const istenen = new Set<number>();
    let calisan = 0;
    let kapandi = false;

    // İndirme ve çözme ayrı bir işçide (Web Worker); burada yalnızca sıra tutulur
    const isci = new ResimIsci();
    isci.onmessage = (e: MessageEvent<{ i: number; resim: ImageBitmap | null }>) => {
      calisan--;
      const { i, resim } = e.data;
      if (resim) {
        if (kapandi) resim.close();
        else hazir.current.push({ i, resim });
      }
      if (!kapandi) ilerle();
    };

    function ilerle() {
      while (calisan < AYNI_ANDA && kuyruk.length) {
        const { i, adres } = kuyruk.shift()!;
        calisan++;
        isci.postMessage({ i, adres: new URL(adres, location.href).href });
      }
    }

    const v = veri.current;
    if (v) {
      v.resimIste = (i, adres) => {
        if (i >= ATLAS_KAPASITE || istenen.has(i)) return;
        istenen.add(i);
        kuyruk.push({ i, adres });
        ilerle();
      };
    }
    return () => {
      kapandi = true;
      isci.terminate();
      for (const h of hazir.current.splice(0)) h.resim.close();
      if (v) v.resimIste = undefined;
    };
  }, [gl, atlas]);

  useFrame(() => {
    const m = mesh.current;
    const v = veri.current;
    if (!m || !v) return;
    const t = performance.now() / 1000;

    // Bekleyen hücre resimlerini atlasa yaz: doğrudan texSubImage2D (three'nin getParameter
    // sorguları kopya başına ~2 ms tutuyordu), kare başına en fazla KARE_BASINA tane.
    if (hazir.current.length) {
      const renderer = gl as WebGLRenderer;
      const g2 = renderer.getContext();
      const doku = (renderer.properties.get(atlas) as { __webglTexture?: WebGLTexture }).__webglTexture;
      if (doku) {
        renderer.state.activeTexture(g2.TEXTURE0);
        renderer.state.bindTexture(g2.TEXTURE_2D, doku);
        renderer.state.pixelStorei(g2.UNPACK_FLIP_Y_WEBGL, false);
        renderer.state.pixelStorei(g2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        renderer.state.pixelStorei(g2.UNPACK_ALIGNMENT, 4);
        for (const { i, resim } of hazir.current.splice(0, KARE_BASINA)) {
          g2.texSubImage2D(g2.TEXTURE_2D, 0, (i % SUTUN) * HG, Math.floor(i / SUTUN) * HY, g2.RGBA, g2.UNSIGNED_BYTE, resim);
          resim.close();
          yuklenme[i] = t;
        }
      }
    }
    const n = Math.min(v.toplam, EN_FAZLA);
    m.count = n;
    const aci = azalt ? 0 : t * 0.22;
    const ucus = azalt ? 0.25 : UCUS;
    const hd = hucre.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const k = v.kartlar[i];
      let x: number;
      let y: number;
      let z: number;
      let don: number;
      let olcek = 1;
      if (!k || !k.grup || t < k.kalkis) {
        // Yığında: altın açılı sarmal, yavaşça döner ve hafifçe dalgalanır
        const p = yiginKonumu(i, n, aci);
        x = p.x;
        y = p.y + (azalt ? 0 : Math.sin(t * 1.3 + i) * 0.05);
        z = p.z;
        don = aci * 0.5 + i * 0.7;
        if (k) {
          k.x = x;
          k.y = y;
        }
        renk.copy(k ? k.renk : YIGIN_RENGI);
        if (!k) renk.multiplyScalar(0.75 + (0.5 * ((i * 37) % 11)) / 11);
        if (v.bitti && !(k && k.grup)) olcek = 0; // okunamayanlar sonda kaybolur
      } else {
        if (!k.basladi) {
          k.basladi = true;
          k.bx = k.x;
          k.by = k.y;
        }
        const u = Math.min(1, (t - k.kalkis) / ucus);
        const e = yumusak(u);
        const h = v.hedef(k.grup, k.k, v.en);
        const kavis = azalt ? 0 : Math.sin(u * Math.PI);
        x = k.bx + (h.x - k.bx) * e;
        y = k.by + (h.y - k.by) * e + kavis * 1.2;
        z = 2 + kavis * 3 + k.k * 0.0005;
        don = (1 - e) * 1.5 + ((k.k * 0.37) % 0.5) - 0.25;
        olcek = 1 + kavis * 0.7; // uçarken büyür: fotoğraf okunur
        k.x = x;
        k.y = y;
        renk.copy(k.renk);
      }
      kukla.position.set(x, y, z);
      kukla.rotation.set(0, 0, don);
      kukla.scale.setScalar(olcek);
      kukla.updateMatrix();
      m.setMatrixAt(i, kukla.matrix);
      m.setColorAt(i, renk);
      const g = (t - yuklenme[i]) / BELIRME;
      hd[i * 3 + 2] = g <= 0 ? 0 : g >= 1 ? 1 : yumusak(g);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    hucre.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, malzeme, EN_FAZLA]} frustumCulled={false}>
      <planeGeometry args={[0.56, 0.42]}>
        <primitive object={hucre} attach="attributes-hucre" />
      </planeGeometry>
    </instancedMesh>
  );
}

export function Yigin({ veri }: { veri: RefObject<YiginVerisi> }) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Kartlar veri={veri} />
    </Canvas>
  );
}
