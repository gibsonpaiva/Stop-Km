/**
 * StopKm - Módulo de UI & Interações do Usuário
 * Estética LARQ: Cards Brancos, Deep Navy, Ciano Vibrante e Transições Fluidas
 */

import {
  formatCurrency,
  formatKm,
  formatNumber,
  formatDateBR,
  calculateRouteMetrics,
  isSunday,
  BASE_PACKAGE_RATE,
  SUNDAY_PACKAGE_RATE
} from './calculations.js';

import {
  getRoutes,
  getRouteById,
  addRoute,
  updateRoute,
  deleteRoute,
  filterRoutes,
  getAggregatedMetrics,
  getLocalIsoDate,
  clearAllRoutes,
  loadSampleDataIfEmpty,
  exportDataAsJSON,
  importDataFromJSON,
  getSettings,
  saveSettings,
  syncWithSupabase,
  setCurrentUserId
} from './store.js';

import {
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange
} from './supabase.js';

import { renderDashboardCharts } from './charts.js';
import { renderReceiptCard, downloadReceiptImage, shareReceiptSummary } from './receipt.js';

let activeTab = 'tab-dashboard';
let editingRouteId = null;
let dashboardPeriodFilter = 'today';
let receiptPeriodFilter = 'today';
let pendingDeleteId = null;
let currentFormPhotos = [];
let viewerPhotos = [];
let viewerCurrentIndex = 0;
let viewerRouteTitle = '';
let quickAddPhotoRouteId = null;

export function initUI() {
  setupNavigation();
  setupFormListeners();
  setupPhotoUploadListeners();
  setupDashboardFilters();
  setupReceiptFilters();
  setupModals();
  setupSettingsAndBackups();
  setupAuthUI();
  setDefaultFormValues();

  updateAllViews();
  switchTab('tab-dashboard');
  setTimeout(updateNavIndicator, 80);
}

export function triggerHaptic(type = 'light') {
  if ('vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(15);
    else if (type === 'medium') navigator.vibrate(30);
    else if (type === 'success') navigator.vibrate([20, 50, 30]);
    else if (type === 'warning') navigator.vibrate([40, 60, 40]);
  }
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  triggerHaptic(type === 'error' ? 'warning' : 'light');

  const toast = document.createElement('div');
  toast.className = 'larq-toast';

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<div class="w-6 h-6 rounded-full bg-[#25A4DC] text-white flex items-center justify-center flex-shrink-0">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
    </div>`;
  } else if (type === 'error') {
    iconSvg = `<div class="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
    </div>`;
  } else {
    iconSvg = `<div class="w-6 h-6 rounded-full bg-[#25A4DC] text-white flex items-center justify-center flex-shrink-0">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    </div>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="text-xs font-bold text-white flex-1 leading-tight">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#25A4DC', '#0F2942', '#38BDF8', '#10B981']
    });
  }
}

function setupNavigation() {
  const navButtons = document.querySelectorAll('.larq-nav-btn');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  window.addEventListener('resize', () => {
    updateNavIndicator();
  });
}

export function updateNavIndicator(tabId = activeTab) {
  const bubble = document.getElementById('nav-indicator-bubble');
  const bar = document.querySelector('.larq-bottom-bar');
  if (!bubble || !bar) return;

  const activeBtn = document.querySelector(`.larq-bottom-bar .larq-nav-btn[data-tab="${tabId}"]`);
  if (!activeBtn) return;

  const barRect = bar.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  if (barRect.width === 0 || btnRect.width === 0) return;

  const leftOffset = (btnRect.left - barRect.left) + (btnRect.width - bubble.offsetWidth) / 2;
  bubble.style.transform = `translateX(${leftOffset}px)`;
  bubble.style.opacity = '1';
}

export function switchTab(tabId) {
  if (activeTab === tabId && document.getElementById(tabId)?.classList.contains('active')) {
    return;
  }

  triggerHaptic('light');
  activeTab = tabId;

  document.querySelectorAll('.larq-nav-btn').forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateNavIndicator(tabId);

  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(tabId);
  if (activePane) {
    activePane.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (tabId === 'tab-dashboard') {
    renderDashboard();
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 60);
  } else if (tabId === 'tab-history') {
    renderHistory();
  } else if (tabId === 'tab-reports') {
    renderReceiptCard(receiptPeriodFilter);
  }
}

function setDefaultFormValues() {
  const dateInput = document.getElementById('input-date');
  const startTimeInput = document.getElementById('input-start-time');
  const endTimeInput = document.getElementById('input-end-time');
  const fuelInput = document.getElementById('input-fuel');
  const sundaySwitch = document.getElementById('switch-sunday-rate');

  if (dateInput && !dateInput.value) {
    const todayStr = getLocalIsoDate(new Date());
    dateInput.value = todayStr;
    const isSun = isSunday(todayStr);
    if (sundaySwitch) sundaySwitch.checked = isSun;
    updateSundayBadge(isSun);
  }

  if (startTimeInput && !startTimeInput.value) startTimeInput.value = '08:00';
  if (endTimeInput && !endTimeInput.value) endTimeInput.value = '17:00';
  if (fuelInput && !fuelInput.value) fuelInput.value = '0';

  updateLivePreview();
}

function updateSundayBadge(isSunActive) {
  const badge = document.getElementById('sunday-rate-badge');
  const rateText = document.getElementById('current-rate-indicator');
  const previewRateTag = document.getElementById('preview-rate-tag');
  const sundaySubtitle = document.getElementById('sunday-rate-subtitle');

  const settings = getSettings();
  const baseRate = settings.basePackageRate;
  const sundayRate = settings.sundayPackageRate;

  if (badge) {
    if (isSunActive) {
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  }

  const rateStr = isSunActive ? `R$ ${formatNumber(sundayRate, 2)}/pct` : `R$ ${formatNumber(baseRate, 2)}/pct`;
  if (rateText) rateText.textContent = rateStr;
  if (previewRateTag) {
    previewRateTag.textContent = isSunActive ? `R$ ${formatNumber(sundayRate, 2)} (Domingo)` : `R$ ${formatNumber(baseRate, 2)}/pct`;
  }
  if (sundaySubtitle) {
    sundaySubtitle.textContent = `R$ ${formatNumber(sundayRate, 2)} por pacote entregue`;
  }
}

function setupFormListeners() {
  const form = document.getElementById('route-form');
  const dateInput = document.getElementById('input-date');
  const sundaySwitch = document.getElementById('switch-sunday-rate');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');

  const liveInputs = [
    'input-date',
    'input-start-time',
    'input-end-time',
    'input-start-km',
    'input-end-km',
    'input-stops',
    'input-packages',
    'input-fuel'
  ];

  liveInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    }
  });

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const isSun = isSunday(dateInput.value);
      if (sundaySwitch) sundaySwitch.checked = isSun;
      updateSundayBadge(isSun);
      updateLivePreview();
    });
  }

  if (sundaySwitch) {
    sundaySwitch.addEventListener('change', () => {
      updateSundayBadge(sundaySwitch.checked);
      updateLivePreview();
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetFormToCreateMode);
  }
}

/**
 * Comprime e redimensiona a foto capturada pela câmera ou galeria para envio rápido ao Supabase.
 */
function compressImageFile(file, maxDimension = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          url: dataUrl,
          createdAt: new Date().toISOString()
        });
      };
      img.onerror = () => reject(new Error('Falha ao processar imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

function getPhotoUrl(item) {
  if (!item) return '';
  return typeof item === 'string' ? item : (item.url || '');
}

function setupPhotoUploadListeners() {
  const btnTakePhoto = document.getElementById('btn-take-photo');
  const btnUploadPhoto = document.getElementById('btn-upload-photo');
  const inputCamera = document.getElementById('input-photo-camera');
  const inputGallery = document.getElementById('input-photo-gallery');

  btnTakePhoto?.addEventListener('click', () => {
    triggerHaptic('light');
    quickAddPhotoRouteId = null;
    inputCamera?.click();
  });

  btnUploadPhoto?.addEventListener('click', () => {
    triggerHaptic('light');
    quickAddPhotoRouteId = null;
    inputGallery?.click();
  });

  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    showToast(files.length > 1 ? `Processando ${files.length} fotos...` : 'Processando foto do pacote...', 'info');

    const processed = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImageFile(file);
        processed.push(compressed);
      } catch (err) {
        console.error('Erro ao comprimir foto:', err);
      }
    }

    if (processed.length === 0) {
      showToast('Não foi possível processar a imagem selecionada.', 'error');
      return;
    }

    // Se foi acionado pelo botão rápido "+ Foto" direto em um card do Histórico
    if (quickAddPhotoRouteId) {
      const targetRoute = getRouteById(quickAddPhotoRouteId);
      const routeIdToUpdate = quickAddPhotoRouteId;
      quickAddPhotoRouteId = null;

      if (targetRoute) {
        const existingPhotos = Array.isArray(targetRoute.photos) ? targetRoute.photos : [];
        const updatedPhotos = [...existingPhotos, ...processed];
        updateRoute(routeIdToUpdate, {
          ...targetRoute,
          photos: updatedPhotos
        });
        triggerHaptic('success');
        showToast('Foto anexada à rota e enviada para a nuvem!', 'success');
        updateAllViews();
      }
      return;
    }

    // Fluxo normal no formulário de lançamento/edição
    currentFormPhotos = [...currentFormPhotos, ...processed];
    renderFormPhotosPreview();
    triggerHaptic('success');
    showToast(
      processed.length === 1 ? 'Foto anexada à rota!' : `${processed.length} fotos anexadas à rota!`,
      'success'
    );
  };

  inputCamera?.addEventListener('change', (e) => {
    handleFilesSelected(e.target.files);
    e.target.value = '';
  });

  inputGallery?.addEventListener('change', (e) => {
    handleFilesSelected(e.target.files);
    e.target.value = '';
  });
}

function renderFormPhotosPreview() {
  const previewContainer = document.getElementById('form-photos-preview');
  const countBadge = document.getElementById('form-photos-count');
  if (!previewContainer) return;

  const count = currentFormPhotos.length;
  if (countBadge) {
    countBadge.textContent = `${count} ${count === 1 ? 'foto' : 'fotos'}`;
  }

  if (count === 0) {
    previewContainer.innerHTML = '';
    previewContainer.classList.add('hidden');
    return;
  }

  previewContainer.classList.remove('hidden');

  let html = '';
  currentFormPhotos.forEach((item, idx) => {
    const url = getPhotoUrl(item);
    html += `
      <div class="relative group aspect-square rounded-2xl overflow-hidden border border-sky-100 bg-[#EEF4FA] shadow-sm">
        <img src="${url}" alt="Foto pacote ${idx + 1}" data-idx="${idx}" class="form-photo-thumb w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity">
        <button type="button" data-remove-idx="${idx}" class="btn-remove-form-photo absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
          ✕
        </button>
      </div>
    `;
  });

  previewContainer.innerHTML = html;

  previewContainer.querySelectorAll('.form-photo-thumb').forEach((imgEl) => {
    imgEl.addEventListener('click', () => {
      const idx = parseInt(imgEl.getAttribute('data-idx'), 10) || 0;
      const dateVal = document.getElementById('input-date')?.value || getLocalIsoDate();
      openPhotoViewer(currentFormPhotos, idx, `Fotos da Rota (${formatDateBR(dateVal)})`);
    });
  });

  previewContainer.querySelectorAll('.btn-remove-form-photo').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
      if (!isNaN(idx)) {
        currentFormPhotos.splice(idx, 1);
        renderFormPhotosPreview();
        triggerHaptic('light');
      }
    });
  });
}

export function openPhotoViewer(photos, startIndex = 0, title = 'Fotos da Rota') {
  const validPhotos = (Array.isArray(photos) ? photos : []).filter((p) => Boolean(getPhotoUrl(p)));
  if (validPhotos.length === 0) return;

  viewerPhotos = validPhotos;
  viewerCurrentIndex = Math.max(0, Math.min(startIndex, validPhotos.length - 1));
  viewerRouteTitle = title;

  const modal = document.getElementById('modal-photo-viewer');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  triggerHaptic('light');
  updatePhotoViewerSlide();
}

function updatePhotoViewerSlide() {
  const imgEl = document.getElementById('photo-viewer-img');
  const titleEl = document.getElementById('photo-viewer-title');
  const counterEl = document.getElementById('photo-viewer-counter');
  const downloadEl = document.getElementById('photo-viewer-download');
  const prevBtn = document.getElementById('btn-prev-photo');
  const nextBtn = document.getElementById('btn-next-photo');
  const thumbsContainer = document.getElementById('photo-viewer-thumbs');

  if (!viewerPhotos.length) return;

  const currentItem = viewerPhotos[viewerCurrentIndex];
  const currentUrl = getPhotoUrl(currentItem);

  if (imgEl) imgEl.src = currentUrl;
  if (titleEl) titleEl.textContent = viewerRouteTitle;
  if (counterEl) counterEl.textContent = `Foto ${viewerCurrentIndex + 1} de ${viewerPhotos.length}`;
  if (downloadEl) {
    downloadEl.href = currentUrl;
    downloadEl.download = `StopKm_Pacote_${viewerCurrentIndex + 1}.jpg`;
  }

  if (prevBtn) {
    prevBtn.style.display = viewerPhotos.length > 1 ? 'flex' : 'none';
  }
  if (nextBtn) {
    nextBtn.style.display = viewerPhotos.length > 1 ? 'flex' : 'none';
  }

  if (thumbsContainer) {
    if (viewerPhotos.length <= 1) {
      thumbsContainer.innerHTML = '';
    } else {
      thumbsContainer.innerHTML = viewerPhotos
        .map((item, idx) => {
          const url = getPhotoUrl(item);
          const isActive = idx === viewerCurrentIndex;
          return `
            <button type="button" data-thumb-idx="${idx}" class="viewer-thumb-btn w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
              isActive ? 'border-[#25A4DC] scale-105 shadow-lg' : 'border-white/20 opacity-60 hover:opacity-100'
            }">
              <img src="${url}" alt="Miniatura ${idx + 1}" class="w-full h-full object-cover">
            </button>
          `;
        })
        .join('');

      thumbsContainer.querySelectorAll('.viewer-thumb-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          viewerCurrentIndex = parseInt(btn.getAttribute('data-thumb-idx'), 10) || 0;
          updatePhotoViewerSlide();
        });
      });
    }
  }
}

function closePhotoViewer() {
  const modal = document.getElementById('modal-photo-viewer');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

let activeNotesRouteId = null;

export function openNotesViewer(route) {
  if (!route || !route.notes || !route.notes.trim()) return;
  activeNotesRouteId = route.id;

  const modal = document.getElementById('modal-notes-viewer');
  const subtitleEl = document.getElementById('notes-viewer-subtitle');
  const contentEl = document.getElementById('notes-viewer-content');

  if (subtitleEl) {
    subtitleEl.textContent = `${formatDateBR(route.date)} • ${route.dayOfWeek || ''} (${route.packages} pacotes)`;
  }
  if (contentEl) {
    contentEl.textContent = route.notes.trim();
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    triggerHaptic('light');
  }
}

function closeNotesViewer() {
  activeNotesRouteId = null;
  const modal = document.getElementById('modal-notes-viewer');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function getFormData() {
  const date = document.getElementById('input-date')?.value || getLocalIsoDate();
  const startTime = document.getElementById('input-start-time')?.value || '08:00';
  const endTime = document.getElementById('input-end-time')?.value || '17:00';
  const startKm = parseFloat(document.getElementById('input-start-km')?.value) || 0;
  const endKm = parseFloat(document.getElementById('input-end-km')?.value) || 0;
  const stops = parseInt(document.getElementById('input-stops')?.value, 10) || 0;
  const packages = parseInt(document.getElementById('input-packages')?.value, 10) || 0;
  const fuelCost = parseFloat(document.getElementById('input-fuel')?.value) || 0;
  const isSundayRate = document.getElementById('switch-sunday-rate')?.checked || false;
  const notes = (document.getElementById('input-notes')?.value || '').trim();

  return {
    date,
    startTime,
    endTime,
    startKm,
    endKm,
    stops,
    packages,
    fuelCost,
    isSundayRate,
    notes,
    photos: [...currentFormPhotos]
  };
}

function updateLivePreview() {
  const formData = getFormData();
  const settings = getSettings();
  const existingRoute = editingRouteId ? getRoutes().find((r) => r.id === editingRouteId) : null;
  const baseRate = existingRoute && typeof existingRoute.baseRate === 'number' ? existingRoute.baseRate : settings.basePackageRate;
  const sundayRate = existingRoute && typeof existingRoute.sundayRate === 'number' ? existingRoute.sundayRate : settings.sundayPackageRate;

  const metrics = calculateRouteMetrics({
    ...formData,
    baseRate,
    sundayRate
  });

  const previewGross = document.getElementById('preview-gross-earnings');
  const previewNet = document.getElementById('preview-net-profit');
  const previewKm = document.getElementById('preview-total-km');
  const previewTime = document.getElementById('preview-total-time');
  const previewEfficiency = document.getElementById('preview-efficiency');
  const previewDensity = document.getElementById('preview-density');
  const previewRateTag = document.getElementById('preview-rate-tag');
  const previewPackagesHour = document.getElementById('preview-packages-hour');

  if (previewGross) previewGross.textContent = formatCurrency(metrics.grossEarnings);
  if (previewNet) previewNet.textContent = formatCurrency(metrics.netProfit);
  if (previewKm) previewKm.textContent = formatKm(metrics.totalKm);
  if (previewTime) previewTime.textContent = metrics.durationFormatted;
  if (previewEfficiency) previewEfficiency.textContent = `${formatCurrency(metrics.efficiencyPerKm)}/km`;
  if (previewDensity) previewDensity.textContent = `${formatNumber(metrics.densityPerStop, 1)} pct`;
  if (previewPackagesHour) previewPackagesHour.textContent = `${formatNumber(metrics.packagesPerHour, 1)} pct/h`;
  if (previewRateTag) {
    previewRateTag.textContent = metrics.isSundayRate ? `R$ ${formatNumber(sundayRate, 2)} (Domingo)` : `R$ ${formatNumber(baseRate, 2)}/pct`;
  }
}

function handleFormSubmit() {
  const formData = getFormData();

  if (formData.packages <= 0 && formData.stops <= 0) {
    showToast('Informe a quantidade de pacotes entregues.', 'error');
    document.getElementById('input-packages')?.focus();
    return;
  }

  if (formData.endKm > 0 && formData.startKm > 0 && formData.endKm < formData.startKm) {
    showToast('Km Final não pode ser menor que o Inicial.', 'error');
    document.getElementById('input-end-km')?.focus();
    return;
  }

  if (editingRouteId) {
    updateRoute(editingRouteId, formData);
    showToast('Rota atualizada com sucesso!', 'success');
    resetFormToCreateMode();
  } else {
    addRoute(formData);
    showToast('Rota salva com sucesso!', 'success');
    triggerConfetti();
    resetFormToCreateMode();
  }

  updateAllViews();
}

function resetFormToCreateMode() {
  editingRouteId = null;
  currentFormPhotos = [];
  renderFormPhotosPreview();

  const form = document.getElementById('route-form');
  if (form) form.reset();

  const notesInput = document.getElementById('input-notes');
  if (notesInput) notesInput.value = '';

  const titleEl = document.getElementById('form-mode-title');
  const submitBtnText = document.getElementById('btn-submit-text');
  const cancelBtn = document.getElementById('btn-cancel-edit');

  if (titleEl) titleEl.textContent = 'Lançamento de Rota';
  if (submitBtnText) submitBtnText.textContent = 'Salvar Rota';
  if (cancelBtn) cancelBtn.classList.add('hidden');

  setDefaultFormValues();
}

export function loadRouteForEdit(id) {
  const route = getRouteById(id);
  if (!route) {
    showToast('Rota não encontrada.', 'error');
    return;
  }

  editingRouteId = id;
  currentFormPhotos = Array.isArray(route.photos) ? [...route.photos] : [];
  renderFormPhotosPreview();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : '';
  };

  setVal('input-date', route.date);
  setVal('input-start-time', route.startTime || '08:00');
  setVal('input-end-time', route.endTime || '17:00');
  setVal('input-start-km', route.startKm || '');
  setVal('input-end-km', route.endKm || '');
  setVal('input-stops', route.stops || '');
  setVal('input-packages', route.packages || '');
  setVal('input-fuel', route.fuelCost || '0');
  setVal('input-notes', route.notes || '');

  const sundaySwitch = document.getElementById('switch-sunday-rate');
  if (sundaySwitch) sundaySwitch.checked = Boolean(route.isSundayRate);

  updateSundayBadge(Boolean(route.isSundayRate));
  updateLivePreview();

  const titleEl = document.getElementById('form-mode-title');
  const submitBtnText = document.getElementById('btn-submit-text');
  const cancelBtn = document.getElementById('btn-cancel-edit');

  if (titleEl) titleEl.textContent = `Editando Rota (${formatDateBR(route.date)})`;
  if (submitBtnText) submitBtnText.textContent = 'Atualizar Rota';
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  switchTab('tab-entry');
  showToast('Dados carregados para edição.', 'info');
}

export function renderDashboard() {
  const routes = filterRoutes(dashboardPeriodFilter);
  const metrics = getAggregatedMetrics(routes);
  const allRoutes = getRoutes();

  const setElText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Mantém os Hero Cards do Topo consistentes (Semana e Mês)
  updateHeroCards();

  // Atualiza Cards de Desempenho
  setElText('kpi-gross-revenue', formatCurrency(metrics.totalGross));
  setElText('kpi-total-km', formatKm(metrics.totalKm));
  setElText('kpi-total-packages', `${metrics.totalPackages.toLocaleString('pt-BR')} un`);
  setElText('kpi-packages-hour', `${formatNumber(metrics.avgPackagesPerHour, 1)} pct/h`);
  setElText('kpi-efficiency-km', `${formatCurrency(metrics.avgEarningsPerKm)}/km`);
  setElText('kpi-fuel-total', formatCurrency(metrics.totalFuel));
  setElText('kpi-days-count', `${metrics.daysWorked} ${metrics.daysWorked === 1 ? 'dia' : 'dias'} em rota`);

  // Renderiza Gráficos LARQ
  renderDashboardCharts(allRoutes);
}

export function renderHistory() {
  const container = document.getElementById('history-list-container');
  const countBadge = document.getElementById('history-count-badge');
  if (!container) return;

  const rawRoutes = getRoutes();
  const routes = [...rawRoutes].sort((a, b) => {
    const dateA = (a.date || '').trim();
    const dateB = (b.date || '').trim();
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    const timeA = (a.startTime || '').trim();
    const timeB = (b.startTime || '').trim();
    if (timeA !== timeB) return timeB.localeCompare(timeA);

    const tsA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
    const tsB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
    if (tsB !== tsA) return tsB - tsA;

    return (b.id || '').localeCompare(a.id || '');
  });

  if (countBadge) countBadge.textContent = `${routes.length} rotas`;

  if (routes.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center larq-card-white">
        <div class="w-14 h-14 rounded-full bg-[#EEF4FA] mx-auto flex items-center justify-center mb-3 text-slate-400">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h4 class="text-sm font-bold text-[#0F2942]">Nenhuma rota cadastrada</h4>
        <p class="text-xs text-slate-400 mt-1">Faça seu primeiro lançamento para acompanhar os ganhos.</p>
        <button id="btn-empty-add-route" class="mt-4 px-4 py-2 rounded-full bg-[#0F2942] text-white text-xs font-bold">
          + Lançar Rota
        </button>
      </div>
    `;

    document.getElementById('btn-empty-add-route')?.addEventListener('click', () => switchTab('tab-entry'));
    return;
  }

  let html = '';

  routes.forEach((route) => {
    const isSun = Boolean(route.isSundayRate);
    const dateFormatted = formatDateBR(route.date);
    const pacePerHour = route.packagesPerHour ? formatNumber(route.packagesPerHour, 1) : (route.durationHours > 0 ? formatNumber(route.packages / route.durationHours, 1) : '0');
    const routePhotos = Array.isArray(route.photos) ? route.photos.filter((p) => Boolean(getPhotoUrl(p))) : [];
    const hasNotes = Boolean(route.notes && route.notes.trim().length > 0);

    let photosSectionHtml = '';
    if (routePhotos.length > 0) {
      const thumbsHtml = routePhotos
        .map((p, pIdx) => {
          const url = getPhotoUrl(p);
          return `
            <button type="button" class="btn-view-route-photo relative w-14 h-14 rounded-xl overflow-hidden border border-sky-100 bg-[#EEF4FA] flex-shrink-0 group shadow-sm" data-id="${route.id}" data-photo-idx="${pIdx}">
              <img src="${url}" alt="Foto pacote ${pIdx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
            </button>
          `;
        })
        .join('');

      photosSectionHtml = `
        <div class="py-2.5 border-t border-slate-100 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#25A4DC] flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Fotos dos Pacotes (${routePhotos.length})
            </span>
            <button type="button" class="btn-view-route-photo text-[10px] font-bold text-[#0F2942] hover:text-[#25A4DC] underline" data-id="${route.id}" data-photo-idx="0">
              Ver ampliado
            </button>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            ${thumbsHtml}
          </div>
        </div>
      `;
    }

    const notesBtnHtml = hasNotes
      ? `
        <button type="button" class="btn-view-route-notes px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/70 text-xs font-bold flex items-center gap-1 transition-colors" data-id="${route.id}">
          <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>Ver Observação</span>
        </button>
      `
      : '';

    html += `
      <div class="larq-card-white p-4 relative" data-id="${route.id}">
        
        <!-- Topo do Card -->
        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-2xl ${isSun ? 'bg-amber-100 text-amber-700' : 'bg-[#EEF4FA] text-[#0F2942]'} flex items-center justify-center font-bold text-xs">
              ${route.date.substring(8, 10)}
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold text-[#0F2942]">${dateFormatted}</span>
                ${isSun ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">DOMINGO</span>' : ''}
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-[#25A4DC] border border-sky-100">${pacePerHour} pct/h</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium">${route.dayOfWeek} • ${route.startTime} às ${route.endTime} (${route.durationFormatted})</span>
            </div>
          </div>

          <div class="text-right">
            <div class="text-sm font-extrabold text-[#0F2942]">${formatCurrency(route.grossEarnings)}</div>
            <span class="text-[10px] text-emerald-600 font-bold">Líq: ${formatCurrency(route.netProfit)}</span>
          </div>
        </div>

        <!-- 4 Mini Chips -->
        <div class="grid grid-cols-4 gap-2 py-2.5 text-center">
          <div class="bg-[#EEF4FA] rounded-xl p-1.5">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Pacotes</span>
            <span class="font-bold text-[#0F2942] block text-xs">${route.packages}</span>
          </div>
          <div class="bg-[#EEF4FA] rounded-xl p-1.5">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Km Total</span>
            <span class="font-bold text-[#0F2942] block text-xs">${route.totalKm} km</span>
          </div>
          <div class="bg-[#EEF4FA] rounded-xl p-1.5">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">R$/Km</span>
            <span class="font-bold text-[#25A4DC] block text-xs">${formatCurrency(route.efficiencyPerKm).replace('R$', '')}</span>
          </div>
          <div class="bg-[#EEF4FA] rounded-xl p-1.5">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Combustível</span>
            <span class="font-bold ${route.fuelCost > 0 ? 'text-amber-600' : 'text-slate-400'} block text-xs">${route.fuelCost > 0 ? formatCurrency(route.fuelCost).replace('R$', '') : '-'}</span>
          </div>
        </div>

        ${photosSectionHtml}

        <!-- Ações: Anexar Foto, Ver Observação, Editar e Excluir -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" class="btn-quick-photo-route px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#25A4DC] text-xs font-bold flex items-center gap-1 transition-colors" data-id="${route.id}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>+ Foto</span>
            </button>
            ${notesBtnHtml}
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <button class="btn-edit-route px-3 py-1.5 rounded-lg bg-[#EEF4FA] hover:bg-slate-200 text-[#0F2942] text-xs font-bold flex items-center gap-1" data-id="${route.id}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Editar
            </button>
            
            <button class="btn-delete-route px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1" data-id="${route.id}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Excluir
            </button>
          </div>
        </div>

      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-view-route-photo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const photoIdx = parseInt(btn.getAttribute('data-photo-idx'), 10) || 0;
      const route = getRouteById(id);
      if (route && Array.isArray(route.photos) && route.photos.length > 0) {
        openPhotoViewer(route.photos, photoIdx, `Rota de ${formatDateBR(route.date)} (${route.packages} pacotes)`);
      }
    });
  });

  container.querySelectorAll('.btn-view-route-notes').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const route = getRouteById(id);
      if (route) {
        openNotesViewer(route);
      }
    });
  });

  container.querySelectorAll('.btn-quick-photo-route').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      quickAddPhotoRouteId = id;
      triggerHaptic('light');
      document.getElementById('input-photo-camera')?.click();
    });
  });

  container.querySelectorAll('.btn-edit-route').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      loadRouteForEdit(id);
    });
  });

  container.querySelectorAll('.btn-delete-route').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      promptDeleteRoute(id);
    });
  });
}

function promptDeleteRoute(id) {
  pendingDeleteId = id;
  const modal = document.getElementById('modal-confirm-delete');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    triggerHaptic('warning');
  }
}

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal = document.getElementById('modal-confirm-delete');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function setupDashboardFilters() {
  const buttons = document.querySelectorAll('.dashboard-filter-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      dashboardPeriodFilter = btn.getAttribute('data-filter');
      renderDashboard();
    });
  });
}

function setupReceiptFilters() {
  const buttons = document.querySelectorAll('.receipt-filter-btn');
  const customDateBox = document.getElementById('receipt-custom-dates');
  const startInput = document.getElementById('receipt-start-date');
  const endInput = document.getElementById('receipt-end-date');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      receiptPeriodFilter = btn.getAttribute('data-filter');

      if (receiptPeriodFilter === 'custom') {
        customDateBox?.classList.remove('hidden');
      } else {
        customDateBox?.classList.add('hidden');
      }

      renderReceiptCard(receiptPeriodFilter, startInput?.value, endInput?.value);
    });
  });

  if (startInput) {
    startInput.addEventListener('change', () => {
      renderReceiptCard(receiptPeriodFilter, startInput.value, endInput?.value);
    });
  }

  if (endInput) {
    endInput.addEventListener('change', () => {
      renderReceiptCard(receiptPeriodFilter, startInput?.value, endInput.value);
    });
  }

  document.getElementById('btn-download-receipt-png')?.addEventListener('click', () => {
    triggerHaptic('medium');
    downloadReceiptImage(
      (fileName) => showToast(`Comprovante baixado: ${fileName}`, 'success'),
      (err) => showToast(err, 'error')
    );
  });

  document.getElementById('btn-share-receipt')?.addEventListener('click', () => {
    triggerHaptic('light');
    shareReceiptSummary(receiptPeriodFilter);
  });
}

function setupModals() {
  document.getElementById('btn-cancel-delete')?.addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
    if (pendingDeleteId) {
      deleteRoute(pendingDeleteId);
      showToast('Rota excluída.', 'info');
      closeDeleteModal();
      updateAllViews();
    }
  });

  // Controles do Visualizador de Fotos (Lightbox)
  document.getElementById('btn-close-photo-viewer')?.addEventListener('click', closePhotoViewer);
  document.getElementById('btn-prev-photo')?.addEventListener('click', () => {
    if (viewerPhotos.length > 1) {
      viewerCurrentIndex = (viewerCurrentIndex - 1 + viewerPhotos.length) % viewerPhotos.length;
      updatePhotoViewerSlide();
    }
  });
  document.getElementById('btn-next-photo')?.addEventListener('click', () => {
    if (viewerPhotos.length > 1) {
      viewerCurrentIndex = (viewerCurrentIndex + 1) % viewerPhotos.length;
      updatePhotoViewerSlide();
    }
  });
  document.getElementById('modal-photo-viewer')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-photo-viewer') {
      closePhotoViewer();
    }
  });

  // Controles do Visualizador de Observação
  document.getElementById('btn-close-notes-viewer')?.addEventListener('click', closeNotesViewer);
  document.getElementById('btn-ok-notes-viewer')?.addEventListener('click', closeNotesViewer);
  document.getElementById('btn-edit-from-notes')?.addEventListener('click', () => {
    const idToEdit = activeNotesRouteId;
    closeNotesViewer();
    if (idToEdit) {
      loadRouteForEdit(idToEdit);
    }
  });
  document.getElementById('modal-notes-viewer')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-notes-viewer') {
      closeNotesViewer();
    }
  });
}

function setupSettingsAndBackups() {
  const inputBaseRate = document.getElementById('setting-base-rate');
  const inputSundayRate = document.getElementById('setting-sunday-rate');
  const btnSaveRates = document.getElementById('btn-save-rates');

  const populateRates = () => {
    const s = getSettings();
    if (inputBaseRate) inputBaseRate.value = s.basePackageRate.toFixed(2);
    if (inputSundayRate) inputSundayRate.value = s.sundayPackageRate.toFixed(2);
  };

  populateRates();

  document.getElementById('btn-open-settings')?.addEventListener('click', populateRates);
  document.getElementById('btn-open-settings-desktop')?.addEventListener('click', populateRates);

  if (btnSaveRates) {
    btnSaveRates.addEventListener('click', () => {
      const baseVal = parseFloat(inputBaseRate?.value);
      const sunVal = parseFloat(inputSundayRate?.value);

      if (isNaN(baseVal) || baseVal <= 0 || isNaN(sunVal) || sunVal <= 0) {
        showToast('Informe valores válidos maiores que zero.', 'error');
        return;
      }

      saveSettings({
        basePackageRate: baseVal,
        sundayPackageRate: sunVal
      });

      triggerHaptic('success');
      showToast('Regras salvas! Válidas a partir do próximo lançamento.', 'success');
      updateSundayBadge(document.getElementById('switch-sunday-rate')?.checked || false);
      updateLivePreview();
    });
  }

  // Controles de Conexão e Sincronização Supabase
  const inputSupabaseUrl = document.getElementById('setting-supabase-url');
  const btnSaveSupabase = document.getElementById('btn-save-supabase');
  const btnSyncSupabase = document.getElementById('btn-sync-supabase');
  const statusBadge = document.getElementById('supabase-status-badge');

  const updateSupabaseStatusUI = async () => {
    const config = getSupabaseConfig();
    if (inputSupabaseUrl && !inputSupabaseUrl.value) {
      inputSupabaseUrl.value = config.url || '';
    }

    if (!config.url) {
      if (statusBadge) {
        statusBadge.textContent = '⚪ Aguardando URL';
        statusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-600';
      }
      return;
    }

    if (statusBadge) {
      statusBadge.textContent = '🟡 Testando...';
      statusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700';
    }

    const test = await testSupabaseConnection();
    if (test.success) {
      if (statusBadge) {
        statusBadge.textContent = '🟢 Conectado';
        statusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700';
      }
    } else {
      if (statusBadge) {
        statusBadge.textContent = '🔴 Erro Conexão';
        statusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700';
      }
    }
  };

  updateSupabaseStatusUI();
  document.getElementById('btn-open-settings')?.addEventListener('click', updateSupabaseStatusUI);
  document.getElementById('btn-open-settings-desktop')?.addEventListener('click', updateSupabaseStatusUI);

  if (btnSaveSupabase) {
    btnSaveSupabase.addEventListener('click', async () => {
      const url = inputSupabaseUrl?.value?.trim() || '';
      if (!url || !url.startsWith('http')) {
        showToast('Informe uma URL válida do Supabase (ex: https://...supabase.co)', 'error');
        return;
      }

      setSupabaseConfig({ url });
      triggerHaptic('medium');
      showToast('Conectando ao Supabase...', 'info');
      await updateSupabaseStatusUI();

      const test = await testSupabaseConnection();
      if (test.success) {
        showToast('Supabase conectado com sucesso!', 'success');
        const syncRes = await syncWithSupabase();
        if (syncRes.success) {
          updateAllViews();
        }
      } else {
        showToast(`Erro ao conectar: ${test.message}`, 'error');
      }
    });
  }

  if (btnSyncSupabase) {
    btnSyncSupabase.addEventListener('click', async () => {
      if (!isSupabaseConfigured()) {
        showToast('Configure a URL do Supabase antes de sincronizar.', 'error');
        return;
      }

      triggerHaptic('medium');
      showToast('Sincronizando com a nuvem...', 'info');

      const res = await syncWithSupabase();
      if (res.success) {
        triggerHaptic('success');
        showToast(res.message, 'success');
        updateAllViews();
        await updateSupabaseStatusUI();
      } else {
        showToast(`Falha na sincronização: ${res.message}`, 'error');
      }
    });
  }

  const btnExport = document.getElementById('btn-export-backup');
  const btnImport = document.getElementById('btn-import-backup');
  const fileImportInput = document.getElementById('file-import-input');
  const btnResetData = document.getElementById('btn-reset-sample-data');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const json = exportDataAsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StopKm_Backup_${getLocalIsoDate()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup JSON exportado!', 'success');
    });
  }

  if (btnImport && fileImportInput) {
    btnImport.addEventListener('click', () => fileImportInput.click());
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = importDataFromJSON(event.target.result);
        if (res.success) {
          showToast(`${res.count} rotas importadas!`, 'success');
          updateAllViews();
        } else {
          showToast(`Erro na importação: ${res.error}`, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Deseja carregar dados de demonstração realistas?')) {
        clearAllRoutes();
        loadSampleDataIfEmpty(true);
        showToast('Dados de demonstração carregados!', 'success');
        updateAllViews();
      }
    });
  }
}

export function updateHeroCards() {
  // 1. Lucro e Faturamento da Semana (Card da Esquerda)
  const routesWeek = filterRoutes('this_week');
  const metricsWeek = getAggregatedMetrics(routesWeek);
  const elWeekProfit = document.getElementById('hero-week-profit') || document.getElementById('hero-net-profit');
  const elWeekGross = document.getElementById('hero-week-gross') || document.getElementById('hero-gross-sub');
  if (elWeekProfit) elWeekProfit.textContent = formatCurrency(metricsWeek.totalNetProfit);
  if (elWeekGross) elWeekGross.textContent = `Fat: ${formatCurrency(metricsWeek.totalGross)}`;

  // 2. Lucro e Faturamento do Mês (Card da Direita)
  const routesMonth = filterRoutes('this_month');
  const metricsMonth = getAggregatedMetrics(routesMonth);
  const elMonthProfit = document.getElementById('hero-month-profit');
  const elMonthGross = document.getElementById('hero-month-gross');
  if (elMonthProfit) elMonthProfit.textContent = formatCurrency(metricsMonth.totalNetProfit);
  if (elMonthGross) elMonthGross.textContent = `Fat: ${formatCurrency(metricsMonth.totalGross)}`;
}

export function updateAllViews() {
  if (activeTab === 'tab-dashboard') renderDashboard();
  if (activeTab === 'tab-history') renderHistory();
  if (activeTab === 'tab-reports') renderReceiptCard(receiptPeriodFilter);
  
  updateHeroCards();
}

/**
 * Configuração e gerenciamento da Tela de Login e Autenticação (Supabase Auth)
 */
function setupAuthUI() {
  const authScreen = document.getElementById('auth-screen');
  if (!authScreen) return;

  const tabLogin = document.getElementById('tab-auth-login');
  const tabSignup = document.getElementById('tab-auth-signup');
  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const passwordHint = document.getElementById('auth-password-hint');
  const togglePasswordBtn = document.getElementById('btn-toggle-password');
  const submitBtn = document.getElementById('btn-auth-submit');
  const submitText = document.getElementById('btn-auth-text');
  const submitSpinner = document.getElementById('btn-auth-spinner');
  const feedbackBox = document.getElementById('auth-feedback');
  const feedbackIcon = document.getElementById('auth-feedback-icon');
  const feedbackText = document.getElementById('auth-feedback-text');
  const subtitle = document.getElementById('auth-subtitle');
  const logoutBtn = document.getElementById('btn-logout');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userAvatarInitials = document.getElementById('user-avatar-initials');
  const userStatusBadge = document.getElementById('user-status-badge');

  let currentMode = 'login'; // 'login' | 'signup'

  function showFeedback(msg, type = 'error') {
    if (!feedbackBox) return;
    feedbackBox.className = 'mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ' +
      (type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200');
    if (feedbackIcon) feedbackIcon.textContent = type === 'error' ? '⚠️' : '✅';
    if (feedbackText) feedbackText.textContent = msg;
    feedbackBox.classList.remove('hidden');
  }

  function hideFeedback() {
    if (feedbackBox) feedbackBox.classList.add('hidden');
  }

  function setAuthMode(mode) {
    currentMode = mode;
    hideFeedback();
    triggerHaptic('light');

    if (mode === 'login') {
      tabLogin?.classList.add('text-[#0F2942]', 'bg-white', 'shadow-sm');
      tabLogin?.classList.remove('text-slate-400');
      tabSignup?.classList.remove('text-[#0F2942]', 'bg-white', 'shadow-sm');
      tabSignup?.classList.add('text-slate-400');
      if (subtitle) subtitle.textContent = 'Acesse sua conta para gerenciar suas rotas';
      if (submitText) submitText.textContent = 'Entrar no StopKm';
      if (passwordHint) passwordHint.classList.add('hidden');
      if (passwordInput) passwordInput.autocomplete = 'current-password';
    } else {
      tabSignup?.classList.add('text-[#0F2942]', 'bg-white', 'shadow-sm');
      tabSignup?.classList.remove('text-slate-400');
      tabLogin?.classList.remove('text-[#0F2942]', 'bg-white', 'shadow-sm');
      tabLogin?.classList.add('text-slate-400');
      if (subtitle) subtitle.textContent = 'Crie sua conta para salvar suas rotas na nuvem';
      if (submitText) submitText.textContent = 'Criar Conta e Entrar';
      if (passwordHint) passwordHint.classList.remove('hidden');
      if (passwordInput) passwordInput.autocomplete = 'new-password';
    }
  }

  tabLogin?.addEventListener('click', () => setAuthMode('login'));
  tabSignup?.addEventListener('click', () => setAuthMode('signup'));

  // Toggle mostrar/ocultar senha
  togglePasswordBtn?.addEventListener('click', () => {
    if (!passwordInput) return;
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    const eyeSvg = togglePasswordBtn.querySelector('svg');
    if (eyeSvg) {
      eyeSvg.innerHTML = isPassword
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
    }
  });

  // Atualizar visual do usuário logado na UI
  function updateUserState(user) {
    if (user && user.email) {
      setCurrentUserId(user.id);
      if (userEmailDisplay) userEmailDisplay.textContent = user.email;
      if (userAvatarInitials) {
        userAvatarInitials.textContent = user.email.charAt(0).toUpperCase();
      }
      if (userStatusBadge) {
        userStatusBadge.textContent = 'Conectado';
        userStatusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700';
      }
      authScreen.classList.add('hidden');
      updateAllViews();
    } else {
      setCurrentUserId(null);
      if (userEmailDisplay) userEmailDisplay.textContent = 'Desconectado';
      if (userAvatarInitials) userAvatarInitials.textContent = '?';
      if (userStatusBadge) {
        userStatusBadge.textContent = 'Não conectado';
        userStatusBadge.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500';
      }
      authScreen.classList.remove('hidden');
      updateAllViews();
    }
  }

  // Verificação inicial de sessão
  getCurrentSession().then((session) => {
    if (session && session.user) {
      updateUserState(session.user);
    } else {
      updateUserState(null);
    }
  }).catch(() => {
    updateUserState(null);
  });

  // Listener para mudanças no estado de autenticação
  onAuthStateChange((event, session) => {
    if (session && session.user) {
      updateUserState(session.user);
    } else if (event === 'SIGNED_OUT') {
      updateUserState(null);
    }
  });

  // Envio do formulário de autenticação
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const email = (emailInput?.value || '').trim();
    const password = passwordInput?.value || '';

    if (!email || !password) {
      showFeedback('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    if (password.length < 6) {
      showFeedback('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    // Estado de carregamento
    if (submitBtn) submitBtn.disabled = true;
    if (submitSpinner) submitSpinner.classList.remove('hidden');
    if (submitText) submitText.textContent = currentMode === 'login' ? 'Entrando...' : 'Criando conta...';

    try {
      if (currentMode === 'login') {
        const res = await signInWithEmail(email, password);
        if (!res.success) {
          showFeedback(res.error || 'Falha ao autenticar.');
        } else {
          triggerHaptic('medium');
          triggerConfetti();
          showToast(`Bem-vindo, ${res.user.email}!`, 'success');
          updateUserState(res.user);
          syncWithSupabase().then(() => updateAllViews()).catch(() => {});
        }
      } else {
        const res = await signUpWithEmail(email, password);
        if (!res.success) {
          showFeedback(res.error || 'Falha ao criar conta.');
        } else {
          triggerHaptic('medium');
          triggerConfetti();
          if (res.isConfirmed || res.session) {
            showToast('Conta criada com sucesso! Bem-vindo!', 'success');
            updateUserState(res.user);
            syncWithSupabase().then(() => updateAllViews()).catch(() => {});
          } else {
            showFeedback('Conta criada com sucesso! Você já pode entrar com seu e-mail e senha.', 'success');
            setAuthMode('login');
          }
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Erro inesperado.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitSpinner) submitSpinner.classList.add('hidden');
      if (submitText) submitText.textContent = currentMode === 'login' ? 'Entrar no StopKm' : 'Criar Conta e Entrar';
    }
  });

  // Botão Sair da Conta (Logout)
  logoutBtn?.addEventListener('click', async () => {
    triggerHaptic('medium');
    const confirmed = confirm('Deseja realmente sair da sua conta StopKm?');
    if (!confirmed) return;

    const res = await signOutUser();
    if (res.success) {
      showToast('Sessão encerrada com sucesso.', 'info');
      updateUserState(null);
      // Fecha o modal de configurações
      document.getElementById('modal-settings')?.classList.add('hidden');
      document.getElementById('modal-settings')?.classList.remove('flex');
    } else {
      showToast('Erro ao sair: ' + res.error, 'error');
    }
  });
}
