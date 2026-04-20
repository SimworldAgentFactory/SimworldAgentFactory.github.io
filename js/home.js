const MODEL_ALL = '__all__';
const MODEL_ORDER = [
  'GPT-5',
  'Gemini-3-Flash',
  'Qwen3.5-397B',
  'Qwen3.5-9B',
  'GPT-5 mini',
];

let HOME_EVAL = {
  tasks: [],
  models: [],
  records: [],
};

const CHART_MAX = 80;
const AXIS_STEP = 10;
const ENV_SETUP_FALLBACK_MD = `We evaluate the performance of LLMs for embodied decision making using the Embodied Agent Interface. Below is a detailed description of the evaluation setup.

### Dataset Description

To evaluate embodied intelligence across diverse modalities, we select **DeliveryBench**, **ALFRED**, **MiniGrid**, and **RoboTHOR** as our core benchmarks. These environments require the integration of perception, state tracking, and long-horizon planning.

* **DeliveryBench**: A city-scale evaluation for autonomous delivery agents across nine urban maps. It emphasizes long-horizon planning under discrete resource constraints. Observations consist of structured state data and natural-language descriptions of local topography. Performance is quantified via hourly profit.
* **ALFRED**: A 3D household environment for multi-step instruction following. Evaluation involves seven task categories requiring compositional object manipulation and state-dependent reasoning. The primary metrics are **Success Rate (SR)** and **Success-weighted Path Length (SPL)**.
* **RoboTHOR**: Focuses on first-person object navigation within photorealistic 3D indoor scenes. Agents are initialized at a starting pose and must navigate to a target object category within a predefined step budget. Efficiency and accuracy are measured using **SR** and **SPL**.
* **MiniGrid**: A 2D gridworld with pixel-based observations to test reasoning under partial observability. Across 10 distinct tasks, it evaluates navigation and object interaction. Performance is measured by **SR** and an **SPL-derived reward function** that penalizes inefficient trajectories.`;

function getTaskById(taskId) {
  return HOME_EVAL.tasks.find((task) => task.id === taskId) || HOME_EVAL.tasks[0] || null;
}

function getModelsForTask(taskId) {
  const taskIdResolved = getTaskById(taskId)?.id;
  if (!taskIdResolved) {
    return HOME_EVAL.models;
  }

  const taskRecords = HOME_EVAL.records.filter((record) => record.task === taskIdResolved);
  const taskModels = new Set(taskRecords.map((record) => record.model));
  const orderedModels = MODEL_ORDER
    .filter((modelId) => taskModels.has(modelId))
    .map((modelId) => HOME_EVAL.models.find((model) => model.id === modelId) || { id: modelId, label: modelId });

  const extraModels = HOME_EVAL.models.filter(
    (model) => !MODEL_ORDER.includes(model.id) && taskModels.has(model.id),
  );

  return [...orderedModels, ...extraModels];
}

function getResultsBySelection(taskId, modelId) {
  const task = getTaskById(taskId);
  if (!task) {
    return [];
  }

  return HOME_EVAL.records
    .filter((record) => record.task === task.id && (modelId === MODEL_ALL || record.model === modelId))
    .map((record) => ({ ...record, score: Number(record.score) || 0 }))
    .sort((a, b) => b.score - a.score);
}

function getResultsMax(taskId, modelId) {
  const results = getResultsBySelection(taskId, modelId);
  const maxScore = results.reduce((acc, item) => Math.max(acc, Number(item.score) || 0), 0);
  return maxScore <= CHART_MAX ? CHART_MAX : Math.ceil(maxScore / 10) * 10;
}

function getBarColor(score, maxValue = CHART_MAX) {
  const ratio = Math.max(0, Math.min(1, score / maxValue));
  const lightness = 76 - ratio * 22;
  const saturation = 70 + ratio * 14;
  return `hsl(211 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}

function renderTooltipContent(tooltipEl, entry, taskLabel) {
  tooltipEl.innerHTML = `
    <p class="eval-hover-tooltip-title">${entry.model} — ${taskLabel}: ${entry.score.toFixed(1)}</p>
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

function showTooltip(tooltipEl, shellEl, targetEl, entry, taskLabel, clientX) {
  renderTooltipContent(tooltipEl, entry, taskLabel);
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

function renderTableRows(tableBodyEl, taskId, modelId) {
  const task = getTaskById(taskId);
  const results = getResultsBySelection(task?.id, modelId);
  const maxValue = getResultsMax(task?.id, modelId);
  tableBodyEl.innerHTML = '';

  results.forEach((entry) => {
    const performance = window.HomeEvalCsv && window.HomeEvalCsv.colorFormatter
      ? window.HomeEvalCsv.colorFormatter(entry.score, { min: 0, max: maxValue })
      : entry.score.toFixed(1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.model}</td>
      <td>${entry.reasoning}</td>
      <td>${entry.memory}</td>
      <td>${entry.reflection}</td>
      <td>${performance}</td>
    `;
    tableBodyEl.appendChild(tr);
  });
}

function renderChartRows(containerEl, tooltipEl, shellEl, taskId, modelId) {
  const task = getTaskById(taskId);
  const results = getResultsBySelection(task?.id, modelId);
  const maxValue = getResultsMax(task?.id, modelId);

  containerEl.innerHTML = '';

  results.forEach((entry) => {
    const pct = (entry.score / maxValue) * 100;
    const barColor = getBarColor(entry.score, maxValue);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'eval-bar-row';
    row.innerHTML = `
      <span class="eval-bar-label">${entry.model}</span>
      <span class="eval-bar-track" style="--bar-pct:${pct.toFixed(2)}%;">
        <span class="eval-bar-fill" style="width:${pct.toFixed(2)}%; background:${barColor};"></span>
        <span class="eval-bar-end">${entry.score.toFixed(2)}</span>
      </span>
    `;

    const showDetails = (event) => showTooltip(tooltipEl, shellEl, row, entry, task.label, event?.clientX);
    row.addEventListener('mouseenter', showDetails);
    row.addEventListener('mousemove', showDetails);
    row.addEventListener('focus', showDetails);
    row.addEventListener('mouseleave', () => hideTooltip(tooltipEl));
    row.addEventListener('blur', () => hideTooltip(tooltipEl));

    containerEl.appendChild(row);
  });
}

function buildButton(stripEl, id, label, activeClass, role, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'eval-filter-btn';
  btn.dataset[role] = id;
  btn.textContent = label;
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');
  btn.addEventListener('click', onClick);
  stripEl.appendChild(btn);
  return btn;
}

function renderTaskButtons(stripEl, state, updateView) {
  stripEl.innerHTML = '';

  HOME_EVAL.tasks.forEach((task) => {
    buildButton(stripEl, task.id, task.label, 'task', 'env', () => {
      state.taskId = task.id;
      const availableModels = getModelsForTask(state.taskId);
      if (!availableModels.some((model) => model.id === state.modelId)) {
        state.modelId = MODEL_ALL;
      }
      renderModelButtons(state.modelStripEl, state, updateView);
      updateView();
    });
  });
}

function renderModelButtons(stripEl, state, updateView) {
  stripEl.innerHTML = '';

  buildButton(stripEl, MODEL_ALL, 'All Models', 'model', 'model', () => {
    state.modelId = MODEL_ALL;
    updateView();
  });

  getModelsForTask(state.taskId).forEach((model) => {
    buildButton(stripEl, model.id, model.label, 'model', 'model', () => {
      state.modelId = model.id;
      updateView();
    });
  });
}

function syncActiveButtons(stripEl, selectedAttr, activeId) {
  stripEl.querySelectorAll('.eval-filter-btn').forEach((btn) => {
    const selected = btn.dataset[selectedAttr] === activeId;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function renderFilters(taskStripEl, modelStripEl, barsEl, tableBodyEl, tooltipEl, shellEl, axisEl) {
  const initialTask = HOME_EVAL.tasks[0]?.id;
  if (!initialTask) {
    return;
  }

  const state = {
    taskId: initialTask,
    modelId: MODEL_ALL,
    modelStripEl,
  };

  const updateView = () => {
    const task = getTaskById(state.taskId);
    hideTooltip(tooltipEl);
    syncActiveButtons(taskStripEl, 'env', task.id);
    syncActiveButtons(modelStripEl, 'model', state.modelId);
    renderAxis(axisEl, getResultsMax(task.id, state.modelId));
    renderChartRows(barsEl, tooltipEl, shellEl, task.id, state.modelId);
    renderTableRows(tableBodyEl, task.id, state.modelId);
  };

  renderTaskButtons(taskStripEl, state, updateView);
  renderModelButtons(modelStripEl, state, updateView);
  updateView();
}

async function loadHomeEvaluationFromCsv() {
  if (!window.HomeEvalCsv || typeof window.HomeEvalCsv.loadHomeEvalData !== 'function') {
    return;
  }

  try {
    const csvEval = await window.HomeEvalCsv.loadHomeEvalData('data/results.csv');
    if (csvEval && Array.isArray(csvEval.tasks) && csvEval.tasks.length > 0) {
      HOME_EVAL = csvEval;
    }
  } catch (_err) {
    // Keep built-in fallback data.
  }
}

async function initHomeEvaluation() {
  const taskStrip = document.querySelector('#eval-task-strip');
  const modelStrip = document.querySelector('#eval-model-strip');
  const barsContainer = document.querySelector('#eval-bars');
  const axis = document.querySelector('#eval-axis');
  const tableBody = document.querySelector('#eval-table-body');
  const hoverTooltip = document.querySelector('#eval-hover-tooltip');
  const chartShell = document.querySelector('.eval-chart-shell');

  if (!taskStrip || !modelStrip || !barsContainer || !axis || !tableBody || !hoverTooltip || !chartShell) {
    return;
  }

  await loadHomeEvaluationFromCsv();
  if (!HOME_EVAL.tasks.length) {
    return;
  }

  renderFilters(taskStrip, modelStrip, barsContainer, tableBody, hoverTooltip, chartShell, axis);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderMarkdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${formatInlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join('')}</ul>`);
      listItems = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const titleClass = level === 3 ? 'title is-5' : level === 2 ? 'title is-4' : 'title is-3';
      blocks.push(`<h${level} class="${titleClass}">${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      return;
    }

    const listMatch = line.match(/^[*-]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  return blocks.join('\n');
}

async function loadMarkdownSection(selector, src) {
  const el = document.querySelector(selector);
  if (!el || !src) {
    return;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to load markdown: ${response.status}`);
    }

    const text = (await response.text()).trim();
    el.innerHTML = renderMarkdown(text);
  } catch (_err) {
    el.innerHTML = renderMarkdown(ENV_SETUP_FALLBACK_MD);
  }
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
document.addEventListener('DOMContentLoaded', () => {
  loadMarkdownSection('#env-setup-copy', 'lists/env_setup.md');
});
document.addEventListener('DOMContentLoaded', loadAbstract);
