/**
 * StopKm - Módulo de Cálculos e Regras de Negócio
 * Regras estritas:
 * 1. Base: R$ 2,50 por pacote entregue (Segunda a Sábado)
 * 2. Domingo: Acréscimo de +60% (R$ 4,00 por pacote) - detecção automática com override manual
 * 3. Km Total: Km Final - Km Inicial
 * 4. Tempo em Rota: Saída -> Término
 * 5. Eficiência: R$/Km = Faturamento / Km Total
 * 6. Densidade: Pacotes / Paradas
 * 7. Lucro Líquido: Faturamento Bruto - Combustível
 */

export const BASE_PACKAGE_RATE = 2.50;
export const SUNDAY_PACKAGE_RATE = 4.00; // 2.50 * 1.6 = 4.00

/**
 * Verifica se a data fornecida (YYYY-MM-DD) é domingo.
 * @param {string} dateString 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isSunday(dateString) {
  if (!dateString) return false;
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

/**
 * Retorna o nome do dia da semana formatado em português.
 * @param {string} dateString 'YYYY-MM-DD'
 * @returns {string} Ex: 'Domingo', 'Segunda-feira', etc.
 */
export function getDayOfWeekName(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  return days[date.getDay()];
}

/**
 * Calcula a diferença em minutos entre dois horários (HH:MM).
 * @param {string} startTime '08:00'
 * @param {string} endTime '17:30'
 * @returns {number} Minutos totais
 */
export function calculateMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;

  // Se o término for menor que o início (virou a meia-noite)
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  return Math.max(0, endTotal - startTotal);
}

/**
 * Formata minutos em string amigável (ex: '6h 30min' ou '45min').
 * @param {number} totalMinutes 
 * @returns {string}
 */
export function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Converte minutos para horas em número decimal com 2 casas.
 * @param {number} totalMinutes 
 * @returns {number}
 */
export function minutesToDecimalHours(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return 0;
  return Number((totalMinutes / 60).toFixed(2));
}

/**
 * Calcula todas as métricas consolidadas de uma rota diária.
 * @param {Object} data 
 * @returns {Object}
 */
export function calculateRouteMetrics(data) {
  const {
    date = '',
    startTime = '',
    endTime = '',
    startKm = 0,
    endKm = 0,
    stops = 0,
    packages = 0,
    fuelCost = 0,
    isSundayRate = false,
    baseRate = BASE_PACKAGE_RATE,
    sundayRate = SUNDAY_PACKAGE_RATE
  } = data;

  const numStartKm = Math.max(0, parseFloat(startKm) || 0);
  const numEndKm = Math.max(0, parseFloat(endKm) || 0);
  const numStops = Math.max(0, parseInt(stops, 10) || 0);
  const numPackages = Math.max(0, parseInt(packages, 10) || 0);
  const numFuel = Math.max(0, parseFloat(fuelCost) || 0);

  // 1. Taxa por pacote (domingo ou taxa especial vs normal)
  const ratePerPackage = isSundayRate ? (Number(sundayRate) || SUNDAY_PACKAGE_RATE) : (Number(baseRate) || BASE_PACKAGE_RATE);

  // 2. Faturamento Bruto
  const grossEarnings = numPackages * ratePerPackage;

  // 3. Km Total
  const totalKm = Math.max(0, numEndKm >= numStartKm ? numEndKm - numStartKm : 0);

  // 4. Tempo Total em Rota
  const totalMinutes = calculateMinutes(startTime, endTime);
  const decimalHours = minutesToDecimalHours(totalMinutes);
  const durationFormatted = formatDuration(totalMinutes);

  // 5. Eficiência Financeira (R$/Km)
  const efficiencyPerKm = totalKm > 0 ? grossEarnings / totalKm : 0;

  // 6. Média de Densidade (Pacotes por Parada)
  const densityPerStop = numStops > 0 ? numPackages / numStops : 0;

  // 7. Custo de Combustível por Km
  const fuelCostPerKm = totalKm > 0 ? numFuel / totalKm : 0;

  // 8. Lucro Líquido Diário
  const netProfit = grossEarnings - numFuel;

  // 9. Ganhos por Hora Trabalhada
  const hourlyGross = decimalHours > 0 ? grossEarnings / decimalHours : 0;
  const hourlyNet = decimalHours > 0 ? netProfit / decimalHours : 0;

  // 10. Ritmo Operacional: Pacotes por Hora
  const packagesPerHour = decimalHours > 0 ? Number((numPackages / decimalHours).toFixed(1)) : 0;

  return {
    date,
    dayOfWeek: getDayOfWeekName(date),
    startTime,
    endTime,
    startKm: numStartKm,
    endKm: numEndKm,
    totalKm,
    stops: numStops,
    packages: numPackages,
    fuelCost: numFuel,
    isSundayRate,
    ratePerPackage,
    grossEarnings,
    netProfit,
    fuelCostPerKm,
    hourlyGross,
    hourlyNet,
    packagesPerHour,
    totalMinutes,
    decimalHours,
    durationHours: decimalHours,
    durationFormatted,
    efficiencyPerKm,
    densityPerStop
  };
}

/**
 * Formata valores numéricos para Moeda Brasileira (R$ 1.234,56).
 * @param {number} value 
 * @returns {string}
 */
export function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata número de Km com separador de milhar.
 * @param {number} value 
 * @returns {string}
 */
export function formatKm(value) {
  const num = Number(value) || 0;
  return `${num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

/**
 * Formata número com 2 casas decimais.
 * @param {number} value 
 * @returns {string}
 */
export function formatNumber(value, decimals = 1) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formata data no formato brasileiro DD/MM/YYYY.
 * @param {string} dateString 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatDateBR(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}
