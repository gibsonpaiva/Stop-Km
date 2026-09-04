/**
 * StopKm - Store Reativo e Persistência LocalStorage
 * Gestão de estado, ordenação cronológica e recálculos reativos
 */

import { calculateRouteMetrics, isSunday } from './calculations.js';
import {
  isSupabaseConfigured,
  fetchRoutesFromSupabase,
  upsertRouteToSupabase,
  deleteRouteFromSupabase,
  fetchSettingsFromSupabase,
  saveSettingsToSupabase,
  syncAllLocalToSupabase
} from './supabase.js';

let currentUserId = null;

/**
 * Define o ID do usuário atualmente autenticado para isolar os dados locais e remotos.
 * @param {string|null} userId 
 */
export function setCurrentUserId(userId) {
  currentUserId = userId || null;
  notifyListeners();
}

/**
 * Retorna o ID do usuário autenticado ativo na store.
 */
export function getCurrentUserId() {
  return currentUserId;
}

function getStorageKey() {
  return currentUserId ? `STOPKM_ROUTES_${currentUserId}` : 'STOPKM_ROUTES_V2';
}

function getSettingsKey() {
  return currentUserId ? `STOPKM_SETTINGS_${currentUserId}` : 'STOPKM_SETTINGS_V2';
}

const listeners = new Set();

/**
 * Emite evento de atualização para todos os inscritos.
 */
function notifyListeners() {
  const routes = getRoutes();
  listeners.forEach((callback) => {
    try {
      callback(routes);
    } catch (e) {
      console.error('Erro no listener da store:', e);
    }
  });
}

/**
 * Inscreve um componente para receber atualizações reativas de dados.
 * @param {Function} callback 
 * @returns {Function} Função para cancelar a inscrição
 */
export function subscribe(callback) {
  listeners.add(callback);
  // Executa imediatamente com o estado atual
  callback(getRoutes());
  return () => listeners.delete(callback);
}

/**
 * Obtém todas as rotas salvas ordenadas cronologicamente de forma decrescente (mais recentes primeiro).
 * @returns {Array<Object>}
 */
export function getRoutes() {
  try {
    // Se o usuário não estiver autenticado, não expõe dados em tela
    if (!currentUserId) return [];

    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Ordenação estrita: Data decrescente (YYYY-MM-DD), depois Horário de Saída
    return list.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.startTime || '').localeCompare(a.startTime || '');
    });
  } catch (err) {
    console.error('Erro ao ler LocalStorage:', err);
    return [];
  }
}

/**
 * Salva a lista de rotas no LocalStorage vinculada ao usuário logado.
 * @param {Array<Object>} routes 
 */
function saveRoutes(routes) {
  if (!currentUserId) return;
  localStorage.setItem(getStorageKey(), JSON.stringify(routes));
  notifyListeners();
}

/**
 * Obtém as configurações de remuneração vigentes salvas.
 * @returns {{ basePackageRate: number, sundayPackageRate: number }}
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(getSettingsKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        basePackageRate: typeof parsed.basePackageRate === 'number' && parsed.basePackageRate > 0 ? parsed.basePackageRate : 2.50,
        sundayPackageRate: typeof parsed.sundayPackageRate === 'number' && parsed.sundayPackageRate > 0 ? parsed.sundayPackageRate : 4.00
      };
    }
  } catch (e) {
    console.error('Erro ao ler configurações de taxas:', e);
  }
  return {
    basePackageRate: 2.50,
    sundayPackageRate: 4.00
  };
}

/**
 * Salva as configurações de remuneração.
 * @param {Object} newSettings 
 * @returns {Object}
 */
export function saveSettings(newSettings) {
  const current = getSettings();
  const updated = {
    basePackageRate: typeof newSettings.basePackageRate === 'number' && newSettings.basePackageRate > 0 ? newSettings.basePackageRate : current.basePackageRate,
    sundayPackageRate: typeof newSettings.sundayPackageRate === 'number' && newSettings.sundayPackageRate > 0 ? newSettings.sundayPackageRate : current.sundayPackageRate
  };
  localStorage.setItem(getSettingsKey(), JSON.stringify(updated));
  notifyListeners();

  if (isSupabaseConfigured()) {
    saveSettingsToSupabase(updated).catch((err) => console.error('Erro sync Supabase saveSettings:', err));
  }

  return updated;
}

/**
 * Adiciona uma nova rota calculando todas as métricas automaticamente com as taxas vigentes.
 * @param {Object} rawData 
 * @returns {Object} Rota criada com métricas
 */
export function addRoute(rawData) {
  const routes = getRoutes();
  const settings = getSettings();
  
  // Detecção automática de domingo se não informado explicitamente
  const isSundayDate = isSunday(rawData.date);
  const isSundayRate = rawData.isSundayRate !== undefined ? Boolean(rawData.isSundayRate) : isSundayDate;

  const baseRate = settings.basePackageRate;
  const sundayRate = settings.sundayPackageRate;

  const metrics = calculateRouteMetrics({
    ...rawData,
    isSundayRate,
    baseRate,
    sundayRate
  });

  const newRoute = {
    id: 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    createdAt: new Date().toISOString(),
    baseRate,
    sundayRate,
    ...metrics
  };

  routes.push(newRoute);
  saveRoutes(routes);

  if (isSupabaseConfigured()) {
    upsertRouteToSupabase(newRoute).catch((err) => console.error('Erro sync Supabase addRoute:', err));
  }

  return newRoute;
}

/**
 * Atualiza uma rota existente pelo ID preservando as taxas históricas da época.
 * @param {string} id 
 * @param {Object} updatedData 
 * @returns {Object|null}
 */
export function updateRoute(id, updatedData) {
  const routes = getRoutes();
  const index = routes.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const existing = routes[index];
  const isSundayDate = isSunday(updatedData.date);
  const isSundayRate = updatedData.isSundayRate !== undefined ? Boolean(updatedData.isSundayRate) : isSundayDate;

  // Preserva estritamente as taxas originais da rota para não alterar retroativos!
  const baseRate = typeof existing.baseRate === 'number' ? existing.baseRate : (existing.ratePerPackage || 2.50);
  const sundayRate = typeof existing.sundayRate === 'number' ? existing.sundayRate : 4.00;

  const metrics = calculateRouteMetrics({
    ...updatedData,
    isSundayRate,
    baseRate,
    sundayRate
  });

  const updated = {
    ...existing,
    ...metrics,
    baseRate,
    sundayRate,
    updatedAt: new Date().toISOString()
  };

  routes[index] = updated;
  saveRoutes(routes);

  if (isSupabaseConfigured()) {
    upsertRouteToSupabase(updated).catch((err) => console.error('Erro sync Supabase updateRoute:', err));
  }

  return updated;
}

/**
 * Exclui uma rota pelo ID.
 * @param {string} id 
 * @returns {boolean}
 */
export function deleteRoute(id) {
  const routes = getRoutes();
  const filtered = routes.filter((r) => r.id !== id);
  if (filtered.length === routes.length) return false;
  saveRoutes(filtered);

  if (isSupabaseConfigured()) {
    deleteRouteFromSupabase(id).catch((err) => console.error('Erro sync Supabase deleteRoute:', err));
  }

  return true;
}

/**
 * Busca uma rota pelo ID.
 * @param {string} id 
 * @returns {Object|null}
 */
export function getRouteById(id) {
  const routes = getRoutes();
  return routes.find((r) => r.id === id) || null;
}

/**
 * Limpa todos os dados salvos.
 */
export function clearAllRoutes() {
  localStorage.removeItem(getStorageKey());
  notifyListeners();
}

/**
 * Filtra as rotas por períodos pré-definidos ou intervalo customizado.
 * @param {string} period 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_7_days' | 'custom' | 'all'
 * @param {string} [startDate] 'YYYY-MM-DD'
 * @param {string} [endDate] 'YYYY-MM-DD'
 * @returns {Array<Object>}
 */
export function filterRoutes(period = 'this_month', startDate = '', endDate = '') {
  const routes = getRoutes();
  const now = new Date();
  
  // Data atual local YYYY-MM-DD
  const todayStr = getLocalIsoDate(now);

  switch (period) {
    case 'today':
      return routes.filter((r) => r.date === todayStr);

    case 'last_7_days': {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      const past7Str = getLocalIsoDate(past7);
      return routes.filter((r) => r.date >= past7Str && r.date <= todayStr);
    }

    case 'this_week': {
      // Início da semana (Segunda-feira)
      const currentDay = now.getDay();
      const distanceToMonday = (currentDay + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - distanceToMonday);
      const mondayStr = getLocalIsoDate(monday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = getLocalIsoDate(sunday);

      return routes.filter((r) => r.date >= mondayStr && r.date <= sundayStr);
    }

    case 'this_month': {
      const yearMonth = todayStr.substring(0, 7); // 'YYYY-MM'
      return routes.filter((r) => r.date.startsWith(yearMonth));
    }

    case 'last_month': {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYearMonth = getLocalIsoDate(prevMonthDate).substring(0, 7);
      return routes.filter((r) => r.date.startsWith(prevYearMonth));
    }

    case 'custom': {
      if (!startDate && !endDate) return routes;
      return routes.filter((r) => {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      });
    }

    case 'all':
    default:
      return routes;
  }
}

/**
 * Calcula métricas agregadas de uma lista de rotas.
 * @param {Array<Object>} routeList 
 * @returns {Object}
 */
export function getAggregatedMetrics(routeList = []) {
  if (!routeList || routeList.length === 0) {
    return {
      daysWorked: 0,
      totalGross: 0,
      totalFuel: 0,
      totalNetProfit: 0,
      totalKm: 0,
      totalPackages: 0,
      totalStops: 0,
      totalMinutes: 0,
      totalHoursDecimal: 0,
      avgEarningsPerKm: 0,
      avgPackagesPerStop: 0,
      avgMinutesPerDay: 0,
      avgHoursFormatted: '0h 00m',
      avgPackagesPerDay: 0,
      avgGrossPerDay: 0
    };
  }

  const daysWorked = routeList.length;
  let totalGross = 0;
  let totalFuel = 0;
  let totalNetProfit = 0;
  let totalKm = 0;
  let totalPackages = 0;
  let totalStops = 0;
  let totalMinutes = 0;

  for (const r of routeList) {
    totalGross += r.grossEarnings || 0;
    totalFuel += r.fuelCost || 0;
    totalNetProfit += r.netProfit || 0;
    totalKm += r.totalKm || 0;
    totalPackages += r.packages || 0;
    totalStops += r.stops || 0;
    totalMinutes += r.totalMinutes || 0;
  }

  const avgEarningsPerKm = totalKm > 0 ? totalGross / totalKm : 0;
  const avgPackagesPerStop = totalStops > 0 ? totalPackages / totalStops : 0;
  const avgMinutesPerDay = daysWorked > 0 ? Math.round(totalMinutes / daysWorked) : 0;
  const avgPackagesPerDay = daysWorked > 0 ? Number((totalPackages / daysWorked).toFixed(1)) : 0;
  const avgGrossPerDay = daysWorked > 0 ? totalGross / daysWorked : 0;

  const avgHours = Math.floor(avgMinutesPerDay / 60);
  const avgMins = avgMinutesPerDay % 60;
  const avgHoursFormatted = daysWorked > 0 ? `${avgHours}h ${String(avgMins).padStart(2, '0')}m` : '0h 00m';

  return {
    daysWorked,
    totalGross,
    totalFuel,
    totalNetProfit,
    totalKm,
    totalPackages,
    totalStops,
    totalMinutes,
    totalHoursDecimal: Number((totalMinutes / 60).toFixed(1)),
    avgEarningsPerKm,
    avgPackagesPerStop,
    avgMinutesPerDay,
    avgHoursFormatted,
    avgPackagesPerDay,
    avgGrossPerDay
  };
}

/**
 * Retorna a data no formato ISO YYYY-MM-DD no fuso local.
 * @param {Date} date 
 * @returns {string}
 */
export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Exporta os dados como string JSON para backup.
 * @returns {string}
 */
export function exportDataAsJSON() {
  const routes = getRoutes();
  return JSON.stringify({
    app: 'StopKm',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    routes
  }, null, 2);
}

/**
 * Importa dados de um arquivo/string JSON com validação.
 * @param {string} jsonString 
 * @returns {{success: boolean, count: number, error?: string}}
 */
export function importDataFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const routes = Array.isArray(data) ? data : data.routes;
    if (!Array.isArray(routes)) {
      return { success: false, count: 0, error: 'Formato de arquivo inválido.' };
    }

    const validRoutes = [];
    for (const r of routes) {
      if (r.date && r.packages !== undefined) {
        const isSun = isSunday(r.date);
        const metrics = calculateRouteMetrics({
          date: r.date,
          startTime: r.startTime || '08:00',
          endTime: r.endTime || '17:00',
          startKm: r.startKm || 0,
          endKm: r.endKm || 0,
          stops: r.stops || 0,
          packages: r.packages || 0,
          fuelCost: r.fuelCost || 0,
          isSundayRate: r.isSundayRate !== undefined ? r.isSundayRate : isSun
        });
        validRoutes.push({
          id: r.id || 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          createdAt: r.createdAt || new Date().toISOString(),
          ...metrics
        });
      }
    }

    saveRoutes(validRoutes);
    return { success: true, count: validRoutes.length };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Popula com dados de demonstração realistas se o app estiver vazio.
 */
export function seedSampleDataIfEmpty(force = false) {
  // Apenas semeia dados de exemplo se for explicitamente solicitado pelo usuário
  if (!force) return;

  const now = new Date();
  const sampleEntries = [];

  // Gera dados realistas para os últimos 10 dias de trabalho
  for (let i = 10; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = getLocalIsoDate(d);
    const isSun = d.getDay() === 0;

    // Se for domingo, gera rota especial com bônus
    const packages = isSun ? Math.floor(75 + Math.random() * 25) : Math.floor(110 + Math.random() * 45);
    const stops = Math.floor(packages * 0.75 + Math.random() * 10);
    const startKm = 45200 + (10 - i) * 85;
    const kmDriven = Math.floor(65 + Math.random() * 40);
    const endKm = startKm + kmDriven;
    const fuel = (i % 3 === 0) ? Math.floor(50 + Math.random() * 30) : 0;
    
    const startH = 7 + Math.floor(Math.random() * 2);
    const startM = (Math.floor(Math.random() * 4) * 15);
    const durationHours = 6 + Math.floor(Math.random() * 3);
    const endH = startH + durationHours;
    const endM = (Math.floor(Math.random() * 4) * 15);

    const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const metrics = calculateRouteMetrics({
      date: dateStr,
      startTime,
      endTime,
      startKm,
      endKm,
      stops,
      packages,
      fuelCost: fuel,
      isSundayRate: isSun
    });

    sampleEntries.push({
      id: 'route_sample_' + i + '_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...metrics
    });
  }

  saveRoutes(sampleEntries);
}

export const loadSampleDataIfEmpty = seedSampleDataIfEmpty;
export function reloadSampleData() {
  clearAllRoutes();
  seedSampleDataIfEmpty(true);
}

/**
 * Sincroniza dados bidirecionalmente com o Supabase.
 * Baixa rotas existentes na nuvem, une com as locais e envia rotas locais não sincronizadas.
 * @returns {Promise<{ success: boolean, count: number, message: string }>}
 */
export async function syncWithSupabase() {
  if (!isSupabaseConfigured()) {
    return { success: false, count: 0, message: 'URL do Supabase não configurada.' };
  }

  if (!currentUserId) {
    return { success: false, count: 0, message: 'Usuário não autenticado.' };
  }

  try {
    // 1. Sincroniza configurações de taxas
    const remoteSettings = await fetchSettingsFromSupabase();
    if (remoteSettings) {
      const localSettings = getSettings();
      saveSettings({
        basePackageRate: remoteSettings.basePackageRate || localSettings.basePackageRate,
        sundayPackageRate: remoteSettings.sundayPackageRate || localSettings.sundayPackageRate
      });
    }

    // 2. Busca rotas remotas
    const remoteRoutes = await fetchRoutesFromSupabase();
    if (remoteRoutes === null) {
      return { success: false, count: 0, message: 'Erro ao consultar banco de dados Supabase.' };
    }

    const localRoutes = getRoutes();
    const routeMap = new Map();

    // Adiciona rotas locais ao mapa
    localRoutes.forEach((r) => routeMap.set(r.id, r));

    // Mescla rotas remotas
    remoteRoutes.forEach((r) => {
      if (!routeMap.has(r.id)) {
        routeMap.set(r.id, r);
      } else {
        const local = routeMap.get(r.id);
        const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
        if (remoteTime > localTime) {
          routeMap.set(r.id, r);
        }
      }
    });

    const mergedRoutes = Array.from(routeMap.values());
    saveRoutes(mergedRoutes);

    // 3. Envia todas as rotas consolidadas para o Supabase (garante que todas as rotas locais estejam na nuvem)
    const syncRes = await syncAllLocalToSupabase(mergedRoutes);
    if (!syncRes.success) {
      return { success: false, count: mergedRoutes.length, message: syncRes.error || 'Erro no envio em lote ao Supabase.' };
    }

    return {
      success: true,
      count: mergedRoutes.length,
      message: `${mergedRoutes.length} rotas sincronizadas com sucesso!`
    };
  } catch (err) {
    console.error('Erro na sincronização completa com Supabase:', err);
    return {
      success: false,
      count: 0,
      message: err.message || 'Erro inesperado na sincronização.'
    };
  }
}

