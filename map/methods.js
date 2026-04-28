const AGENT_METHOD_CATEGORIES = new Map([

  ["reasoning", new Map([

    ["sequential_decomposition_acting", [
      "ReAct",
      "Chain-of-Thought",
      "Plan-and-Solve"
    ]],

    ["search_tree_exploration", [
      "Tree of Thoughts",
      "LATS",
      "RAP"
    ]],

    ["ensemble_multi_agent", [
      "Self-Consistency",
      "MAD"
    ]]

  ])],

  ["memory", new Map([

    ["buffer_short_term", [
      "Base",
      "Buffer of Thought",
      "SimpleMem"
    ]],

    ["structured_database", [
      "ChatDB",
      "MemoryBank",
      "MemGPT"
    ]],

    ["hierarchical_graph", [
      "GMemory",
      "CAM",
      "Zep"
    ]],

    ["semantic_embedding_retrieval", [
      "A-Mem",
      "LightMem",
      "Mem0",
      "Generative Agent Memory"
    ]],

    ["curated_reflective", [
      "ACE",
      "Dynamic Cheatsheet",
      "OpenClaw",
      "MIRIX"
    ]],

    ["framework_infrastructure", [
      "LangMem"
    ]]

  ])],

  ["reflection", new Map([

    ["step_level_refinement", [
      "Self-Refine",
      "Reflexion"
    ]],

    ["trajectory_level_learning", [
      "Retroformer",
      "Reflexion"
    ]],

    ["failure_aware_learning", [
      "Reflexion",
      "Retroformer",
      "ACE"
    ]]

  ])]

]);