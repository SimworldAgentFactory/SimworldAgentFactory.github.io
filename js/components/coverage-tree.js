(function () {
  'use strict';

  /* ── Data (mirrors map/methods.js) ──────────────────────────── */

  const TREE_DATA = [
    {
      id: 'perception',
      label: 'Perception',
      categories: [
        {
          id: 'unified_agent_input',
          label: 'UnifiedAgent Input',
          icon: '⤵',
          methods: [
            { label: 'State Map', icon: '🗺' },
            { label: 'Action Schema', icon: '🔗' },
            { label: 'Image', icon: '🖼' },
            { label: 'Text Summary', icon: '📄' },
          ],
        },
      ],
    },
    {
      id: 'memory',
      label: 'Memory',
      categories: [
        { id: 'buffer_short_term', label: 'Buffer & Short-Term Context Memory', methods: ['Base', 'Buffer of Thought', 'SimpleMem'] },
        { id: 'structured_database', label: 'Structured / Database-Driven Memory', methods: ['ChatDB', 'MemoryBank', 'MemGPT'] },
        { id: 'hierarchical_graph', label: 'Hierarchical & Graph-Based Memory', methods: ['GMemory', 'CAM', 'Zep'] },
        { id: 'semantic_embedding_retrieval', label: 'Semantic Retrieval Based Memory', methods: ['A-Mem', 'LightMem', 'Mem0', 'Generative Agent Memory'] },
        { id: 'curated_reflective', label: 'Curated & Reflective Memory', methods: ['ACE', 'Dynamic Cheatsheet', 'OpenClaw', 'MIRIX'] },
        { id: 'framework_infrastructure', label: 'Framework & Infrastructure', methods: ['LangMem'] },
      ],
    },
    {
      id: 'reasoning',
      label: 'Reasoning',
      categories: [
        { id: 'sequential_decomposition_acting', label: 'Sequential Decomposition & Acting', methods: ['ReAct', 'Chain-of-Thought', 'Plan-and-Solve'] },
        { id: 'search_tree_exploration', label: 'Search / Tree Exploration', methods: ['Tree of Thoughts', 'LATS', 'RAP'] },
        { id: 'ensemble_multi_agent', label: 'Ensemble / Multi-Agent', methods: ['Self-Consistency', 'MAD'] },
      ],
    },
    {
      id: 'reflection',
      label: 'Reflection',
      categories: [
        { id: 'step_level_refinement', label: 'Step-Level Refinement', methods: ['Self-Refine', 'Reflexion'] },
        { id: 'trajectory_level_learning', label: 'Trajectory-Level Learning', methods: ['Retroformer', 'Reflexion'] },
        { id: 'failure_aware_learning', label: 'Failure-Aware Learning', methods: ['Reflexion', 'Retroformer', 'ACE'] },
      ],
    },
    { id: 'rl', label: 'RL', categories: [] },
  ];

  /* ── State ── */

  let state = { expandedBranch: null, expandedCategories: new Set() };

  /* ── Helpers ── */

  function mk(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function pos(el, container) {
    const r = el.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    return {
      x: r.left - c.left + r.width / 2,
      y: r.top - c.top + r.height / 2,
      top: r.top - c.top,
      bottom: r.top - c.top + r.height,
      left: r.left - c.left,
    };
  }

  /* ── DOM builder ── */

  function buildTree(shell) {
    shell.setAttribute('role', 'tree');
    shell.setAttribute('aria-label', 'AgentFactory module coverage tree');

    const rootRow = mk('div', 'ctree-root-row');
    const rootNode = mk('div', 'ctree-node ctree-node--root');
    rootNode.setAttribute('role', 'treeitem');

    const rootImg = document.createElement('img');
    rootImg.src = 'assests/base_agent.png';
    rootImg.alt = '';
    rootImg.className = 'ctree-root-icon';
    rootImg.width = 28;
    rootImg.height = 28;
    rootImg.setAttribute('decoding', 'async');
    rootNode.appendChild(rootImg);

    const rootLabel = document.createElement('span');
    rootLabel.textContent = 'Base Agent';
    rootNode.appendChild(rootLabel);

    rootRow.appendChild(rootNode);
    shell.appendChild(rootRow);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ctree-svg');
    svg.setAttribute('aria-hidden', 'true');
    shell.appendChild(svg);

    const branchRow = mk('div', 'ctree-branch-row');
    branchRow.setAttribute('role', 'group');

    TREE_DATA.forEach((branch) => {
      const col = mk('div', 'ctree-col');
      col.dataset.branch = branch.id;

      const node = mk('div', 'ctree-node ctree-node--branch');
      node.setAttribute('role', 'treeitem');
      node.textContent = branch.label;

      if (branch.categories.length) {
        node.classList.add('ctree-node--expandable');
        node.setAttribute('aria-expanded', 'false');
        node.addEventListener('click', () => toggleBranch(shell, branch.id));
      }

      col.appendChild(node);
      branchRow.appendChild(col);
    });

    shell.appendChild(branchRow);
    shell.appendChild(mk('div', 'ctree-expand-area'));
  }

  /* ── Expand / Collapse ── */

  function toggleBranch(shell, id) {
    state.expandedBranch = state.expandedBranch === id ? null : id;
    state.expandedCategories.clear();
    syncBranches(shell);
    renderExpand(shell);
    scheduleRedraw(shell);
  }

  function toggleCategory(shell, id) {
    if (state.expandedCategories.has(id)) {
      state.expandedCategories.delete(id);
    } else {
      state.expandedCategories.add(id);
    }
    syncCategories(shell);
    scheduleRedraw(shell);
  }

  function syncBranches(shell) {
    shell.querySelectorAll('.ctree-node--branch').forEach((n) => {
      const bid = n.closest('.ctree-col')?.dataset.branch;
      const active = bid === state.expandedBranch;
      n.classList.toggle('is-expanded', active);
      if (n.classList.contains('ctree-node--expandable')) {
        n.setAttribute('aria-expanded', active ? 'true' : 'false');
      }
    });
  }

  function syncCategories(shell) {
    shell.querySelectorAll('.ctree-cat-col').forEach((col) => {
      const catId = col.dataset.category;
      const open = state.expandedCategories.has(catId);
      const node = col.querySelector('.ctree-node--leaf');
      const methods = col.querySelector('.ctree-methods');

      if (node) {
        node.classList.toggle('is-expanded', open);
        if (node.classList.contains('ctree-node--expandable')) {
          node.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
      }
      if (methods) {
        if (open) {
          methods.style.display = 'flex';
          methods.querySelectorAll('.ctree-node--method').forEach((m, i) => {
            m.style.animation = 'none';
            void m.offsetHeight;
            m.style.animation =
              'ctree-node-in 0.3s cubic-bezier(0.22,1,0.36,1) ' + (i * 0.04) + 's both';
          });
        } else {
          methods.style.display = 'none';
        }
      }
    });
  }

  function renderExpand(shell) {
    const area = shell.querySelector('.ctree-expand-area');
    area.innerHTML = '';
    area.classList.remove('is-open');

    if (!state.expandedBranch) return;

    const branch = TREE_DATA.find((b) => b.id === state.expandedBranch);
    if (!branch || !branch.categories.length) return;

    const arrow = mk('div', 'ctree-expand-arrow');
    area.appendChild(arrow);

    const catRow = mk('div', 'ctree-cat-row');

    branch.categories.forEach((cat, i) => {
      const col = mk('div', 'ctree-cat-col');
      col.dataset.category = cat.id;

      const node = mk('div', 'ctree-node ctree-node--leaf');
      node.setAttribute('role', 'treeitem');
      if (cat.icon) {
        const ico = mk('span', 'ctree-icon');
        ico.textContent = cat.icon;
        node.appendChild(ico);
      }
      node.appendChild(document.createTextNode(cat.label));
      node.style.setProperty('--cat-index', i);

      if (cat.methods.length) {
        node.classList.add('ctree-node--expandable');
        node.setAttribute('aria-expanded', 'false');
        node.addEventListener('click', () => toggleCategory(shell, cat.id));
      }

      col.appendChild(node);

      if (cat.methods.length) {
        const wrap = mk('div', 'ctree-methods');
        wrap.style.display = 'none';
        cat.methods.forEach((m) => {
          const mNode = mk('div', 'ctree-node ctree-node--method');
          const mLabel = typeof m === 'string' ? m : m.label;
          const mIcon = typeof m === 'object' ? m.icon : null;
          if (mIcon) {
            const ico = mk('span', 'ctree-icon');
            ico.textContent = mIcon;
            mNode.appendChild(ico);
          }
          mNode.appendChild(document.createTextNode(mLabel));
          wrap.appendChild(mNode);
        });
        col.appendChild(wrap);
      }

      catRow.appendChild(col);
    });

    area.appendChild(catRow);

    void area.offsetHeight;
    area.classList.add('is-open');
    positionArrow(shell);
  }

  function positionArrow(shell) {
    const arrow = shell.querySelector('.ctree-expand-arrow');
    if (!arrow || !state.expandedBranch) return;

    const branchNode = shell.querySelector(
      '[data-branch="' + state.expandedBranch + '"] .ctree-node--branch'
    );
    if (!branchNode) return;

    const sr = shell.getBoundingClientRect();
    const br = branchNode.getBoundingClientRect();
    arrow.style.left = (br.left - sr.left + br.width / 2) + 'px';
  }

  function scheduleRedraw(shell) {
    requestAnimationFrame(() => {
      positionArrow(shell);
      requestAnimationFrame(() => {
        drawConnectors(shell);
        setTimeout(() => drawConnectors(shell), 350);
      });
    });
  }

  /* ── SVG connectors ── */

  function drawConnectors(shell) {
    const svg = shell.querySelector('.ctree-svg');
    if (!svg) return;
    svg.innerHTML = '';

    const sr = shell.getBoundingClientRect();
    svg.setAttribute('width', sr.width);
    svg.setAttribute('height', sr.height);
    svg.style.width = sr.width + 'px';
    svg.style.height = sr.height + 'px';

    const S = 'rgba(148,163,184,0.72)';
    const W = '1.8';

    const rootEl = shell.querySelector('.ctree-node--root');
    const branchEls = Array.from(shell.querySelectorAll('.ctree-col .ctree-node--branch'));
    if (!rootEl || !branchEls.length) return;

    const root = pos(rootEl, shell);
    const branches = branchEls.map((e) => pos(e, shell));

    const busY = root.bottom + (branches[0].top - root.bottom) * 0.52;
    ln(svg, root.x, root.bottom, root.x, busY, S, W);
    ln(svg, branches[0].x, busY, branches[branches.length - 1].x, busY, S, W);
    branches.forEach((b) => ln(svg, b.x, busY, b.x, b.top, S, W));

    if (!state.expandedBranch) return;

    const activeBranch = shell.querySelector(
      '[data-branch="' + state.expandedBranch + '"] .ctree-node--branch'
    );
    const catLeaves = Array.from(shell.querySelectorAll('.ctree-cat-col .ctree-node--leaf'));
    if (!activeBranch || !catLeaves.length) return;

    const bp = pos(activeBranch, shell);
    const cats = catLeaves.map((e) => pos(e, shell));

    const catBusY = bp.bottom + (cats[0].top - bp.bottom) * 0.5;
    ln(svg, bp.x, bp.bottom, bp.x, catBusY, S, W);
    if (cats.length > 1) {
      ln(svg, cats[0].x, catBusY, cats[cats.length - 1].x, catBusY, S, W);
    }
    cats.forEach((c) => ln(svg, c.x, catBusY, c.x, c.top, S, W));

    state.expandedCategories.forEach((catId) => {
      const col = shell.querySelector('[data-category="' + catId + '"]');
      if (!col) return;
      const catEl = col.querySelector('.ctree-node--leaf');
      const mNodes = Array.from(col.querySelectorAll('.ctree-node--method'));
      if (!catEl || !mNodes.length) return;

      const cp = pos(catEl, shell);
      const methods = mNodes.map((e) => pos(e, shell));
      ln(svg, cp.x, cp.bottom, cp.x, methods[methods.length - 1].y, S, W);
      methods.forEach((m) => ln(svg, cp.x, m.y, m.left, m.y, S, W));
    });
  }

  function ln(svg, x1, y1, x2, y2, stroke, sw) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1);
    l.setAttribute('y1', y1);
    l.setAttribute('x2', x2);
    l.setAttribute('y2', y2);
    l.setAttribute('stroke', stroke);
    l.setAttribute('stroke-width', sw);
    l.setAttribute('stroke-linecap', 'round');
    svg.appendChild(l);
  }

  /* ── Entrance animation ── */

  function observeEntrance(shell) {
    const reveal = () => {
      shell.classList.add('is-visible');
      requestAnimationFrame(() => requestAnimationFrame(() => drawConnectors(shell)));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) {
      reveal();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          reveal();
          io.unobserve(shell);
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(shell);

    requestAnimationFrame(() => {
      const r = shell.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        reveal();
        io.unobserve(shell);
      }
    });
  }

  /* ── Resize ── */

  function attachResize(shell) {
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        positionArrow(shell);
        drawConnectors(shell);
      }, 120);
    }, { passive: true });
  }

  /* ── Init ── */

  function init() {
    const shell = document.querySelector('[data-coverage-tree]');
    if (!shell) return;
    shell.innerHTML = '';
    shell.classList.add('ctree-shell');
    buildTree(shell);
    observeEntrance(shell);
    attachResize(shell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();
