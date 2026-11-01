import { useEffect, useState } from 'react';
import { api } from './api';

export function App() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    api.gruplar().then((g) => setN(g.length)).catch(() => setN(-1));
  }, []);
  return <h1 style={{ color: '#e8c98a', fontFamily: 'Georgia', padding: 40 }}>AYIKLA · {n === null ? '…' : `${n} grup`}</h1>;
}
