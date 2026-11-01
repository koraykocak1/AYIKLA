import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, Object3D, type InstancedMesh } from 'three';
import { yiginKonumu, type Nokta } from '../mantik/duzen';

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
}

export function yeniKart(): KartDurumu {
  return { grup: null, k: 0, renk: new Color(), kalkis: 0, basladi: false, x: 0, y: 0, bx: 0, by: 0 };
}

const EN_FAZLA = 6000;
const UCUS = 1.1; // saniye
const YIGIN_RENGI = new Color('#4a4033');

function yumusak(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function Kartlar({ veri }: { veri: RefObject<YiginVerisi> }) {
  const mesh = useRef<InstancedMesh>(null);
  const kukla = useMemo(() => new Object3D(), []);
  const renk = useMemo(() => new Color(), []);
  const { size, camera } = useThree();

  useLayoutEffect(() => {
    camera.zoom = size.height / 20; // görünen yükseklik = 20 birim
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useFrame(() => {
    const m = mesh.current;
    const v = veri.current;
    if (!m || !v) return;
    const t = performance.now() / 1000;
    const n = Math.min(v.toplam, EN_FAZLA);
    m.count = n;
    const aci = t * 0.22;
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
        y = p.y + Math.sin(t * 1.3 + i) * 0.05;
        z = p.z;
        don = aci * 0.5 + i * 0.7;
        if (k) {
          k.x = x;
          k.y = y;
        }
        renk.copy(YIGIN_RENGI).multiplyScalar(0.75 + (0.5 * ((i * 37) % 11)) / 11);
        if (v.bitti && !(k && k.grup)) olcek = 0; // okunamayanlar sonda kaybolur
      } else {
        if (!k.basladi) {
          k.basladi = true;
          k.bx = k.x;
          k.by = k.y;
        }
        const u = Math.min(1, (t - k.kalkis) / UCUS);
        const e = yumusak(u);
        const h = v.hedef(k.grup, k.k, v.en);
        const kavis = Math.sin(u * Math.PI);
        x = k.bx + (h.x - k.bx) * e;
        y = k.by + (h.y - k.by) * e + kavis * 1.2;
        z = 2 + kavis * 3 + k.k * 0.0005;
        don = (1 - e) * 1.5 + ((k.k * 0.37) % 0.5) - 0.25;
        olcek = 1 + kavis * 0.6;
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
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, EN_FAZLA]} frustumCulled={false}>
      <planeGeometry args={[0.56, 0.42]} />
      <meshBasicMaterial toneMapped={false} />
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
