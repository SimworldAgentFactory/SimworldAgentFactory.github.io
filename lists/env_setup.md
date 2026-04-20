We evaluate the performance of LLMs for embodied decision making using the Embodied Agent Interface. Below is a detailed description of the evaluation setup.

### Dataset Description

To evaluate embodied intelligence across diverse modalities, we select **DeliveryBench**, **ALFRED**, **MiniGrid**, and **RoboTHOR** as our core benchmarks. These environments require the integration of perception, state tracking, and long-horizon planning. 

* **DeliveryBench**: A city-scale evaluation for autonomous delivery agents across nine urban maps. It emphasizes long-horizon planning under discrete resource constraints. Observations consist of structured state data and natural-language descriptions of local topography. Performance is quantified via hourly profit.
* **ALFRED**: A 3D household environment for multi-step instruction following. Evaluation involves seven task categories requiring compositional object manipulation and state-dependent reasoning. The primary metrics are **Success Rate (SR)** and **Success-weighted Path Length (SPL)**.
* **RoboTHOR**: Focuses on first-person object navigation within photorealistic 3D indoor scenes. Agents are initialized at a starting pose and must navigate to a target object category within a predefined step budget. Efficiency and accuracy are measured using **SR** and **SPL**.
* **MiniGrid**: A 2D gridworld with pixel-based observations to test reasoning under partial observability. Across 10 distinct tasks, it evaluates navigation and object interaction. Performance is measured by **SR** and an **SPL-derived reward function** that penalizes inefficient trajectories.