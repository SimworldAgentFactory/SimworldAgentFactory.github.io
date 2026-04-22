AgentFactory is evaluated across four diverse benchmarks that test long-horizon planning, spatial reasoning, and resource management. Each environment is integrated into a unified runner so modular agent configurations can be compared under the same evaluation protocol.

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
* Success weighted by Path Length (SPL): A measure of path efficiency.
