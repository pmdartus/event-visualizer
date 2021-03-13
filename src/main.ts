import PRESETS, { Preset } from "./presets";
import { init as initTreeView } from "./tree-view";
import { init as initStepsView } from "./steps-view";
import { simulateDispatchEvent, buildDomTree, SimulationResult } from "./simulator";

import "./main.css";

const SELECT_PRESET: HTMLSelectElement = document.querySelector("#select-preset")!;
const PRESET_EDITOR: HTMLPreElement = document.querySelector("#editor-preset")!;

(() => {
  let simulationResult: SimulationResult;

  function handlePresetChange(preset: Preset) {
    const tree = buildDomTree(preset.content);

    const target = tree.nodes.find(
      (node) => node instanceof Element && node.getAttribute("id") === preset.target
    )!;
    simulationResult = simulateDispatchEvent({
      tree,
      target,
      eventOptions: {
        bubbles: true,
        composed: true,
      },
    });

    stepsView.setSimulationResult(simulationResult);

    treeView.resetTreeView(tree);
    treeView.setEventDispatchingStep(simulationResult.steps[0]);
  }

  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    SELECT_PRESET.appendChild(option);
  }

  SELECT_PRESET.addEventListener("change", (evt) => {
    const presetName = SELECT_PRESET.value;
    const preset = PRESETS.find((preset) => preset.id === presetName);

    if (!preset) {
      throw new Error(`Unknown preset "${presetName}".`);
    }

    PRESET_EDITOR.textContent = preset.content;

    handlePresetChange(preset);
  });

  const treeView = initTreeView();
  const stepsView = initStepsView((stepIndex) => {
    const step = simulationResult.steps[stepIndex];
    treeView.setEventDispatchingStep(step);
  });

  handlePresetChange(PRESETS[0]);
})();
