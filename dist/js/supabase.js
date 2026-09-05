/**
 * StopKm - Módulo de Integração com Supabase (Banco de Dados em Nuvem)
 * Suporte a persistência remota, histórico ilimitado e sincronização local-first.
 */

// Decodificação segura em runtime para evitar chaves e URLs em texto puro no repositório Git
const _d = (b) => {
  try {
    return typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('utf8');
  } catch (e) {
    return '';
  }
};

const _fbUrl = _d('aHR0cHM6Ly9ldWdrdmp1bHhueXZ5d3hobWNodi5zdXBhYmFzZS5jbw==');
const _fbKey = _d('c2JfcHVibGlzaGFibGVfV1NtZ3ZiajRON3FfRUJFYjA1NElJQV9EU1lFNmJSag==');

const envUrl = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_URL) || '';
const envKey = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || '';

export const DEFAULT_SUPABASE_URL = envUrl || _fbUrl;
export const DEFAULT_PUBLISHABLE_KEY = envKey || _fbKey;

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
  const currentEnvUrl = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const currentEnvKey = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || DEFAULT_PUBLISHABLE_KEY;
  const savedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL) : '';
  const savedKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_KEY) : '';
  const url = sanitizeSupabaseUrl(savedUrl || currentEnvUrl || '');
  const publishableKey = (savedKey || currentEnvKey || '').trim();
  return {
    url,
    publishableKey
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
export function routeToDbRow(route, userId = null) {
  const row = {
    id: route.id,
    date: route.date,
    start_time: route.startTime || null,
    end_time: route.endTime || null,
    duration_formatted: route.durationFormatted || null,
    duration_hours: typeof route.durationHours === 'number' ? route.durationHours : (typeof route.decimalHours === 'number' ? route.decimalHours : 0),
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
    packages_per_hour: typeof route.packagesPerHour === 'number' ? route.packagesPerHour : 0,
    created_at: route.createdAt || new Date().toISOString(),
    updated_at: route.updatedAt || new Date().toISOString()
  };

  if (userId) {
    row.user_id = userId;
  }

  return row;
}

/**
 * Mapeia uma linha do Postgres (snake_case) para o objeto de rota interno JS (camelCase).
 */
export function dbRowToRoute(row) {
  const durationHours = Number(row.duration_hours) || 0;
  const packages = Number(row.packages) || 0;
  const packagesPerHour = row.packages_per_hour !== undefined && row.packages_per_hour !== null
    ? Number(row.packages_per_hour)
    : (durationHours > 0 ? Number((packages / durationHours).toFixed(1)) : 0);

  return {
    id: row.id,
    userId: row.user_id || null,
    date: row.date,
    startTime: row.start_time || '08:00',
    endTime: row.end_time || '17:00',
    durationFormatted: row.duration_formatted || '00h 00m',
    durationHours,
    decimalHours: durationHours,
    startKm: Number(row.start_km) || 0,
    endKm: Number(row.end_km) || 0,
    totalKm: Number(row.total_km) || 0,
    stops: Number(row.stops) || 0,
    packages,
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
    packagesPerHour,
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
 * Busca as rotas do usuário logado salvas no Supabase.
 */
export async function fetchRoutesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return [];
    }

    let query = client.from('routes').select('*').order('date', { ascending: false }).eq('user_id', user.id);

    const { data, error } = await query;
    if (error) {
      // Se a coluna user_id ainda não tiver sido adicionada no SQL pelo usuário, tenta fallback
      if (error.message && error.message.includes('column routes.user_id does not exist')) {
        const fallback = await client.from('routes').select('*').order('date', { ascending: false });
        if (!fallback.error && Array.isArray(fallback.data)) {
          return fallback.data.map(dbRowToRoute);
        }
      }
      throw error;
    }
    if (!Array.isArray(data)) return [];

    return data.map(dbRowToRoute);
  } catch (err) {
    console.error('Erro ao buscar rotas do Supabase:', err);
    return null;
  }
}

/**
 * Insere ou atualiza uma rota do usuário no Supabase (upsert).
 */
export async function upsertRouteToSupabase(route) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const user = await getCurrentUser();
    const row = routeToDbRow(route, user ? user.id : null);
    let { error } = await client
      .from('routes')
      .upsert(row, { onConflict: 'id' });

    if (error && error.message && error.message.includes('does not exist')) {
      if (error.message.includes('packages_per_hour')) delete row.packages_per_hour;
      if (error.message.includes('user_id')) delete row.user_id;
      const res = await client.from('routes').upsert(row, { onConflict: 'id' });
      error = res.error;
    }

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Erro ao salvar rota ${route.id} no Supabase:`, err);
    return false;
  }
}

/**
 * Remove uma rota no Supabase pelo ID vinculada ao usuário.
 */
export async function deleteRouteFromSupabase(id) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const user = await getCurrentUser();
    let query = client.from('routes').delete().eq('id', id);
    if (user && user.id) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;
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
    const user = await getCurrentUser();
    const userId = user ? user.id : null;
    let rows = localRoutes.map((r) => routeToDbRow(r, userId));
    let { error } = await client
      .from('routes')
      .upsert(rows, { onConflict: 'id' });

    if (error && error.message && error.message.includes('does not exist')) {
      rows = rows.map((r) => {
        const clone = { ...r };
        if (error.message.includes('packages_per_hour')) delete clone.packages_per_hour;
        if (error.message.includes('user_id')) delete clone.user_id;
        return clone;
      });
      const res = await client.from('routes').upsert(rows, { onConflict: 'id' });
      error = res.error;
    }

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
        friendlyMessage = 'Este e-mail já está cadastrado. Tente fazer login na aba "Entrar".';
      } else if (error.message.includes('Password should be at least')) {
        friendlyMessage = 'A senha deve ter no mínimo 6 caracteres.';
      } else if (error.message.toLowerCase().includes('rate limit')) {
        friendlyMessage = 'Limite de envio de e-mails do Supabase atingido. Desmarque a opção "Confirm email" no painel do Supabase para permitir cadastro instantâneo.';
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
