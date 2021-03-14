import { LitElement, html, css, property, customElement } from "lit-element";

import PRESETS from "./utils/presets";
import { buildDomTree, EventDispatchingStep, simulateDispatchEvent } from "./simulator";
import { loadStateFromSearchParams, saveStateToSearchParams } from "./utils/search-params";

import "./tree-editor";
import "./tree-logs";

import type { PresetChangeEvent, TreeChangeEvent } from "./tree-editor";
import type { ChangeStepEvent } from "./tree-logs";

@customElement("event-app")
export class EventApp extends LitElement {
  @property() presetId: string | null = null;
  @property() rawTree: string;
  @property() targetId: string;

  @property() steps: EventDispatchingStep[] = [];
  @property() activeStep: number = 0;

  constructor() {
    super();

    let { rawTree, targetId } = loadStateFromSearchParams();

    if (rawTree === null || targetId === null) {
      const preset = PRESETS[0];

      this.presetId = preset.id;
      rawTree = preset.rawTree;
      targetId = preset.targetId;
    }

    this.rawTree = rawTree;
    this.targetId = targetId;

    this.saveState();
    this.recomputeSteps();
  }

  handlePresetChange(evt: PresetChangeEvent) {
    const { id: presetId } = evt.detail;

    const preset = PRESETS.find((preset) => preset.id === presetId)!;

    this.presetId = presetId;
    this.rawTree = preset.rawTree;
    this.targetId = preset.targetId;

    this.saveState();
    this.recomputeSteps();
  }

  handleTreeChange(evt: TreeChangeEvent) {
    this.presetId = null;
    this.rawTree = evt.detail.value;

    this.saveState();
    this.recomputeSteps();
  }

  saveState() {
    saveStateToSearchParams(this.rawTree, this.targetId);
  }

  recomputeSteps() {
    const tree = buildDomTree(this.rawTree);

    const target = tree.nodes.find(
      (node) => node instanceof Element && node.getAttribute("id") === this.targetId
    )!;
    this.steps = simulateDispatchEvent({
      tree,
      target,
      eventOptions: {
        bubbles: true,
        composed: true,
      },
    });
  }

  render() {
    return html`
      <div class="container">
        <tree-editor
          .presetId=${this.presetId}
          .value=${this.rawTree}
          @presetchange=${this.handlePresetChange}
          @treechange=${this.handleTreeChange}
        ></tree-editor>
        <tree-logs
          .steps=${this.steps}
          .activeStep=${this.activeStep}
          @stepchange=${(evt: ChangeStepEvent) => (this.activeStep = evt.detail.step)}
        ></tree-logs>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .container {
        display: flex;
      }

      tree-editor,
      tree-logs {
        padding: 1em;
      }

      tree-editor {
        min-width: 400px;
      }

      tree-logs {
        flex-grow: 1;
      }
    `;
  }
}
