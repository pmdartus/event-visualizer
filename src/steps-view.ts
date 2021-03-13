import { EventDispatchingStep, SimulationResult, TreeNode } from "./simulator";
import { getTreeNodeLabel } from "./utils";

import "./steps-view.css";

const STEPS_SLIDER: HTMLInputElement = document.querySelector("#steps-slider")!;
const STEPS_LOGS_CONTAINER: HTMLUListElement = document.querySelector("#steps-logs")!;

export function init(handleStepChange: (step: number) => void) {
  let activeStepIndex = 0;

  function updateActiveLogItem() {
    STEPS_LOGS_CONTAINER.querySelectorAll(`li`).forEach((li, index) => {
      console.log(index, activeStepIndex);
      if (index === activeStepIndex) {
        li.classList.add("active");
      } else {
        li.classList.remove("active");
      }
    });
  }

  function updateSliderValue() {
    STEPS_SLIDER.value = String(activeStepIndex);
  }

  function resetView(steps: EventDispatchingStep[]) {
    STEPS_SLIDER.setAttribute("max", String(steps.length - 1));

    STEPS_LOGS_CONTAINER.innerHTML = steps
      .map((step, index) => {
        return `
            <li>
              <strong>Current target:</strong> <code>${getTreeNodeLabel(
                step.currentTarget as TreeNode
              )}</code> | 
              <strong>Target:</strong> <code>${getTreeNodeLabel(step.target as TreeNode)}</code> |
              <strong>Composed Path:</strong> <code>${step.composedPath
                .map((node) => getTreeNodeLabel(node as TreeNode))
                .join(", ")}</code>
            </li>
          `;
      })
      .join("\n");
  }

  STEPS_SLIDER.addEventListener("input", () => {
    activeStepIndex = STEPS_SLIDER.valueAsNumber;

    updateActiveLogItem();
    handleStepChange(activeStepIndex);
  });

  STEPS_LOGS_CONTAINER.addEventListener("click", (evt) => {
    const selectedLi = (evt.target as Element).closest("li")!;
    activeStepIndex = Array.from(STEPS_LOGS_CONTAINER.children).indexOf(selectedLi);

    updateActiveLogItem();
    updateSliderValue();
    handleStepChange(activeStepIndex);
  });

  return {
    setSimulationResult(result: SimulationResult) {
      resetView(result.steps);

      updateSliderValue();
      updateActiveLogItem();
    },
  };
}
