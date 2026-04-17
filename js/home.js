let HOME_EVAL = {
  envs: [
    { id: 'avg', label: 'Avg', offset: 0.0 },
    { id: 'Minigrid', label: 'Minigrid', offset: 2.8 },
    { id: 'alfworld', label: 'ALFWorld', offset: -2.1 },
    { id: 'DeliveryBench', label: 'DeliveryBench', offset: -1.0 },
    { id: 'THOR', label: 'THOR', offset: 1.4 },
    { id: 'travelplanner', label: 'TravelPlanner', offset: -0.5 },
    { id: 'pddl', label: 'PDDL', offset: 3.6 },
  ],
  variation: [0.0, 0.3, -0.2, 0.1, -0.4, 0.2, -0.1, 0.4, -0.3],
  methods: [
    {
      name: 'AgentSquare',
      score: 66.9,
      reasoning: 'Hybrid search + planner reranking',
      memory: 'Graph episodic memory',
      reflection: 'Self-refine on failed trajectories',
    },
    {
      name: 'Random Search',
      score: 66.0,
      reasoning: 'Random action rollout and retry',
      memory: 'None',
      reflection: 'None',
    },
    {
      name: 'Bayesian Search',
      score: 65.0,
      reasoning: 'Bayesian optimization over plans',
      memory: 'Short-horizon score buffer',
      reflection: 'Prompt update via posterior estimate',
    },
    {
      name: 'OPENAGI',
      score: 61.6,
      reasoning: 'Task decomposition + tool routing',
      memory: 'Task execution context memory',
      reflection: 'Replan after tool failures',
    },
    {
      name: 'DEPS',
      score: 59.1,
      reasoning: 'Dynamic exemplar policy search',
      memory: 'Exemplar retrieval memory',
      reflection: 'Trajectory-level self-critique',
    },
    {
      name: 'OPRO',
      score: 58.9,
      reasoning: 'Optimizer-driven prompt search',
      memory: 'Prompt history memory',
      reflection: 'Policy update from score deltas',
    },
    {
      name: 'HuggingGPT',
      score: 58.4,
      reasoning: 'Planner + model/tool orchestration',
      memory: 'Tool-call trace memory',
      reflection: 'Failure-aware tool reselection',
    },
    {
      name: 'Generative Agents',
      score: 55.3,
      reasoning: 'Goal-driven daily planning loop',
      memory: 'Long-term natural language memory',
      reflection: 'Periodic reflection summary',
    },
    {
      name: 'CoT',
      score: 54.2,
      reasoning: 'Chain-of-thought single path',
      memory: 'None',
      reflection: 'None',
    },
    {
      name: 'TP',
      score: 51.8,
      reasoning: 'Explicit task planning',
      memory: 'Task-state notes',
      reflection: 'Plan repair after mismatch',
    },
    {
      name: 'Self-refine',
      score: 51.4,
      reasoning: 'Draft -> critique -> revise loop',
      memory: 'Working-memory scratchpad',
      reflection: 'Built-in iterative self-reflection',
    },
    {
      name: 'Cot-SC',
      score: 49.5,
      reasoning: 'CoT with self-consistency voting',
      memory: 'Sampled answer cache',
      reflection: 'Vote-based error correction',
    },
    {
      name: 'Step Back',
      score: 48.6,
      reasoning: 'Abstraction-first step-back prompting',
      memory: 'Abstract schema memory',
      reflection: 'Backtracking over abstract plan',
    },
    {
      name: 'ToT',
      score: 47.6,
      reasoning: 'Tree-of-thought branching search',
      memory: 'Search tree memory',
      reflection: 'Branch evaluation and pruning',
    },
    {
      name: 'Dilu',
      score: 46.3,
      reasoning: 'Deliberate look-ahead utility search',
      memory: 'Action-outcome cache',
      reflection: 'Look-ahead adjustment loop',
    },
    {
      name: 'Voyager',
      score: 41.2,
      reasoning: 'Skill curriculum and exploration',
      memory: 'Skill library memory',
      reflection: 'Automatic skill critique and update',
    },
  ],
};

const CHART_MAX = 80;
const AXIS_STEP = 10;

function clampScore(score) {
  return Math.max(0, Math.min(CHART_MAX, score));
}

function getEnvById(envId) {
  return HOME_EVAL.envs.find((env) => env.id === envId) || HOME_EVAL.envs[0];
}

function getResultsMax(envId) {
  const results = getResultsByEnv(envId);
  const maxScore = results.reduce((acc, item) => Math.max(acc, Number(item.score) || 0), 0);
  return maxScore <= CHART_MAX ? CHART_MAX : Math.ceil(maxScore / 10) * 10;
}

function getResultsByEnv(envId) {
  if (HOME_EVAL.methodsByEnv && HOME_EVAL.methodsByEnv[envId]) {
    return HOME_EVAL.methodsByEnv[envId]
      .map((method) => ({ ...method, score: Number(method.score) || 0 }))
      .sort((a, b) => b.score - a.score);
  }

  const envIdx = HOME_EVAL.envs.findIndex((env) => env.id === envId);
  const env = HOME_EVAL.envs[envIdx] || HOME_EVAL.envs[0];

  return HOME_EVAL.methods
    .map((method, idx) => {
      const v = HOME_EVAL.variation[(idx + envIdx) % HOME_EVAL.variation.length];
      const score = clampScore(Number((method.score + env.offset + v).toFixed(1)));
      return { ...method, score };
    })
    .sort((a, b) => b.score - a.score);
}

function getBarColor(score, maxValue = CHART_MAX) {
  const ratio = Math.max(0, Math.min(1, score / maxValue));
  const lightness = 76 - ratio * 22;
  const saturation = 70 + ratio * 14;
  return `hsl(211 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}

function renderTooltipContent(tooltipEl, entry, envLabel) {
  tooltipEl.innerHTML = `
    <p class="eval-hover-tooltip-title">${entry.name} — ${envLabel}: ${entry.score.toFixed(1)}</p>
    <p class="eval-hover-tooltip-line"><strong>Reasoning:</strong> ${entry.reasoning}</p>
    <p class="eval-hover-tooltip-line"><strong>Memory:</strong> ${entry.memory}</p>
    <p class="eval-hover-tooltip-line"><strong>Reflection:</strong> ${entry.reflection}</p>
  `;
}

function renderAxis(axisEl, maxValue = CHART_MAX, step = AXIS_STEP) {
  axisEl.innerHTML = '';
  for (let tick = 0; tick <= maxValue; tick += step) {
    const pct = (tick / maxValue) * 100;
    const tickEl = document.createElement('span');
    tickEl.className = 'eval-axis-tick';
    tickEl.style.left = `${pct}%`;

    const labelEl = document.createElement('span');
    labelEl.className = 'eval-axis-label';
    labelEl.style.left = `${pct}%`;
    labelEl.textContent = `${tick}`;

    axisEl.appendChild(tickEl);
    axisEl.appendChild(labelEl);
  }
}

function showTooltip(tooltipEl, shellEl, targetEl, entry, envLabel, clientX) {
  renderTooltipContent(tooltipEl, entry, envLabel);
  tooltipEl.classList.add('visible');
  tooltipEl.setAttribute('aria-hidden', 'false');

  const shellRect = shellEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const gap = 8;

  let left = clientX ? clientX - shellRect.left + 12 : targetRect.left - shellRect.left + 8;
  const maxLeft = shellRect.width - tooltipRect.width - 10;
  left = Math.max(10, Math.min(left, maxLeft));

  const prefTop = targetRect.top - shellRect.top - tooltipRect.height - gap;
  const fallbackTop = targetRect.bottom - shellRect.top + gap;
  const top = prefTop >= 8 ? prefTop : fallbackTop;

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

function hideTooltip(tooltipEl) {
  tooltipEl.classList.remove('visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
}

function renderTableRows(tableBodyEl, envId) {
  const env = getEnvById(envId);
  const results = getResultsByEnv(env.id);
  const maxValue = getResultsMax(env.id);
  tableBodyEl.innerHTML = '';

  results.forEach((entry) => {
    const performance = window.HomeEvalCsv && window.HomeEvalCsv.colorFormatter
      ? window.HomeEvalCsv.colorFormatter(entry.score, { min: 0, max: maxValue })
      : entry.score.toFixed(1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.name}</td>
      <td>${entry.reasoning}</td>
      <td>${entry.memory}</td>
      <td>${entry.reflection}</td>
      <td>${performance}</td>
    `;
    tableBodyEl.appendChild(tr);
  });
}

function renderChartRows(containerEl, tooltipEl, shellEl, envId) {
  const env = getEnvById(envId);
  const results = getResultsByEnv(env.id);
  const maxValue = getResultsMax(env.id);

  containerEl.innerHTML = '';

  results.forEach((entry) => {
    const pct = (entry.score / maxValue) * 100;
    const barColor = getBarColor(entry.score, maxValue);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'eval-bar-row';
    row.innerHTML = `
      <span class="eval-bar-label">${entry.name}</span>
      <span class="eval-bar-track" style="--bar-pct:${pct.toFixed(2)}%;">
        <span class="eval-bar-fill" style="width:${pct.toFixed(2)}%; background:${barColor};"></span>
        <span class="eval-bar-end">${entry.score.toFixed(2)}</span>
      </span>
    `;

    const showDetails = (event) => showTooltip(tooltipEl, shellEl, row, entry, env.label, event?.clientX);
    row.addEventListener('mouseenter', showDetails);
    row.addEventListener('mousemove', showDetails);
    row.addEventListener('focus', showDetails);
    row.addEventListener('mouseleave', () => hideTooltip(tooltipEl));
    row.addEventListener('blur', () => hideTooltip(tooltipEl));

    containerEl.appendChild(row);
  });
}

function renderFilters(stripEl, barsEl, tableBodyEl, tooltipEl, shellEl) {
  stripEl.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'eval-filter-label';
  label.textContent = 'Filter by Task:';
  stripEl.appendChild(label);

  const setActive = (activeId) => {
    stripEl.querySelectorAll('.eval-filter-btn').forEach((btn) => {
      const active = btn.dataset.env === activeId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    hideTooltip(tooltipEl);
    renderAxis(document.querySelector('#eval-axis'), getResultsMax(activeId));
    renderChartRows(barsEl, tooltipEl, shellEl, activeId);
    renderTableRows(tableBodyEl, activeId);
  };

  HOME_EVAL.envs.forEach((env) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eval-filter-btn';
    btn.dataset.env = env.id;
    btn.textContent = env.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.addEventListener('click', () => setActive(env.id));
    stripEl.appendChild(btn);
  });

  setActive(HOME_EVAL.envs[0].id);
}

async function loadHomeEvaluationFromCsv() {
  if (!window.HomeEvalCsv || typeof window.HomeEvalCsv.loadHomeEvalData !== 'function') {
    return;
  }

  try {
    const csvEval = await window.HomeEvalCsv.loadHomeEvalData('data/results.csv');
    if (csvEval && Array.isArray(csvEval.envs) && csvEval.envs.length > 0) {
      HOME_EVAL = csvEval;
    }
  } catch (_err) {
    // Keep built-in fallback data.
  }
}

async function initHomeEvaluation() {
  const filterStrip = document.querySelector('#eval-filter-strip');
  const barsContainer = document.querySelector('#eval-bars');
  const axis = document.querySelector('#eval-axis');
  const tableBody = document.querySelector('#eval-table-body');
  const hoverTooltip = document.querySelector('#eval-hover-tooltip');
  const chartShell = document.querySelector('.eval-chart-shell');

  if (!filterStrip || !barsContainer || !axis || !tableBody || !hoverTooltip || !chartShell) {
    return;
  }

  await loadHomeEvaluationFromCsv();
  renderAxis(axis, getResultsMax(HOME_EVAL.envs[0].id));
  renderFilters(filterStrip, barsContainer, tableBody, hoverTooltip, chartShell);
}

async function loadAbstract() {
  const abstractEl = document.querySelector('#abstract-copy');
  if (!abstractEl) {
    return;
  }

  const src = abstractEl.dataset.abstractSrc;
  if (!src) {
    return;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to load abstract: ${response.status}`);
    }

    const text = (await response.text()).trim();
    const paragraphs = text
      .split(/\n\s*\n/g)
      .map((part) => part.trim())
      .filter(Boolean);

    abstractEl.innerHTML = paragraphs
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
      .join('');
  } catch (_err) {
    // Keep the placeholder text if the markdown file cannot be loaded.
  }
}

document.addEventListener('DOMContentLoaded', initHomeEvaluation);
document.addEventListener('DOMContentLoaded', loadAbstract);
