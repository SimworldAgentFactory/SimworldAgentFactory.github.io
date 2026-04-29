(function () {
  'use strict';

  /* ── Module registry ─────────────────────────────────────── */

  const MODULES = {
    perception: {
      minigrid:          { label: 'MiniGrid (basic)',    import: 'from modules.perception import MiniGridPerceptionModule',                        init: 'MiniGridPerceptionModule()' },
      minigrid_relation: { label: 'MiniGrid (relation)', import: 'from modules.perception import MiniGridRelationPerceptionModule',                init: 'MiniGridRelationPerceptionModule()' },
      deliverybench:     { label: 'DeliveryBench',       import: 'from modules.perception.deliverybench_adapter import DeliveryBenchPerceptionModule', init: 'DeliveryBenchPerceptionModule()' },
      gym:               { label: 'Gym',                 import: 'from modules.perception import GymPerceptionModule',                             init: 'GymPerceptionModule()' },
      thor:              { label: 'THOR',                import: 'from modules.perception import THORPerceptionModule',                            init: 'THORPerceptionModule()' },
    },
    reasoning: {
      simple:        { label: 'Simple (no LLM)',  import: 'from modules.reasoning import SimpleReasoning',       llm: false, init: 'SimpleReasoning()' },
      llm:           { label: 'LLM direct',       import: 'from modules.reasoning import LLMReasoning',          llm: true,  init: 'LLMReasoning(llm_client=llm_client)' },
      react:         { label: 'ReAct',            import: 'from modules.reasoning import ReActReasoning',         llm: true,  init: 'ReActReasoning(llm_client=llm_client, max_iterations=10, enable_history=True)' },
      cot:           { label: 'Chain-of-Thought', import: 'from modules.reasoning import COTReasoning',           llm: true,  init: 'COTReasoning(llm_client=llm_client, max_iterations=5, enable_history=True)' },
      tot:           { label: 'Tree of Thoughts', import: 'from modules.reasoning import ToTReasoning',           llm: true,  init: 'ToTReasoning(llm_client=llm_client, search_strategy="BFS", evaluation_strategy="value")' },
      guided_search: { label: 'Guided Search',    import: 'from modules.reasoning import GuidedSearchReasoning',  llm: true,  init: 'GuidedSearchReasoning(llm_client=llm_client)' },
      rap:           { label: 'RAP (MCTS)',       import: 'from modules.reasoning import RAPReasoning',           llm: true,  init: 'RAPReasoning(llm_client=llm_client, num_iterations=10)' },
    },
    memory: {
      none:              { label: 'None',                      llm: false, import: null, init: null },
      minigrid:          { label: 'MiniGrid',                  llm: false, import: 'from modules.memory import MiniGridMemory',            init: 'MiniGridMemory(max_memories=50)' },
      bot:               { label: 'Buffer-of-Thought',         llm: false, import: 'from modules.memory import BufferOfThoughtMemory',     init: 'BufferOfThoughtMemory(max_size=100)' },
      graph:             { label: 'GraphContextMemory',        llm: false, import: 'from modules.memory import GraphContextMemory',        init: 'GraphContextMemory(max_memories=200)' },
      ace:               { label: 'ACE (Agentic Context)',     llm: true,  import: 'from modules.memory import AgenticContextEngine',      init: 'AgenticContextEngine(llm=llm_client)' },
      amem:              { label: 'A-Mem (Associative)',       llm: true,  import: 'from modules.memory import AMemModule, ChromaRetriever, LLMInterface', init: 'AMemModule(llm=LLMInterface(llm_client), retriever=ChromaRetriever())' },
      dynamic_cheatsheet:{ label: 'Dynamic Cheatsheet',       llm: true,  import: 'from modules.memory import DynamicCheatsheet',         init: 'DynamicCheatsheet(llm=llm_client)' },
      letta:             { label: 'Letta (Structured Blocks)', llm: false, import: 'from modules.memory import LettaEnvMemoryModule',      init: 'LettaEnvMemoryModule()' },
    },
    reflection: {
      none:        { label: 'None',        import: null, init: null },
      self_refine: { label: 'Self-Refine', import: 'from modules.reflection import SelfRefineReflection', init: 'SelfRefineReflection(llm_client=llm_client)' },
    },
  };

  /* ── DOM refs ─────────────────────────────────────────────── */

  const $ = (s) => document.querySelector(s);
  const els = {
    env:        $('#sel-env'),
    envName:    $('#sel-env-name'),
    envWrap:    $('#env-name-wrap'),
    perception: $('#sel-perception'),
    reasoning:  $('#sel-reasoning'),
    memory:     $('#sel-memory'),
    reflection: $('#sel-reflection'),
    codeOut:    $('#code-output'),
    gutter:     $('#line-numbers'),
    copyBtn:    $('#btn-copy'),
    copyInline: $('#btn-copy-inline'),
    dlBtn:      $('#btn-download'),
    startBtn:   $('#btn-start'),
  };

  let lastCode = '';

  /* ── Syntax highlighting ─────────────────────────────────── */

  function highlight(code) {
    code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tokens = [
      { name: 'str', re: /("""[^]*?"""|'[^']*'|"[^"]*")/ },
      { name: 'cmt', re: /(#[^\n]*)/ },
      { name: 'kw',  re: /\b(from|import|if|for|in|not|def|class|return|break|None|True|False|as|and|or)\b/ },
      { name: 'num', re: /\b(\d+)\b/ },
      { name: 'fn',  re: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/ },
    ];
    const re = new RegExp(tokens.map(t => t.re.source).join('|'), 'g');
    return code.replace(re, (...args) => {
      for (let i = 0; i < tokens.length; i++) {
        if (args[i + 1] !== undefined) return '<span class="' + tokens[i].name + '">' + args[0] + '</span>';
      }
      return args[0];
    });
  }

  /* ── Selections ──────────────────────────────────────────── */

  function sel() {
    return {
      env:        els.env.value,
      envName:    els.envName.value,
      perception: els.perception.value,
      reasoning:  els.reasoning.value,
      memory:     els.memory.value,
      reflection: els.reflection.value,
    };
  }

  function selectedText(el) {
    return el.options[el.selectedIndex]?.text || '';
  }

  /* ── Code generation ─────────────────────────────────────── */

  function genMiniGrid(s) {
    const perc = MODULES.perception[s.perception];
    const reas = MODULES.reasoning[s.reasoning];
    const mem  = MODULES.memory[s.memory];
    const refl = MODULES.reflection[s.reflection];
    const needsLLM = reas.llm || mem.llm || (refl.import !== null);
    const L = [];

    L.push('"""Generated agent setup — AgentFactory"""');
    L.push('import sys, os');
    L.push('');
    L.push('project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))');
    L.push('if project_root not in sys.path:');
    L.push('    sys.path.insert(0, project_root)');
    L.push('');
    L.push('import benchmarks.minigrid  # register adapter');
    L.push('from agents import EmbodiedAgent');
    L.push('from modules.adapters import get_adapter');
    L.push('');
    L.push('# ── Perception ──');
    L.push(perc.import);
    L.push('perception = ' + perc.init);
    L.push('');

    if (needsLLM) {
      L.push('# ── LLM client ──');
      L.push('from modules.llm import OpenAIClient');
      L.push('llm_client = OpenAIClient(');
      L.push('    api_key=os.getenv("OPENAI_API_KEY"),');
      L.push('    model="gpt-4o-mini",');
      L.push('    temperature=0.0,');
      L.push(')');
      L.push('');
    }

    L.push('# ── Reasoning ──');
    L.push(reas.import);
    L.push('reasoning = ' + reas.init);
    L.push('');
    L.push('# ── Memory ──');
    if (mem.import) { L.push(mem.import); L.push('memory = ' + mem.init); }
    else L.push('memory = None');
    L.push('');
    L.push('# ── Reflection ──');
    if (refl.import) { L.push(refl.import); L.push('reflection = ' + refl.init); }
    else L.push('reflection = None');
    L.push('');

    L.push('adapter = get_adapter("minigrid")');
    L.push('agent = EmbodiedAgent(');
    L.push('    perception=perception,');
    L.push('    reasoning=reasoning,');
    L.push('    memory=memory,');
    L.push('    reflection=reflection,');
    L.push('    adapter=adapter,');
    L.push('    env_id="' + s.envName + '"');
    L.push(')');
    L.push('');
    L.push('agent.run()');
    return L.join('\n');
  }

  function genDeliveryBench(s) {
    const METHOD_MAP = { simple:'simple', llm:'llm', react:'react', cot:'cot', tot:'tot', guided_search:'guided_search', rap:'rap' };
    const m = METHOD_MAP[s.reasoning] || 'react';
    const L = [];
    L.push('"""Generated agent setup — DeliveryBench task"""');
    L.push('# python examples/deliverybench_example.py --reasoning-method ' + m + ' --model gpt-4o-mini');
    L.push('');
    L.push('import sys, os');
    L.push('');
    L.push('project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))');
    L.push('if project_root not in sys.path:');
    L.push('    sys.path.insert(0, project_root)');
    L.push('');
    L.push('from agents import EmbodiedAgent');
    L.push('from benchmarks.simworld.deliverybench_wrapper import DeliveryBenchEnvironment');
    L.push('from modules.perception.deliverybench_adapter import DeliveryBenchPerceptionModule');
    L.push('');
    L.push('perception = DeliveryBenchPerceptionModule()');
    L.push('');
    L.push('if __name__ == "__main__":');
    L.push('    import subprocess');
    L.push('    ex = os.path.join(project_root, "examples", "deliverybench_example.py")');
    L.push('    subprocess.run([sys.executable, ex, "--reasoning-method", "' + m + '"])');
    return L.join('\n');
  }

  function generate() {
    const s = sel();
    const code = s.env === 'deliverybench' ? genDeliveryBench(s) : genMiniGrid(s);
    lastCode = code;
    els.codeOut.innerHTML = highlight(code);

    const lines = code.split('\n').length;
    els.gutter.innerHTML = Array.from({ length: lines }, (_, i) => '<div>' + (i + 1) + '</div>').join('');
  }

  /* ── Update UI panels ────────────────────────────────────── */

  function updateMap() {
    const s = sel();
    const envText = selectedText(els.env);
    const envNameText = selectedText(els.envName);

    $('#map-env').textContent = envText;
    const envSub = $('#map-env-sub');
    if (s.env === 'deliverybench') { envSub.textContent = ''; }
    else { envSub.textContent = envNameText; }

    $('#map-perc').textContent = selectedText(els.perception);
    const reasText = selectedText(els.reasoning);
    const reasParts = reasText.match(/^(.+?)(\s*\(.+\))?$/);
    $('#map-reas').textContent = reasParts ? reasParts[1] : reasText;
    const reasSub = $('#map-reas-sub');
    reasSub.textContent = reasParts && reasParts[2] ? reasParts[2].trim() : '';

    $('#map-mem').textContent = selectedText(els.memory);
    $('#map-refl').textContent = selectedText(els.reflection);
  }

  function updateSummary() {
    const s = sel();
    const envText = selectedText(els.env);
    const envNameText = selectedText(els.envName);

    $('#sum-env').textContent = s.env === 'deliverybench' ? 'DeliveryBench' : envText + ' (' + envNameText + ')';
    $('#sum-perc').textContent = selectedText(els.perception);
    $('#sum-reas').textContent = selectedText(els.reasoning);
    $('#sum-mem').textContent = selectedText(els.memory);
    $('#sum-refl').textContent = selectedText(els.reflection);

    $('#setup-env-name').textContent = s.env === 'deliverybench' ? 'DeliveryBench' : envNameText;
  }

  function refresh() {
    generate();
    updateMap();
    updateSummary();
  }

  /* ── Actions ─────────────────────────────────────────────── */

  function copyCode(btn) {
    navigator.clipboard.writeText(lastCode).then(() => {
      btn.classList.add('is-copied');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('is-copied'); }, 1500);
    });
  }

  function downloadCode() {
    const blob = new Blob([lastCode], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'generated_agent.py';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── Observation card ──────────────────────────────────────── */

  function loadObservation() {
    fetch('data/obv_demo.json')
      .then(r => r.json())
      .then(data => renderObservation(data.observation_summary))
      .catch(() => {});
  }

  function renderObservation(obs) {
    const recovery = $('#obv-recovery');
    const diag = $('#obv-diagnostic');
    const stepsEl = $('#obv-steps');
    if (!recovery || !obs) return;

    recovery.textContent = obs.recovery_type.replace(/_/g, ' ');
    diag.textContent = obs.diagnostic_action;

    stepsEl.innerHTML = '';
    obs.steps.forEach(s => {
      const detail = s.payload || s.result || s.target || '';
      const div = document.createElement('div');
      div.className = 'pg-obv-step pg-obv-step--' + s.status;
      div.innerHTML =
        '<div class="pg-obv-step-head">' +
          '<span class="pg-obv-step-num">Step ' + s.step + '</span>' +
          '<span class="pg-obv-step-badge">' + s.status.replace(/_/g, ' ') + '</span>' +
        '</div>' +
        '<div class="pg-obv-step-action">' + s.action.replace(/_/g, ' ') + '</div>' +
        (detail ? '<div class="pg-obv-step-detail">' + detail + '</div>' : '');
      stepsEl.appendChild(div);
    });
  }

  /* ── Init ────────────────────────────────────────────────── */

  function init() {
    [els.env, els.envName, els.perception, els.reasoning, els.memory, els.reflection].forEach(
      (el) => el.addEventListener('change', refresh)
    );

    els.env.addEventListener('change', () => {
      els.envWrap.classList.toggle('is-hidden', els.env.value === 'deliverybench');
    });

    els.copyBtn.addEventListener('click', () => copyCode(els.copyBtn));
    els.copyInline.addEventListener('click', () => copyCode(els.copyInline));
    els.dlBtn.addEventListener('click', downloadCode);

    refresh();
    loadObservation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
