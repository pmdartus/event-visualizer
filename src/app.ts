import { LitElement, html, css, property, customElement } from "lit-element";

import "./tree-editor";
import "./tree-logs";
import "./graph-viewer";

import {
  buildDomTree,
  DomTree,
  EventDispatchingStep,
  simulateDispatchEvent,
  TreeNode,
} from "./lib/simulator";

import PRESETS from "./utils/presets";
import { loadStateFromSearchParams, saveStateToSearchParams } from "./utils/search-params";

import type { PresetChangeEvent, TreeChangeEvent } from "./tree-editor";
import type { StepChangeEvent, EventConfig, EventConfigChangeEvent } from "./tree-logs";

@customElement("event-app")
export class EventApp extends LitElement {
  @property() presetId: string | null = null;
  @property() rawTree: string;
  @property() targetId: string;

  @property() tree!: DomTree;
  @property() target!: TreeNode;
  @property() eventConfig: EventConfig = { bubbles: true, composed: true };
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
    this.recomputeEventDispatching();
  }

  handlePresetChange(evt: PresetChangeEvent) {
    const { id: presetId } = evt.detail;

    const preset = PRESETS.find((preset) => preset.id === presetId)!;

    this.presetId = presetId;
    this.rawTree = preset.rawTree;
    this.targetId = preset.targetId;

    this.saveState();
    this.recomputeEventDispatching();
  }

  handleTreeChange(evt: TreeChangeEvent) {
    this.presetId = null;
    this.rawTree = evt.detail.value;

    this.saveState();
    this.recomputeEventDispatching();
  }

  handleEventConfigChange(evt: EventConfigChangeEvent) {
    this.eventConfig = evt.detail;

    this.saveState();
    this.recomputeEventDispatching();
  }

  saveState() {
    saveStateToSearchParams(this.rawTree, this.targetId);
  }

  recomputeEventDispatching() {
    this.tree = buildDomTree(this.rawTree);

    this.target = this.tree.nodes.find(
      (node) => node instanceof Element && node.getAttribute("id") === this.targetId
    )!;

    this.activeStep = 0;
    this.steps = simulateDispatchEvent({
      tree: this.tree,
      target: this.target,
      eventConfig: this.eventConfig,
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
          .eventConfig=${this.eventConfig}
          @stepchange=${(evt: StepChangeEvent) => (this.activeStep = evt.detail.step)}
          @eventconfigchange=${this.handleEventConfigChange}
        ></tree-logs>
      </div>
      <graph-viewer
        .tree=${this.tree}
        .steps=${this.steps}
        .activeStep=${this.activeStep}
      ></graph-viewer>
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
