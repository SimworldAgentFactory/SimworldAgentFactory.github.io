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
    simple:        { label: 'Simple (no LLM)',  import: 'from modules.reasoning import SimpleReasoning',                        llm: false, init: 'SimpleReasoning()' },
    llm:           { label: 'LLM direct',       import: 'from modules.reasoning import LLMReasoning',                          llm: true,  init: 'LLMReasoning(llm_client=llm_client)' },
    react:         { label: 'ReAct',            import: 'from modules.reasoning import ReActReasoning',                         llm: true,  init: 'ReActReasoning(llm_client=llm_client, max_iterations=10, enable_history=True)' },
    cot:           { label: 'Chain-of-Thought', import: 'from modules.reasoning import COTReasoning',                           llm: true,  init: 'COTReasoning(llm_client=llm_client, max_iterations=5, enable_history=True)' },
    tot:           { label: 'Tree of Thoughts', import: 'from modules.reasoning import ToTReasoning',                           llm: true,  init: 'ToTReasoning(llm_client=llm_client, search_strategy="BFS", evaluation_strategy="value")' },
    guided_search: { label: 'Guided Search',    import: 'from modules.reasoning import GuidedSearchReasoning',                  llm: true,  init: 'GuidedSearchReasoning(llm_client=llm_client)' },
    rap:           { label: 'RAP (MCTS)',       import: 'from modules.reasoning import RAPReasoning',                           llm: true,  init: 'RAPReasoning(llm_client=llm_client, num_iterations=10)' },
  },
  memory: {
    none:              { label: 'None',                      llm: false, import: null,                                                                   init: null },
    minigrid:          { label: 'MiniGrid',                  llm: false, import: 'from modules.memory import MiniGridMemory',                            init: 'MiniGridMemory(max_memories=50)' },
    bot:               { label: 'Buffer-of-Thought',         llm: false, import: 'from modules.memory import BufferOfThoughtMemory',                     init: 'BufferOfThoughtMemory(max_size=100)' },
    graph:             { label: 'GraphContextMemory',        llm: false, import: 'from modules.memory import GraphContextMemory',                        init: 'GraphContextMemory(max_memories=200)' },
    ace:               { label: 'ACE (Agentic Context)',     llm: true,  import: 'from modules.memory import AgenticContextEngine',                      init: 'AgenticContextEngine(llm=llm_client)' },
    amem:              { label: 'A-Mem (Associative)',       llm: true,  import: 'from modules.memory import AMemModule, ChromaRetriever, LLMInterface', init: 'AMemModule(llm=LLMInterface(llm_client), retriever=ChromaRetriever())' },
    dynamic_cheatsheet:{ label: 'Dynamic Cheatsheet',       llm: true,  import: 'from modules.memory import DynamicCheatsheet',                        init: 'DynamicCheatsheet(llm=llm_client)' },
    letta:             { label: 'Letta (Structured Blocks)', llm: false, import: 'from modules.memory import LettaEnvMemoryModule',                     init: 'LettaEnvMemoryModule()' },
  },
  reflection: {
    none:        { label: 'None',        import: null,                                                 init: null },
    self_refine: { label: 'Self-Refine', import: 'from modules.reflection import SelfRefineReflection', init: 'SelfRefineReflection(llm_client=llm_client)' },
  },
};

/* ── DOM refs ────────────────────────────────────────────── */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  env:         $('#sel-env'),
  envName:     $('#sel-env-name'),
  envNameWrap: $('#env-name-wrap'),
  perception:  $('#sel-perception'),
  reasoning:   $('#sel-reasoning'),
  memory:      $('#sel-memory'),
  reflection:  $('#sel-reflection'),
  generateBtn: $('#btn-generate'),
  codeSection: $('#code-section'),
  codeBlockPython: $('#code-output'),
  codeBlockShell:  $('#shell-output'),
  lineNumbersPython: $('#line-numbers-python'),
  lineNumbersShell:  $('#line-numbers-shell'),
  displayPython: $('#display-python'),
  displayShell:  $('#display-shell'),
  tabs:          $$('.code-tab'),
  copyBtn:     $('#btn-copy'),
  downloadBtn: $('#btn-download'),
  statusText:  $('#status-text'),
};

/* ── Helpers ─────────────────────────────────────────────── */

function val(el) { return el.value; }

function getSelections() {
  return {
    env:        val(els.env),
    envName:    val(els.envName),
    perception: val(els.perception),
    reasoning:  val(els.reasoning),
    memory:     val(els.memory),
    reflection: val(els.reflection),
  };
}

function flashStatus(msg) {
  els.statusText.textContent = msg;
  els.statusText.classList.add('visible');
  clearTimeout(flashStatus._t);
  flashStatus._t = setTimeout(() => els.statusText.classList.remove('visible'), 2000);
}

/* ── Syntax highlighting───────────────────── */

function highlight(code) {
  // 1. Escape HTML
  code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 2. Define token types and their regexes
  const tokens = [
    { name: 'str', re: /("""[^]*?"""|'[^']*'|"[^"]*")/ },
    { name: 'cmt', re: /(#[^\n]*)/ },
    { name: 'kw',  re: /\b(from|import|if|for|in|not|def|class|return|break|None|True|False|as|and|or|export|python)\b/ },
    { name: 'num', re: /\b(\d+)\b/ },
    { name: 'fn',  re: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/ }
  ];

  // 3. Combine into one big regex
  const combinedRe = new RegExp(tokens.map(t => t.re.source).join('|'), 'g');

  // 4. Single-pass replacement
  return code.replace(combinedRe, (...args) => {
    const matched = args[0];
    for (let i = 0; i < tokens.length; i++) {
      if (args[i + 1] !== undefined) {
        return `<span class="${tokens[i].name}">${matched}</span>`;
      }
    }
    return matched;
  });
}

/* ── Code generation: MiniGrid ───────────────────────────── */

function generateMiniGridCode(s) {
  const perc = MODULES.perception[s.perception];
  const reas = MODULES.reasoning[s.reasoning];
  const mem  = MODULES.memory[s.memory];
  const refl = MODULES.reflection[s.reflection];
  const needsLLM = reas.llm || mem.llm || (refl.import !== null);

  const lines = [];

  lines.push('"""Generated agent setup — AgentFractory"""');
  lines.push('import sys, os');
  lines.push('');
  lines.push('project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))');
  lines.push('if project_root not in sys.path:');
  lines.push('    sys.path.insert(0, project_root)');
  lines.push('');
  lines.push('import benchmarks.minigrid  # register adapter');
  lines.push('from agents import EmbodiedAgent');
  lines.push('from modules.adapters import get_adapter');
  lines.push('');

  lines.push('# ── Perception ──');
  lines.push(perc.import);
  lines.push(`perception = ${perc.init}`);
  lines.push('');

  if (needsLLM) {
    lines.push('# ── LLM client ──');
    lines.push('from modules.llm import OpenAIClient');
    lines.push('llm_client = OpenAIClient(');
    lines.push('    api_key=os.getenv("OPENAI_API_KEY"),');
    lines.push('    model="gpt-4o-mini",');
    lines.push('    temperature=0.0,');
    lines.push(')');
    lines.push('');
  }

  lines.push('# ── Reasoning ──');
  lines.push(reas.import);
  lines.push(`reasoning = ${reas.init}`);
  lines.push('');

  lines.push('# ── Memory ──');
  if (mem.import) {
    lines.push(mem.import);
    lines.push(`memory = ${mem.init}`);
  } else {
    lines.push('memory = None');
  }
  lines.push('');

  lines.push('# ── Reflection ──');
  if (refl.import) {
    lines.push(refl.import);
    lines.push(`reflection = ${refl.init}`);
  } else {
    lines.push('reflection = None');
  }
  lines.push('');

  lines.push('# ── Agent ──');
  lines.push('agent = EmbodiedAgent(');
  lines.push('    perception=perception,');
  lines.push('    reasoning=reasoning,');
  lines.push('    memory=memory,');
  lines.push('    reflection=reflection,');
  lines.push(')');
  lines.push(`env = get_adapter("minigrid", env_name="${s.envName}")`);
  lines.push('');

  lines.push('# ── Run loop ──');
  lines.push('max_steps = 50');
  lines.push('obs, info = env.reset()');
  lines.push('agent.reset()');
  lines.push('');
  lines.push('for step in range(max_steps):');
  lines.push('    action = agent.step(');
  lines.push('        obs, info=info,');
  lines.push('        meta=env.meta,');
  lines.push('        task=env.task_spec,');
  lines.push('        action_space=env.action_schema,');
  lines.push('    )');
  lines.push('    next_obs, reward, done, truncated, info = env.step(action)');
  lines.push('    agent.observe_result(reward, next_obs, done, truncated, info)');
  lines.push('    if done or truncated:');
  lines.push('        break');
  lines.push('    obs = next_obs');
  lines.push('');
  lines.push('env.close()');

  return lines.join('\n');
}

/* ── Code generation: DeliveryBench ──────────────────────── */

function generateDeliveryBenchCode(s) {
  const METHOD_MAP = { simple: 'simple', llm: 'llm', react: 'react', cot: 'cot', tot: 'tot', guided_search: 'guided_search', rap: 'rap' };
  const method = METHOD_MAP[s.reasoning] || 'react';

  const lines = [];
  lines.push('"""Generated agent setup — DeliveryBench task"""');
  lines.push(`# Full run: python examples/deliverybench_example.py --reasoning-method ${method} --model gpt-4o-mini`);
  lines.push('# Requires: Food-Delivery-Bench repo, PyQt5, and optional LLM API key.');
  lines.push('');
  lines.push('import sys, os');
  lines.push('');
  lines.push('project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))');
  lines.push('if project_root not in sys.path:');
  lines.push('    sys.path.insert(0, project_root)');
  lines.push('');
  lines.push('from agents import EmbodiedAgent');
  lines.push('from benchmarks.simworld.deliverybench_wrapper import DeliveryBenchEnvironment');
  lines.push('from modules.perception.deliverybench_adapter import DeliveryBenchPerceptionModule');
  lines.push('');
  lines.push('# DeliveryBench base dir');
  lines.push('base_dir = os.getenv(');
  lines.push('    "DELIVERYBENCH_BASE_DIR",');
  lines.push('    os.path.join(os.path.dirname(project_root), "Food-Delivery-Bench"),');
  lines.push(')');
  lines.push('');
  lines.push('perception = DeliveryBenchPerceptionModule()');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    import subprocess');
  lines.push('    ex = os.path.join(project_root, "examples", "deliverybench_example.py")');
  lines.push(`    subprocess.run([sys.executable, ex, "--reasoning-method", "${method}"])`);

  return lines.join('\n');
}

/* ── Main generate ───────────────────────────────────────── */

function generateShellCode(s, isDelivery) {
  const reas = MODULES.reasoning[s.reasoning];
  const mem  = MODULES.memory[s.memory];
  const refl = MODULES.reflection[s.reflection];
  const needsLLM = reas.llm || mem.llm || (refl.import !== null);

  const lines = [];
  lines.push('#!/usr/bin/env bash');
  lines.push('');
  lines.push('# Make sure to install the project dependencies first:');
  lines.push('# pip install -e .');
  lines.push('');
  
  if (needsLLM) {
    lines.push('# This configuration requires an OpenAI API key.');
    lines.push('export OPENAI_API_KEY="your_api_key_here"');
    lines.push('');
  }
  
  if (isDelivery) {
    const METHOD_MAP = { simple: 'simple', llm: 'llm', react: 'react', cot: 'cot', tot: 'tot', guided_search: 'guided_search', rap: 'rap' };
    const method = METHOD_MAP[s.reasoning] || 'react';
    lines.push('# Set DeliveryBench base directory if it is not in the default location');
    lines.push('# export DELIVERYBENCH_BASE_DIR="/path/to/Food-Delivery-Bench"');
    lines.push('');
    lines.push('# Run the DeliveryBench example');
    lines.push(`python examples/deliverybench_example.py --reasoning-method ${method}`);
  } else {
    lines.push('# Run the generated agent code');
    lines.push('python generated_agent.py');
  }

  return lines.join('\n');
}

let lastCodePython = '';
let lastCodeShell = '';
let currentTab = 'python';

function switchTab(target) {
  currentTab = target;
  els.tabs.forEach((tab) => {
    const isMatch = tab.dataset.target === target;
    tab.classList.toggle('active', isMatch);
    // Also toggle Bulma is-active on parent <li> if present
    if (tab.parentElement && tab.parentElement.tagName === 'LI') {
      tab.parentElement.classList.toggle('is-active', isMatch);
    }
  });
  els.displayPython.style.display = target === 'python' ? 'flex' : 'none';
  els.displayShell.style.display = target === 'shell' ? 'flex' : 'none';
}

function generate() {
  const s = getSelections();
  const isDelivery = s.env === 'deliverybench';
  
  const pyCode = isDelivery
    ? generateDeliveryBenchCode(s)
    : generateMiniGridCode(s);
  const shCode = generateShellCode(s, isDelivery);

  lastCodePython = pyCode;
  lastCodeShell = shCode;
  
  els.codeBlockPython.innerHTML = highlight(pyCode);
  els.codeBlockShell.innerHTML = highlight(shCode);

  // Render line numbers
  const pyLineCount = pyCode.split('\n').length;
  if (els.lineNumbersPython) {
    els.lineNumbersPython.innerHTML = Array.from(
      { length: pyLineCount },
      (_, i) => `<div>${i + 1}</div>`
    ).join('');
  }
  
  const shLineCount = shCode.split('\n').length;
  if (els.lineNumbersShell) {
    els.lineNumbersShell.innerHTML = Array.from(
      { length: shLineCount },
      (_, i) => `<div>${i + 1}</div>`
    ).join('');
  }

  els.codeSection.classList.add('fade-in');
  els.codeSection.style.display = 'block';
}

/* ── Actions ─────────────────────────────────────────────── */

function copyCode() {
  const codeToCopy = currentTab === 'python' ? lastCodePython : lastCodeShell;
  navigator.clipboard.writeText(codeToCopy).then(() => {
    flashStatus('Copied to clipboard');
    // Brief visual feedback on copy button
    const btn = els.copyBtn;
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
  });
}

function downloadCode() {
  const codeToDownload = currentTab === 'python' ? lastCodePython : lastCodeShell;
  const fileName = currentTab === 'python' ? 'generated_agent.py' : 'run_agent.sh';
  const blob = new Blob([codeToDownload], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  flashStatus(`Downloaded ${fileName}`);
}

/* ── Event wiring ────────────────────────────────────────── */

function init() {
  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.target);
    });
  });

  els.generateBtn.addEventListener('click', generate);
  els.copyBtn.addEventListener('click', copyCode);
  els.downloadBtn.addEventListener('click', downloadCode);

  [els.env, els.envName, els.perception, els.reasoning, els.memory, els.reflection].forEach((el) => {
    el.addEventListener('change', generate);
  });

  els.env.addEventListener('change', () => {
    const isDelivery = val(els.env) === 'deliverybench';
    els.envNameWrap.classList.toggle('is-hidden', isDelivery);
  });

  generate();
}

document.addEventListener('DOMContentLoaded', init);
