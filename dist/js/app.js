/**
 * StopKm - Aplicação Principal (PWA Mobile-First)
 * Ponto de entrada, inicialização e inscrição reativa da Store
 */

import { initUI, updateAllViews } from './ui.js';
import { subscribe, seedSampleDataIfEmpty } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializa toda a interface e eventos
  initUI();

  // Inscreve a UI para re-renderizar automaticamente em qualquer mudança no LocalStorage
  subscribe(() => {
    updateAllViews();
  });

  // Registro do Service Worker para funcionamento 100% Offline (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('StopKm PWA Service Worker registrado:', reg.scope);
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('Erro ao registrar Service Worker:', err);
      });
  }
});
