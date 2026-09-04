/**
 * StopKm - Módulo de Integração com Supabase (Banco de Dados em Nuvem)
 * Suporte a persistência remota, histórico ilimitado e sincronização local-first.
 */

export const DEFAULT_SUPABASE_URL = 'https://eugkvjulxnyvywxhmchv.supabase.co';
export const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_WSmgvbj4N7q_EBEb054IIA_DSYE6bRj';

const STORAGE_SUPABASE_URL = 'STOPKM_SUPABASE_URL';
const STORAGE_SUPABASE_KEY = 'STOPKM_SUPABASE_KEY';

let clientInstance = null;

/**
 * Normaliza e limpa a URL do Supabase, removendo sufixos como /rest/v1 ou barras extras.
 */
export function sanitizeSupabaseUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

/**
 * Obtém a configuração salva do Supabase.
 */
export function getSupabaseConfig() {
  const savedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL) : '';
  const url = sanitizeSupabaseUrl(savedUrl || DEFAULT_SUPABASE_URL);
  return {
    url,
    publishableKey: (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_KEY) : '') || DEFAULT_PUBLISHABLE_KEY
  };
}

/**
 * Salva as configurações de conexão do Supabase.
 */
export function setSupabaseConfig({ url, publishableKey }) {
  if (typeof localStorage === 'undefined') return;
  if (url !== undefined) {
    const cleanUrl = sanitizeSupabaseUrl(url);
    localStorage.setItem(STORAGE_SUPABASE_URL, cleanUrl);
  }
  if (publishableKey !== undefined) {
    localStorage.setItem(STORAGE_SUPABASE_KEY, (publishableKey || '').trim());
  }
  clientInstance = null;
}

/**
 * Verifica se a URL do Supabase está configurada.
 */
export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.url.startsWith('http'));
}

/**
 * Retorna ou cria a instância do cliente Supabase.
 */
export function getSupabaseClient() {
  if (clientInstance) return clientInstance;

  const config = getSupabaseConfig();
  if (!config.url || !config.url.startsWith('http')) {
    return null;
  }

  const createClientFn = typeof window !== 'undefined' && window.supabase ? window.supabase.createClient : null;
  if (!createClientFn) {
    return null;
  }

  try {
    clientInstance = createClientFn(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return clientInstance;
  } catch (err) {
    console.error('Erro ao instanciar Supabase Client:', err);
    return null;
  }
}

/**
 * Mapeia um objeto de rota do formato interno JS (camelCase) para colunas do Postgres (snake_case).
 */
export function routeToDbRow(route) {
  return {
    id: route.id,
    date: route.date,
    start_time: route.startTime || null,
    end_time: route.endTime || null,
    duration_formatted: route.durationFormatted || null,
    duration_hours: typeof route.durationHours === 'number' ? route.durationHours : 0,
    start_km: typeof route.startKm === 'number' ? route.startKm : 0,
    end_km: typeof route.endKm === 'number' ? route.endKm : 0,
    total_km: typeof route.totalKm === 'number' ? route.totalKm : 0,
    stops: typeof route.stops === 'number' ? route.stops : 0,
    packages: typeof route.packages === 'number' ? route.packages : 0,
    fuel_cost: typeof route.fuelCost === 'number' ? route.fuelCost : 0,
    is_sunday_rate: Boolean(route.isSundayRate),
    rate_per_package: typeof route.ratePerPackage === 'number' ? route.ratePerPackage : 2.50,
    base_rate: typeof route.baseRate === 'number' ? route.baseRate : 2.50,
    sunday_rate: typeof route.sundayRate === 'number' ? route.sundayRate : 4.00,
    gross_earnings: typeof route.grossEarnings === 'number' ? route.grossEarnings : 0,
    net_profit: typeof route.netProfit === 'number' ? route.netProfit : 0,
    fuel_cost_per_km: typeof route.fuelCostPerKm === 'number' ? route.fuelCostPerKm : 0,
    efficiency_per_km: typeof route.efficiencyPerKm === 'number' ? route.efficiencyPerKm : 0,
    density_per_stop: typeof route.densityPerStop === 'number' ? route.densityPerStop : 0,
    hourly_gross: typeof route.hourlyGross === 'number' ? route.hourlyGross : 0,
    hourly_net: typeof route.hourlyNet === 'number' ? route.hourlyNet : 0,
    created_at: route.createdAt || new Date().toISOString(),
    updated_at: route.updatedAt || new Date().toISOString()
  };
}

/**
 * Mapeia uma linha do Postgres (snake_case) para o objeto de rota interno JS (camelCase).
 */
export function dbRowToRoute(row) {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time || '08:00',
    endTime: row.end_time || '17:00',
    durationFormatted: row.duration_formatted || '00h 00m',
    durationHours: Number(row.duration_hours) || 0,
    startKm: Number(row.start_km) || 0,
    endKm: Number(row.end_km) || 0,
    totalKm: Number(row.total_km) || 0,
    stops: Number(row.stops) || 0,
    packages: Number(row.packages) || 0,
    fuelCost: Number(row.fuel_cost) || 0,
    isSundayRate: Boolean(row.is_sunday_rate),
    ratePerPackage: Number(row.rate_per_package) || 2.50,
    baseRate: Number(row.base_rate) || 2.50,
    sundayRate: Number(row.sunday_rate) || 4.00,
    grossEarnings: Number(row.gross_earnings) || 0,
    netProfit: Number(row.net_profit) || 0,
    fuelCostPerKm: Number(row.fuel_cost_per_km) || 0,
    efficiencyPerKm: Number(row.efficiency_per_km) || 0,
    densityPerStop: Number(row.density_per_stop) || 0,
    hourlyGross: Number(row.hourly_gross) || 0,
    hourlyNet: Number(row.hourly_net) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

/**
 * Testa a conexão com o Supabase.
 */
export async function testSupabaseConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL do Supabase não configurada ou inválida.' };
  }

  try {
    const { data, error } = await client.from('settings').select('*').limit(1);
    if (error) throw error;
    return { success: true, message: 'Conectado com sucesso ao Supabase!' };
  } catch (err) {
    console.warn('Falha no teste de conexão Supabase:', err);
    return { success: false, message: err.message || 'Não foi possível conectar ao banco.' };
  }
}

/**
 * Busca todas as rotas salvas no Supabase.
 */
export async function fetchRoutesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('routes')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!Array.isArray(data)) return [];

    return data.map(dbRowToRoute);
  } catch (err) {
    console.error('Erro ao buscar rotas do Supabase:', err);
    return null;
  }
}

/**
 * Insere ou atualiza uma rota no Supabase (upsert).
 */
export async function upsertRouteToSupabase(route) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = routeToDbRow(route);
    const { error } = await client
      .from('routes')
      .upsert(row, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Erro ao salvar rota ${route.id} no Supabase:`, err);
    return false;
  }
}

/**
 * Remove uma rota no Supabase pelo ID.
 */
export async function deleteRouteFromSupabase(id) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Erro ao excluir rota ${id} no Supabase:`, err);
    return false;
  }
}

/**
 * Busca configurações de taxas salvas no Supabase.
 */
export async function fetchSettingsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('settings')
      .select('*')
      .eq('id', 'app_settings')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      basePackageRate: Number(data.base_package_rate) || 2.50,
      sundayPackageRate: Number(data.sunday_package_rate) || 4.00
    };
  } catch (err) {
    console.error('Erro ao buscar configurações no Supabase:', err);
    return null;
  }
}

/**
 * Salva as configurações de taxas no Supabase.
 */
export async function saveSettingsToSupabase(settings) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('settings')
      .upsert({
        id: 'app_settings',
        base_package_rate: settings.basePackageRate,
        sunday_package_rate: settings.sundayPackageRate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao salvar configurações no Supabase:', err);
    return false;
  }
}

/**
 * Envia todas as rotas locais existentes para o Supabase em lote (Sync completo).
 */
export async function syncAllLocalToSupabase(localRoutes) {
  const client = getSupabaseClient();
  if (!client) return { success: false, count: 0, error: 'Supabase não configurado.' };
  if (!Array.isArray(localRoutes) || localRoutes.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const rows = localRoutes.map(routeToDbRow);
    const { error } = await client
      .from('routes')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
    return { success: true, count: rows.length };
  } catch (err) {
    console.error('Erro ao sincronizar todas as rotas no Supabase:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
}

/**
 * Realiza login com e-mail e senha no Supabase Auth.
 */
export async function signInWithEmail(email, password) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cliente Supabase não inicializado.' };

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'E-mail ou senha incorretos.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'E-mail aguardando confirmação. Caso queira login direto, desative "Confirm email" no painel do Supabase.';
      }
      return { success: false, error: friendlyMessage };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
  }
}

/**
 * Cria uma nova conta com e-mail e senha no Supabase Auth.
 */
export async function signUpWithEmail(email, password) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cliente Supabase não inicializado.' };

  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password: password
    });

    if (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('User already registered')) {
        friendlyMessage = 'Este e-mail já está cadastrado. Tente fazer login.';
      } else if (error.message.includes('Password should be at least')) {
        friendlyMessage = 'A senha deve ter no mínimo 6 caracteres.';
      }
      return { success: false, error: friendlyMessage };
    }

    // Se o Supabase tiver confirmação de e-mail desativada, data.session já vem preenchido
    const isConfirmed = Boolean(data.session);

    return {
      success: true,
      user: data.user,
      session: data.session,
      isConfirmed
    };
  } catch (err) {
    return { success: false, error: err.message || 'Erro inesperado ao criar conta.' };
  }
}

/**
 * Encerra a sessão do usuário no Supabase.
 */
export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Erro ao deslogar:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Retorna o usuário logado atualmente (ou null).
 */
export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Retorna a sessão ativa atual.
 */
export async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Escuta mudanças no estado de autenticação (SIGNED_IN, SIGNED_OUT, etc.).
 */
export function onAuthStateChange(callback) {
  const client = getSupabaseClient();
  if (!client) return { unsubscribe: () => {} };

  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
}
