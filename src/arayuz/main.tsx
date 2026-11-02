import { createRoot } from 'react-dom/client';
import { App } from './App';
import './stil.css';

async function baslat() {
  // Geliştirmede tarayıcıda (Electron dışında) açılırsa sahte motor kullanılır; paketlenen programda bu dal yoktur.
  if (import.meta.env.DEV && !window.ayikla) window.ayikla = (await import('./sahteApi')).sahteApi;
  createRoot(document.getElementById('kok')!).render(<App />);
}
void baslat();
