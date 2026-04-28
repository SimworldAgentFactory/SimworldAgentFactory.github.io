/**
 * coverage-tree.js
 * Renders the AgentFactory module coverage tree.
 *
 * Responsibilities:
 *  - Build the tree DOM from COVERAGE_TREE_DATA
 *  - Draw SVG connector lines (root → horizontal bar → branch stems → leaf stems)
 *  - Trigger entrance animation when the shell scrolls into view
 *  - Re-draw SVG on resize (debounced)
 */

(function () {
  'use strict';

  /* ── Data ──────────────────────────────────────────────────── */

  const COVERAGE_TREE_DATA = [
    {
      id: 'perception',
      label: 'Perception',
      leaves: [],
    },
    {
      id: 'memory',
      label: 'Memory',
      leaves: [
        'Buffer & Short-Term Context Memory',
        'Structured / Database-Driven Memory',
        'Hierarchical & Graph-Based Memory',
        'Semantic Retrieval Based Memory',
      ],
    },
    {
      id: 'reasoning',
      label: 'Reasoning',
      leaves: [
        'Linear or Stepwise Reasoning',
        'Search-Based / Tree',
        'Multi-Agent Reasoning',
      ],
    },
    {
      id: 'reflection',
      label: 'Reflection',
      leaves: [
        'Step-Level Iterative Refinement',
        'Experience-Driven Reflection',
      ],
    },
    {
      id: 'rl',
      label: 'RL',
      leaves: [],
    },
  ];

  /* ── DOM builder ───────────────────────────────────────────── */

  function buildTree(shell) {
    shell.setAttribute('role', 'tree');
    shell.setAttribute('aria-label', 'AgentFactory module coverage tree');

    /* Root node */
    const rootRow = document.createElement('div');
    rootRow.className = 'ctree-root-row';

    const rootNode = document.createElement('div');
    rootNode.className = 'ctree-node ctree-node--root';
    rootNode.setAttribute('role', 'treeitem');
    rootNode.textContent = 'Base Agent';
    rootRow.appendChild(rootNode);
    shell.appendChild(rootRow);

    /* SVG layer (drawn after layout) */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    /* SVG elements expose className as a read-only SVGAnimatedString, so set via attribute */
    svg.setAttribute('class', 'ctree-svg');
    svg.setAttribute('aria-hidden', 'true');
    shell.appendChild(svg);

    /* Branch row */
    const branchRow = document.createElement('div');
    branchRow.className = 'ctree-branch-row';
    branchRow.setAttribute('role', 'group');

    COVERAGE_TREE_DATA.forEach((branch) => {
      const col = document.createElement('div');
      col.className = 'ctree-col';
      col.dataset.branch = branch.id;

      const branchNode = document.createElement('div');
      branchNode.className = 'ctree-node ctree-node--branch';
      branchNode.setAttribute('role', 'treeitem');
      branchNode.setAttribute('aria-expanded', branch.leaves.length > 0 ? 'true' : undefined);
      branchNode.textContent = branch.label;
      col.appendChild(branchNode);

      if (branch.leaves.length > 0) {
        const leavesWrap = document.createElement('div');
        leavesWrap.className = 'ctree-leaves';
        leavesWrap.setAttribute('role', 'group');

        branch.leaves.forEach((leafText, i) => {
          const leaf = document.createElement('div');
          leaf.className = 'ctree-node ctree-node--leaf';
          leaf.setAttribute('role', 'treeitem');
          leaf.style.setProperty('--leaf-index', i);
          leaf.textContent = leafText;
          leavesWrap.appendChild(leaf);
        });

        col.appendChild(leavesWrap);
      }

      branchRow.appendChild(col);
    });

    shell.appendChild(branchRow);
  }

  /* ── SVG connector drawing ─────────────────────────────────── */

  function getCenter(el, container) {
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    return {
      x: elRect.left - cRect.left + elRect.width / 2,
      y: elRect.top - cRect.top + elRect.height / 2,
      top: elRect.top - cRect.top,
      bottom: elRect.top - cRect.top + elRect.height,
      left: elRect.left - cRect.left,
      right: elRect.left - cRect.left + elRect.width,
    };
  }

  function drawConnectors(shell) {
    const svg = shell.querySelector('.ctree-svg');
    if (!svg) return;

    svg.innerHTML = '';

    const shellRect = shell.getBoundingClientRect();
    svg.setAttribute('width', shellRect.width);
    svg.setAttribute('height', shellRect.height);
    svg.style.width = shellRect.width + 'px';
    svg.style.height = shellRect.height + 'px';

    const rootNode = shell.querySelector('.ctree-node--root');
    const branchNodes = Array.from(shell.querySelectorAll('.ctree-col .ctree-node--branch'));
    const cols = Array.from(shell.querySelectorAll('.ctree-col'));

    if (!rootNode || branchNodes.length === 0) return;

    const STROKE = 'rgba(148,163,184,0.72)';
    const STROKE_W = '1.8';
    const R = 4; /* corner radius on elbows */

    const root = getCenter(rootNode, shell);
    const rootBottomY = root.bottom;

    /* Gather branch top-center positions */
    const branchTops = branchNodes.map((n) => getCenter(n, shell));

    /* Horizontal bus Y = midpoint between root bottom and branch tops */
    const branchAvgTopY = branchTops.reduce((s, b) => s + b.top, 0) / branchTops.length;
    const busY = rootBottomY + (branchAvgTopY - rootBottomY) * 0.52;

    /* Root stem: root bottom → busY */
    appendLine(svg, root.x, rootBottomY, root.x, busY, STROKE, STROKE_W);

    /* Horizontal bus: leftmost branch x to rightmost branch x */
    const busX1 = branchTops[0].x;
    const busX2 = branchTops[branchTops.length - 1].x;
    appendLine(svg, busX1, busY, busX2, busY, STROKE, STROKE_W);

    /* Branch stems: busY → branch node top */
    branchTops.forEach((b) => {
      appendLine(svg, b.x, busY, b.x, b.top, STROKE, STROKE_W);
    });

    /* Leaf connector lines per col */
    cols.forEach((col) => {
      const branchEl = col.querySelector('.ctree-node--branch');
      const leavesEl = col.querySelector('.ctree-leaves');
      if (!leavesEl) return;

      const leafNodes = Array.from(leavesEl.querySelectorAll('.ctree-node--leaf'));
      if (leafNodes.length === 0) return;

      const branchPos = getCenter(branchEl, shell);
      const branchBottomY = branchPos.bottom;

      /* Vertical spine from branch bottom to last leaf mid */
      const leafPositions = leafNodes.map((l) => getCenter(l, shell));
      const spineX = branchPos.x;
      const spineTopY = branchBottomY;
      const spineBottomY = leafPositions[leafPositions.length - 1].y;

      appendLine(svg, spineX, spineTopY, spineX, spineBottomY, STROKE, STROKE_W);

      /* Horizontal tick to each leaf */
      leafPositions.forEach((lp) => {
        appendLine(svg, spineX, lp.y, lp.left, lp.y, STROKE, STROKE_W);
      });
    });
  }

  function appendLine(svg, x1, y1, x2, y2, stroke, strokeWidth) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', strokeWidth);
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }

  /* ── Intersection observer (entrance animation) ────────────── */

  function observeEntrance(shell) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const reveal = () => {
      shell.classList.add('is-visible');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => drawConnectors(shell));
      });
    };

    if (prefersReduced || !('IntersectionObserver' in window)) {
      reveal();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal();
          io.unobserve(shell);
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );

    io.observe(shell);

    /* Fallback: if already in viewport on load (e.g. large screens), reveal immediately */
    requestAnimationFrame(() => {
      const rect = shell.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        reveal();
        io.unobserve(shell);
      }
    });
  }

  /* ── Resize handling ───────────────────────────────────────── */

  function attachResizeHandler(shell) {
    let debounceTimer = null;
    const handler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => drawConnectors(shell), 120);
    };
    window.addEventListener('resize', handler, { passive: true });
  }

  /* ── Init ──────────────────────────────────────────────────── */

  function init() {
    const shell = document.querySelector('[data-coverage-tree]');
    if (!shell) return;

    /* Clear any static/fallback HTML — JS owns this DOM */
    shell.innerHTML = '';
    shell.classList.add('ctree-shell'); /* idempotent if already in HTML */

    buildTree(shell);
    observeEntrance(shell);
    attachResizeHandler(shell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* Script loaded after parse — run on next frame so layout is ready */
    requestAnimationFrame(init);
  }
})();
