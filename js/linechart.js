/* Interactive line-chart evaluation panel — requires Chart.js 4 */

(function () {
  'use strict';

  const MODEL_X_ORDER = [
    'Qwen3.5-9B',
    'GPT-5 mini',
    'Qwen3.5-397B',
    'Gemini-3-Flash',
    'GPT-5',
  ];

  const BENCHMARK_ORDER = ['DeliveryBench', 'MiniGrid', 'ALFRED', 'RoboTHOR'];

  const BENCHMARK_METRIC = {
    DeliveryBench: 'Hourly Profit',
    MiniGrid: 'Success Rate (%)',
    ALFRED: 'Success Rate (%)',
    RoboTHOR: 'Success Rate (%)',
  };

  const HIGHLIGHT = {
    'ReAct+DynamicCheatsheet+None': { color: '#3b82f6', label: 'ReAct + DynamicCheatsheet', width: 2.5, order: 20 },
    'ReAct+MemoryBank+None':        { color: '#22c55e', label: 'ReAct + MemoryBank',         width: 2.5, order: 19 },
    'ReAct+Base+Reflexion':         { color: '#f97316', label: 'ReAct + Reflexion',           width: 2.5, order: 18 },
    'Plan&Solve+Base+None':         { color: '#a855f7', label: 'Plan&Solve',                   width: 2.5, order: 17 },
    'MAD+Base+None':                { color: '#ef4444', label: 'MAD (Multi-Agent)',            width: 2.0, order: 16 },
    'None+Base+None':               { color: '#94a3b8', label: 'None (Baseline)',              width: 1.5, order: 15 },
  };

  const BEST_COLOR = '#1e3a5f';

  function configKey(r) {
    return r.reasoning + '+' + r.memory + '+' + r.reflection;
  }

  function buildDatasets(records, env) {
    const envRecs = records.filter(function (r) { return r.task === env; });

    var byConfig = new Map();
    envRecs.forEach(function (r) {
      var k = configKey(r);
      if (!byConfig.has(k)) byConfig.set(k, []);
      byConfig.get(k).push(r);
    });

    var bestPerModel = new Map();
    MODEL_X_ORDER.forEach(function (model) {
      var recs = envRecs.filter(function (r) { return r.model === model; });
      if (!recs.length) return;
      var best = recs.reduce(function (a, b) { return b.score > a.score ? b : a; });
      bestPerModel.set(model, best);
    });

    var datasets = [];

    byConfig.forEach(function (recs, key) {
      var hi = HIGHLIGHT[key] || null;
      var color = hi ? hi.color : '#e2e8f0';
      var width = hi ? hi.width : 1;
      var order = hi ? hi.order : 5;
      var radius = hi ? 4 : 2;

      var data = MODEL_X_ORDER.map(function (model) {
        var r = recs.find(function (x) { return x.model === model; });
        return r ? Number(r.score) : null;
      });

      datasets.push({
        label: key,
        displayLabel: hi ? hi.label : key,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: width,
        pointRadius: radius,
        pointHoverRadius: radius + 3,
        pointBorderWidth: hi ? 2 : 1,
        pointBorderColor: hi ? '#fff' : color,
        fill: false,
        tension: 0.35,
        order: order,
        spanGaps: false,
        isHighlighted: !!hi,
        configKey: key,
        rawRecs: recs,
      });
    });

    var bestData = MODEL_X_ORDER.map(function (model) {
      var r = bestPerModel.get(model);
      return r ? Number(r.score) : null;
    });
    var bestRecs = MODEL_X_ORDER.map(function (model) {
      return bestPerModel.get(model) || null;
    });

    datasets.push({
      label: '__best__',
      displayLabel: 'Best per Model',
      data: bestData,
      borderColor: BEST_COLOR,
      backgroundColor: BEST_COLOR,
      borderWidth: 2,
      borderDash: [6, 4],
      pointStyle: 'rectRot',
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBorderWidth: 2,
      pointBorderColor: BEST_COLOR,
      fill: false,
      tension: 0,
      order: 30,
      spanGaps: false,
      isBest: true,
      bestRecs: bestRecs,
    });

    return datasets;
  }

  function tooltipInfo(dataset, dataIndex) {
    var score = dataset.data[dataIndex];
    if (score === null || score === undefined) return null;
    var modelName = MODEL_X_ORDER[dataIndex] || '';
    var scoreStr = Number(score).toFixed(1);

    if (dataset.isBest) {
      var rec = dataset.bestRecs && dataset.bestRecs[dataIndex];
      if (!rec) return null;
      return {
        title: '★ Best — ' + modelName + ': ' + scoreStr,
        lines: [
          'Reasoning: ' + rec.reasoning,
          'Memory: ' + rec.memory,
          'Reflection: ' + rec.reflection,
        ],
      };
    }

    var parts = (dataset.configKey || dataset.label).split('+');
    return {
      title: modelName + ': ' + scoreStr,
      lines: [
        'Reasoning: ' + (parts[0] || '—'),
        'Memory: ' + (parts[1] || '—'),
        'Reflection: ' + (parts[2] || '—'),
      ],
    };
  }

  function positionTooltip(tooltipEl, panelEl, canvasEl, caretX, caretY) {
    var panelRect = panelEl.getBoundingClientRect();
    var canvasRect = canvasEl.getBoundingClientRect();
    var offX = canvasRect.left - panelRect.left;
    var offY = canvasRect.top - panelRect.top;

    var ttW = tooltipEl.offsetWidth || 200;
    var ttH = tooltipEl.offsetHeight || 80;

    var left = offX + caretX + 14;
    var top  = offY + caretY - ttH - 10;

    if (left + ttW > panelRect.width - 4) {
      left = offX + caretX - ttW - 14;
    }
    if (top < 4) {
      top = offY + caretY + 14;
    }

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top  = top  + 'px';
  }

  function createChart(canvasEl, env, allRecords) {
    var datasets = buildDatasets(allRecords, env);
    var metric = BENCHMARK_METRIC[env] || 'Score';
    var panelEl = canvasEl.closest('.linechart-panel');
    var tooltipEl = panelEl && panelEl.querySelector('.linechart-point-tooltip');

    return new Chart(canvasEl, {
      type: 'line',
      data: { labels: MODEL_X_ORDER, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: {
          mode: 'nearest',
          axis: 'xy',
          intersect: true,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: function (context) {
              if (!tooltipEl) return;
              var tooltip = context.tooltip;

              if (tooltip.opacity === 0) {
                tooltipEl.style.opacity = '0';
                tooltipEl.style.pointerEvents = 'none';
                return;
              }

              var dp = tooltip.dataPoints && tooltip.dataPoints[0];
              if (!dp) return;

              var ds = context.chart.data.datasets[dp.datasetIndex];
              var info = tooltipInfo(ds, dp.dataIndex);
              if (!info) return;

              tooltipEl.innerHTML =
                '<strong class="linechart-tt-title">' + info.title + '</strong>' +
                info.lines.map(function (l) {
                  return '<span class="linechart-tt-line">' + l + '</span>';
                }).join('');

              tooltipEl.style.opacity = '1';
              tooltipEl.style.pointerEvents = 'none';

              positionTooltip(tooltipEl, panelEl, canvasEl, tooltip.caretX, tooltip.caretY);
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { size: 11, family: "'Noto Sans', sans-serif" },
              color: '#64748b',
              maxRotation: 25,
            },
            title: {
              display: true,
              text: 'Backbone Model',
              font: { size: 11, weight: '600' },
              color: '#64748b',
              padding: { top: 4 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { size: 11, family: "'Noto Sans', sans-serif" },
              color: '#64748b',
            },
            title: {
              display: true,
              text: metric,
              font: { size: 11, weight: '600' },
              color: '#64748b',
              padding: { bottom: 4 },
            },
          },
        },
      },
    });
  }

  function buildLegend(containerEl) {
    var items = Object.entries(HIGHLIGHT).map(function (entry) {
      return { color: entry[1].color, label: entry[1].label, dash: false };
    });
    items.push({ color: BEST_COLOR, label: 'Best per Model (★)', dash: true });
    items.push({ color: '#e2e8f0', label: 'Other Configurations', dash: false });

    containerEl.innerHTML = items.map(function (item) {
      var swatchStyle = item.dash
        ? 'border-bottom:2.5px dashed ' + item.color + ';background:transparent;'
        : 'background:' + item.color + ';';
      return '<span class="linechart-legend-item">' +
        '<span class="linechart-legend-swatch" style="' + swatchStyle + '"></span>' +
        '<span class="linechart-legend-label">' + item.label + '</span>' +
        '</span>';
    }).join('');
  }

  async function initLineCharts() {
    var gridEl = document.getElementById('eval-linecharts');
    var legendEl = document.getElementById('linechart-legend');
    if (!gridEl) return;

    if (typeof Chart === 'undefined') {
      gridEl.innerHTML = '<p class="has-text-grey has-text-centered p-4">Chart.js did not load.</p>';
      return;
    }
    if (!window.HomeEvalCsv || typeof window.HomeEvalCsv.loadHomeEvalData !== 'function') {
      return;
    }

    try {
      var evalData = await window.HomeEvalCsv.loadHomeEvalData('data/results.csv');
      if (!evalData || !evalData.records.length) return;

      if (legendEl) buildLegend(legendEl);

      BENCHMARK_ORDER.forEach(function (env) {
        var envRecs = evalData.records.filter(function (r) { return r.task === env; });
        if (!envRecs.length) return;

        var panel = document.createElement('div');
        panel.className = 'linechart-panel';

        var heading = document.createElement('h4');
        heading.className = 'linechart-panel-title';
        var metric = BENCHMARK_METRIC[env] || '';
        heading.textContent = env + (metric ? '  —  ' + metric : '');

        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'linechart-canvas-wrap';

        var canvas = document.createElement('canvas');
        canvasWrap.appendChild(canvas);

        var tooltip = document.createElement('div');
        tooltip.className = 'linechart-point-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.setAttribute('aria-hidden', 'true');
        tooltip.style.opacity = '0';

        panel.appendChild(heading);
        panel.appendChild(canvasWrap);
        panel.appendChild(tooltip);
        gridEl.appendChild(panel);

        createChart(canvas, env, evalData.records);
      });
    } catch (_err) {
      if (gridEl) {
        gridEl.innerHTML = '<p class="has-text-grey has-text-centered p-4">Could not load evaluation data.</p>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initLineCharts);
})();
