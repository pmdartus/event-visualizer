import { LitElement, html, css, property, customElement } from "lit-element";

import "./tree-editor";
import "./tree-logs";
import "./graph-viewer";

import {
  buildDomTree,
  DomTree,
  EventDispatchingStep,
  simulateDispatchEvent,
} from "./lib/simulator";

import PRESETS from "./utils/presets";
import { loadStateFromSearchParams, saveStateToSearchParams } from "./utils/search-params";

import type { ChangeEvent as EditorChangeEvent } from "./tree-editor";
import type { StepChangeEvent, EventConfig, EventConfigChangeEvent } from "./tree-logs";

@customElement("event-app")
export class EventApp extends LitElement {
  @property() presetId: string | null;
  @property() rawTree: string;
  @property() eventConfig: EventConfig;

  @property() tree?: DomTree;
  @property() steps: EventDispatchingStep[] = [];
  @property() activeStep: number = 0;
  @property() errorMessage: string | null = null;

  constructor() {
    super();

    const { rawTree, eventConfig } = loadStateFromSearchParams();

    if (rawTree) {
      this.rawTree = rawTree;
      this.presetId = null;
    } else {
      const preset = PRESETS[0];
      this.rawTree = preset.rawTree;
      this.presetId = preset.id;
    }
    this.eventConfig = eventConfig;

    this.recomputeEventDispatching();
  }

  handleEditorChange(evt: EditorChangeEvent) {
    this.rawTree = evt.detail.value;
    this.recomputeEventDispatching();
  }

  handleEventConfigChange(evt: EventConfigChangeEvent) {
    this.eventConfig = evt.detail.config;
    this.recomputeEventDispatching();
  }

  handlePresetChange(evt: Event) {
    const presetId = (evt.target as HTMLSelectElement).value;

    this.presetId = presetId;
    this.rawTree = PRESETS.find((preset) => preset.id === presetId)!.rawTree;

    this.recomputeEventDispatching();
  }

  recomputeEventDispatching() {
    const { rawTree, eventConfig } = this;

    try {
      const tree = buildDomTree(rawTree);
      const steps = simulateDispatchEvent({
        tree,
        eventConfig,
      });

      this.tree = tree;
      this.steps = steps;
      this.activeStep = 0;
      this.errorMessage = null;

      saveStateToSearchParams({
        rawTree,
        eventConfig,
      });
    } catch (error: unknown) {
      this.errorMessage = (error as Error).message;
      console.error(error);
    }
  }

  render() {
    return html`
      <select @change=${this.handlePresetChange}>
        <option disabled .selected=${this.presetId === null}>Select an example...</option>
        ${PRESETS.map(
          (preset) =>
            html`
              <option value=${preset.id} .selected=${preset.id === this.presetId}>
                ${preset.label}
              </option>
            `
        )}
      </select>

      <div class="container">
        <tree-editor .value=${this.rawTree} @change=${this.handleEditorChange}></tree-editor>

        ${this.errorMessage && html`<div class="error-message">${this.errorMessage}</div>`}

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
