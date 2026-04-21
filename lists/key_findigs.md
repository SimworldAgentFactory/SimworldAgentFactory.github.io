### Key Findings: Memory & Reasoning in Embodied Agents

---

#### **1. Memory Architecture & Effectiveness**
* **Structure over Volume:** Success is method-dependent; structured, action-oriented mechanisms (e.g., *DynamicCheatsheet*, *MemoryBank*) outperform simple context expansion.
* **Controllability:** Ineffective or non-selective retrieval introduces noise, necessitating compact, state-relevant guidance for decision-time reliability.

#### **2. Abstraction in Planning**
* **Policy-Level Guidance:** Planning-based reasoning (e.g., *ReAct*) requires abstracted, distilled experience rather than low-level trajectory fragments or raw observations.
* **Noise Reduction:** While raw data assists local control, long-horizon planning requires summarized memory to match the needs of plan-then-act reasoning.

#### **3. Hybrid & Multi-Granularity Design**
* **Cross-Strategy Robustness:** Hybrid modules (e.g., *MemoryBank*) are superior because they provide concurrent access to raw trajectories, experience summaries, and environmental insights.
* **Adaptability:** Multi-granularity allows different reasoning strategies to consume data at the required level of abstraction.

#### **4. Multi-Agent Resilience**
* **Error Correction:** Multi-agent systems exhibit lower sensitivity to memory quality than single-agent systems.
* **Complementarity:** Collective reasoning preserves decision quality even when retrieved memory is coarse or partially relevant.

#### **5. Reflection as a Correction Layer**
* **Broad Compatibility:** Reflection acts as a universal reevaluation layer, checking candidate actions against state feedback and failure signals.
* **Performance Scaling:** It provides substantial gains for weak reasoning-memory pairs and incremental improvements for strong ones.