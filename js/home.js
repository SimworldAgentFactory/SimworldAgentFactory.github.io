const MODEL_ALL = '__all__';
const TASK_ORDER = [
  'DeliveryBench',
  'RoboTHOR',
  'ALFRED',
  'MiniGrid',
];
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
const ENV_SETUP_FALLBACK_MD = `AgentFactory is evaluated across four diverse benchmarks that test long-horizon planning, spatial reasoning, and resource management. Each environment is integrated into a unified runner so modular agent configurations can be compared under the same evaluation protocol.

# Dataset Description

To evaluate embodied intelligence across diverse modalities, we select **DeliveryBench**, **MiniGrid**, **ALFRED**, and **RoboTHOR** as our core benchmarks. These environments require a mix of perception, state tracking, planning, and action selection, but they differ substantially in horizon length and scene complexity.

**DeliveryBench** is a city-scale embodied benchmark where agents operate as autonomous food couriers in procedurally generated urban environments. It emphasizes sustained operational efficiency under realistic constraints.

Task Setting: Agents must maximize profit by selecting lucrative orders, navigating to restaurants and customer locations, and managing finite resources such as time, energy, and transportation costs.
Metrics:
* Hourly Profit (Primary): Net earnings generated per hour of operation.
* Secondary Diagnostics: Order quality, time efficiency, on-time delivery rates, and resource utilization indicators.

**MiniGrid** provides a suite of grid-world tasks designed to test navigation, object interaction, and compositional reasoning in partially observable environments.

Task Setting: Evaluation spans ten distinct tasks ranging from simple navigation to hazardous crossing and multi-room exploration. Agents receive first-person RGB observations and textual prompts under a fixed step budget.
Metrics:
* Success Rate (SR): The percentage of episodes where the agent reaches the goal.
* Step Efficiency: The number of steps taken to complete the task relative to the budget.

**ALFRED** focuses on domestic task completion through multimodal observations and long-horizon interaction.

Task Setting: The benchmark includes seven representative tasks covering pick-and-place, heating and cooling, and cleaning. The agent perceives RGB frames and a structured list of visible objects within a limited field of view.
Metrics:
* Task Completion: Successful execution of the multi-step instruction.
* State Consistency: Ability to maintain task-relevant focus across state-dependent reasoning requirements.

**RoboTHOR** evaluates agents in indoor 3D environments where they must navigate to a target object category from a first-person perspective.

Task Setting: Agents use a discrete action space and must explicitly issue a stop command upon reaching the target within a distance threshold.
Metrics:
* Success Rate (SR): Percentage of episodes where the agent stops within the success threshold.
* Success weighted by Path Length (SPL): A measure of path efficiency.`;

function getTaskById(taskId) {
  return HOME_EVAL.tasks.find((task) => task.id === taskId) || HOME_EVAL.tasks[0] || null;
}

function getOrderedTasks(tasks) {
  const taskMap = new Map((tasks || []).map((task) => [task.id, task]));
  return TASK_ORDER.map((taskId) => taskMap.get(taskId) || { id: taskId, label: taskId });
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

  if (!results.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="5" class="has-text-centered has-text-grey">
        No evaluation rows available for ${task?.label || taskId}.
      </td>
    `;
    tableBodyEl.appendChild(tr);
    return;
  }

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
  containerEl.className = 'eval-bars-table';

  if (!results.length) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'eval-empty-state';
    emptyEl.textContent = `No evaluation rows available for ${task?.label || taskId}.`;
    containerEl.appendChild(emptyEl);
    const axis = document.querySelector('#eval-axis');
    if (axis) axis.style.display = 'none';
    const axisRow = containerEl.closest('.eval-chart-shell')?.querySelector('.eval-axis-row');
    if (axisRow) axisRow.style.display = 'none';
    return;
  }

  results.forEach((entry) => {
    const displayScore = Number(entry.score).toFixed(1);
    const pct = Math.max(0, Math.min(100, (entry.score / maxValue) * 100));

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'eval-bar-row';
    row.setAttribute('aria-label', `${entry.model} performance ${entry.score.toFixed(1)}`);
    row.innerHTML = `
      <span class="eval-bar-label">${entry.model}</span>
      <span class="eval-bar-track">
        <span class="eval-bar-fill" style="width: ${pct}%; background: ${getBarColor(entry.score, maxValue)}"></span>
        <span class="eval-bar-end">${displayScore}</span>
      </span>
    `;

    const show = (event) => showTooltip(tooltipEl, shellEl, row, entry, task.label, event?.clientX);
    row.addEventListener('mouseenter', show);
    row.addEventListener('mousemove', show);
    row.addEventListener('focus', show);
    row.addEventListener('blur', () => hideTooltip(tooltipEl));
    row.addEventListener('mouseleave', () => hideTooltip(tooltipEl));
    row.addEventListener('click', show);
    containerEl.appendChild(row);
  });

  const axis = document.querySelector('#eval-axis');
  if (axis) axis.style.display = 'block';
  const axisRow = containerEl.closest('.eval-chart-shell')?.querySelector('.eval-axis-row');
  if (axisRow) axisRow.style.display = 'grid';
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
      HOME_EVAL = {
        ...csvEval,
        tasks: getOrderedTasks(csvEval.tasks),
      };
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
