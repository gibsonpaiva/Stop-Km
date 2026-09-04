/**
 * StopKm - Módulo de Geração e Exportação de Comprovantes (Receipt View)
 * Estilo visual LARQ: Card Branco Puro com detalhes em Deep Navy e Ciano
 */

import { formatCurrency, formatKm, formatNumber, formatDateBR } from './calculations.js';
import { getAggregatedMetrics, filterRoutes } from './store.js';

export function renderReceiptCard(period = 'this_month', startDate = '', endDate = '') {
  const container = document.getElementById('receipt-card-container');
  if (!container) return;

  const routes = filterRoutes(period, startDate, endDate);
  const metrics = getAggregatedMetrics(routes);

  let periodLabel = 'Hoje';
  if (period === 'today') periodLabel = 'Hoje (' + formatDateBR(new Date().toISOString().substring(0, 10)) + ')';
  else if (period === 'this_week') periodLabel = 'Esta Semana';
  else if (period === 'last_7_days') periodLabel = 'Últimos 7 Dias';
  else if (period === 'this_month') {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    periodLabel = `${monthNames[new Date().getMonth()]} / ${new Date().getFullYear()}`;
  } else if (period === 'last_month') {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const prevDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    periodLabel = `${monthNames[prevDate.getMonth()]} / ${prevDate.getFullYear()}`;
  } else if (period === 'custom') {
    periodLabel = `${formatDateBR(startDate) || 'Início'} até ${formatDateBR(endDate) || 'Fim'}`;
  }

  const receiptCode = 'SKM-' + Math.abs(hashCode(periodLabel + metrics.totalGross)).toString(16).toUpperCase().padStart(6, '0');
  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (routes.length === 0) {
    container.innerHTML = `
      <div class="larq-card-white p-6 text-center text-slate-400">
        <div class="w-12 h-12 rounded-full bg-[#EEF4FA] mx-auto flex items-center justify-center mb-3 text-slate-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <h4 class="text-sm font-bold text-[#0F2942]">Nenhum registro no período</h4>
        <p class="text-xs text-slate-400 mt-1">Selecione outro período ou adicione rotas na aba Lançamento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div id="receipt-capture-target" class="larq-card-white p-5 border border-slate-200/80 shadow-xl relative overflow-hidden bg-white text-[#0F2942]">
      
      <!-- Cabeçalho do Comprovante -->
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-[#0F2942] flex items-center justify-center text-white">
            <svg class="w-5 h-5 text-[#25A4DC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-[#0F2942] flex items-center gap-1.5 leading-tight">
              StopKm <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#EEF4FA] text-[#0F2942]">PRO</span>
            </h3>
            <p class="text-[10px] text-slate-400 font-semibold">Relatório de Faturamento</p>
          </div>
        </div>

        <div class="text-right">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0284C7]">
            CONSOLIDADO
          </span>
          <p class="text-[9px] font-mono text-slate-400 mt-1">${receiptCode}</p>
        </div>
      </div>

      <!-- Info Período & Dias -->
      <div class="grid grid-cols-2 gap-2 py-3 border-b border-dashed border-slate-200 text-xs">
        <div>
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Período</span>
          <p class="font-bold text-[#0F2942]">${periodLabel}</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Dias em Rota</span>
          <p class="font-bold text-[#25A4DC]">${metrics.daysWorked} ${metrics.daysWorked === 1 ? 'dia' : 'dias'}</p>
        </div>
      </div>

      <!-- Card Central de Lucro & Faturamento -->
      <div class="my-3 p-4 rounded-2xl bg-[#0F2942] text-white">
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-[11px] font-medium text-slate-300">Lucro Líquido Real</span>
          <span class="text-[9px] text-[#25A4DC] font-bold bg-white/10 px-2 py-0.5 rounded-full">Livre</span>
        </div>
        <div class="text-2xl font-black text-white tracking-tight">
          ${formatCurrency(metrics.totalNetProfit)}
        </div>

        <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
          <div>
            <span class="text-[10px] text-slate-300 block">Faturamento Bruto</span>
            <span class="font-bold text-white">${formatCurrency(metrics.totalGross)}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-300 block">Combustível</span>
            <span class="font-bold text-amber-300">${metrics.totalFuel > 0 ? '- ' + formatCurrency(metrics.totalFuel) : 'R$ 0,00'}</span>
          </div>
        </div>
      </div>

      <!-- 3 Indicadores Rápidos -->
      <div class="grid grid-cols-3 gap-2 py-1 text-center">
        <div class="p-2 rounded-xl bg-[#EEF4FA]">
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Pacotes</span>
          <span class="text-xs font-bold text-[#0F2942] mt-0.5 block">${metrics.totalPackages}</span>
        </div>
        <div class="p-2 rounded-xl bg-[#EEF4FA]">
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Km Rodados</span>
          <span class="text-xs font-bold text-[#0F2942] mt-0.5 block">${formatKm(metrics.totalKm)}</span>
        </div>
        <div class="p-2 rounded-xl bg-[#EEF4FA]">
          <span class="text-[9px] uppercase font-bold text-slate-400 block">Paradas</span>
          <span class="text-xs font-bold text-[#0F2942] mt-0.5 block">${metrics.totalStops}</span>
        </div>
      </div>

      <!-- Médias e Eficiência -->
      <div class="mt-2.5 p-3 rounded-xl bg-[#EEF4FA] text-xs space-y-1.5 font-medium">
        <div class="flex justify-between items-center text-slate-600">
          <span>Eficiência Financeira</span>
          <span class="font-bold text-[#25A4DC]">${formatCurrency(metrics.avgEarningsPerKm)} / km</span>
        </div>
        <div class="flex justify-between items-center text-slate-600">
          <span>Densidade Média</span>
          <span class="font-bold text-[#0F2942]">${formatNumber(metrics.avgPackagesPerStop, 2)} pct / parada</span>
        </div>
        <div class="flex justify-between items-center text-slate-600">
          <span>Tempo Médio Diário</span>
          <span class="font-bold text-[#0F2942]">${metrics.avgHoursFormatted} em rota</span>
        </div>
      </div>

      <!-- Rodapé do Cupom -->
      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>Emissão: ${generatedAt}</span>
        <span class="font-mono tracking-widest text-[#0F2942]">||||| | |||| ||| |||||</span>
      </div>

    </div>
  `;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function downloadReceiptImage(onSuccess, onError) {
  const target = document.getElementById('receipt-capture-target');
  if (!target) {
    if (onError) onError('Comprovante não encontrado.');
    return;
  }

  if (typeof html2canvas === 'undefined') {
    if (onError) onError('Biblioteca html2canvas indisponível.');
    return;
  }

  try {
    const canvas = await html2canvas(target, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const fileName = `Comprovante_StopKm_${new Date().toISOString().substring(0, 10)}.png`;

    const link = document.createElement('a');
    link.href = imgData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onSuccess) onSuccess(fileName);
  } catch (err) {
    console.error('Erro ao capturar comprovante:', err);
    if (onError) onError('Falha ao gerar imagem.');
  }
}

export function shareReceiptSummary(period = 'today') {
  const routes = filterRoutes(period);
  const metrics = getAggregatedMetrics(routes);

  let periodName = 'Hoje';
  if (period === 'today') periodName = 'Hoje';
  else if (period === 'this_week') periodName = 'Esta Semana';
  else if (period === 'this_month') periodName = 'Mês Atual';
  else if (period === 'last_month') periodName = 'Mês Anterior';
  else if (period === 'custom') periodName = 'Personalizado';

  const text = `🚚 *Relatório StopKm - Resumo de Rotas*\n` +
    `🗓 *Período:* ${periodName}\n` +
    `📦 *Pacotes Entregues:* ${metrics.totalPackages} un\n` +
    `🛣 *Km Rodados:* ${formatKm(metrics.totalKm)}\n` +
    `⏱ *Dias Trabalhados:* ${metrics.daysWorked}\n` +
    `💰 *Faturamento Bruto:* ${formatCurrency(metrics.totalGross)}\n` +
    `⛽ *Combustível:* ${formatCurrency(metrics.totalFuel)}\n` +
    `💵 *LUCRO LÍQUIDO:* ${formatCurrency(metrics.totalNetProfit)}\n` +
    `📈 *Eficiência:* ${formatCurrency(metrics.avgEarningsPerKm)}/km\n\n` +
    `_Gerado pelo StopKm_`;

  if (navigator.share) {
    navigator.share({ title: 'StopKm - Comprovante', text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Resumo copiado para a área de transferência!');
  });
}
