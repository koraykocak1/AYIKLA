import { useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { yay } from '../hareket';
import { sayi } from '../mantik/bicim';

/** Sayı değiştikçe hedefe doğru akarak sayar (azaltılmış harekette doğrudan yazar). */
export function AkanSayi({ deger }: { deger: number }) {
  const azalt = useReducedMotion();
  const ham = useMotionValue(azalt ? deger : 0);
  const yumusak = useSpring(ham, yay.sayac);
  const metin = useTransform(yumusak, (v) => sayi(Math.round(v)));
  useEffect(() => {
    if (azalt) yumusak.jump(deger);
    else ham.set(deger);
  }, [deger, azalt]);
  return <motion.span style={{ fontVariantNumeric: 'tabular-nums' }}>{metin}</motion.span>;
}
