/**
 * StopKm - Módulo de Gráficos (Chart.js)
 * Estilo visual LARQ: Barras em Deep Navy (#0F2942) e Ciano Vibrante (#25A4DC),
 * Linhas de referência sutis e estética minimalista
 */

let earningsChartInstance = null;
let kmVsPackagesChartInstance = null;

export function renderDashboardCharts(allRoutes = []) {
  if (typeof Chart === 'undefined') return;
  renderEarningsEvolutionChart(allRoutes);
  renderKmVsPackagesChart(allRoutes);
}

/**
 * Gráfico 1: Evolução do Faturamento Diário (Mês Atual vs Mês Anterior)
 */
function renderEarningsEvolutionChart(allRoutes) {
  const canvas = document.getElementById('chart-earnings-evolution');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const currentMonthData = new Array(daysInMonth).fill(0);

  allRoutes.forEach((route) => {
    if (!route.date) return;
    const [y, m, d] = route.date.split('-').map(Number);
    const dayIdx = d - 1;
    if (y === currentYear && m === currentMonth + 1 && dayIdx >= 0 && dayIdx < daysInMonth) {
      currentMonthData[dayIdx] = (currentMonthData[dayIdx] || 0) + (route.grossEarnings || 0);
    }
  });

  if (earningsChartInstance) {
    earningsChartInstance.destroy();
  }

  earningsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Faturamento (R$)',
          data: currentMonthData,
          backgroundColor: '#25A4DC',
          hoverBackgroundColor: '#0F2942',
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F2942',
          titleColor: '#FFFFFF',
          bodyColor: '#E0F2FE',
          padding: 10,
          cornerRadius: 12,
          callbacks: {
            title: (items) => `Dia ${items[0].label}`,
            label: (item) => `R$ ${Number(item.raw || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#8DA5BA',
            font: { size: 9, weight: '600' },
            maxTicksLimit: 12
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#EEF4FA',
            drawBorder: false
          },
          ticks: {
            color: '#8DA5BA',
            font: { size: 9, weight: '600' },
            callback: (v) => `R$${v}`
          }
        }
      }
    }
  });
}

/**
 * Gráfico 2: Relação Km Rodados vs Pacotes (Estilo LARQ Bar + Line)
 */
function renderKmVsPackagesChart(allRoutes) {
  const canvas = document.getElementById('chart-km-vs-packages');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const recentRoutes = [...allRoutes].slice(0, 7).reverse();

  if (recentRoutes.length === 0) {
    if (kmVsPackagesChartInstance) {
      kmVsPackagesChartInstance.destroy();
      kmVsPackagesChartInstance = null;
    }
    return;
  }

  const daysOfWeekLetters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const labels = recentRoutes.map((r) => {
    if (!r.date) return '';
    const [y, m, d] = r.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return `${daysOfWeekLetters[dateObj.getDay()]} (${d})`;
  });

  const packagesData = recentRoutes.map((r) => r.packages || 0);
  const kmData = recentRoutes.map((r) => r.totalKm || 0);

  if (kmVsPackagesChartInstance) {
    kmVsPackagesChartInstance.destroy();
  }

  kmVsPackagesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Pacotes Entregues',
          data: packagesData,
          backgroundColor: '#0F2942',
          hoverBackgroundColor: '#25A4DC',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Km Rodados',
          data: kmData,
          borderColor: '#25A4DC',
          backgroundColor: '#25A4DC',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#25A4DC',
          pointBorderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#64829E',
            font: { size: 10, weight: '600' },
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#0F2942',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          cornerRadius: 12,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#8DA5BA',
            font: { size: 9, weight: '600' }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: { color: '#EEF4FA' },
          ticks: {
            color: '#0F2942',
            font: { size: 9, weight: '600' }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#25A4DC',
            font: { size: 9, weight: '600' },
            callback: (v) => `${v}k`
          }
        }
      }
    }
  });
}
