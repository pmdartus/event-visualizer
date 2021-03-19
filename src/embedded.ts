import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";

import "./graph-viewer";
import "./tree-logs";

import {
  buildDomTree,
  DomTree,
  EventDispatchingStep,
  simulateDispatchEvent,
} from "./lib/simulator";

import type { StepChangeEvent } from "./tree-logs";

@customElement("embedded-event-visualizer")
export default class EmbeddedEventVisualizer extends LitElement {
  @property({
    attribute: true,
    reflect: true,
    type: Boolean,
  })
  eventbubbles = false;

  @property({
    attribute: true,
    reflect: true,
    type: Boolean,
  })
  eventcomposed = false;

  @property() tree?: DomTree;
  @property() steps: EventDispatchingStep[] = [];
  @property() activeStep: number = 0;

  connectedCallback() {
    super.connectedCallback();

    this.shadowRoot?.addEventListener("slotchange", (evt) => {
      const slotName = (evt.target as HTMLSlotElement).name;

      if (slotName === "") {
        this.computeTree();
        this.computeEventDispatchingStep();
      }
    });
  }

  get eventConfig(): EventInit {
    return {
      bubbles: this.eventbubbles,
      composed: this.eventcomposed,
    };
  }

  computeTree() {
    const template = this.querySelector("template");

    if (template) {
      this.tree = buildDomTree(template);
    }
  }

  computeEventDispatchingStep() {
    const { tree, eventConfig } = this;

    if (!tree) {
      return;
    }

    const steps = simulateDispatchEvent({
      tree,
      eventConfig,
    });

    this.steps = steps;
    this.activeStep = 0;
  }

  updated(props: PropertyValues) {
    if (props.has("eventcomposed") || props.has("eventbubbles")) {
      this.computeEventDispatchingStep();
    }
  }

  render() {
    return html`
      <div id="main">
        <div id="left-panel">
          <graph-viewer
            .tree=${this.tree}
            .steps=${this.steps}
            .activeStep=${this.activeStep}
          ></graph-viewer>
        </div>

        <div id="right-panel">
          Event configuration:
          <input
            id="bubbles"
            type="checkbox"
            .checked=${this.eventbubbles}
            @change=${(evt: Event) =>
              (this.eventbubbles = (evt.target as HTMLInputElement).checked)}
          />
          <label for="bubbles">bubbles</label>

          <input
            id="composed"
            type="checkbox"
            .checked=${this.eventcomposed}
            @change=${(evt: Event) =>
              (this.eventcomposed = (evt.target as HTMLInputElement).checked)}
          />
          <label for="composed">composed</label>

          <tree-logs
            .steps=${this.steps}
            .activeStep=${this.activeStep}
            @stepchange=${(evt: StepChangeEvent) => (this.activeStep = evt.detail.step)}
          ></tree-logs>
        </div>
      </div>

      <slot hidden></slot>

      <slot id="footer" name="footer"></slot>
    `;
  }

  static styles = css`
    :host {
      --font-family: arial, sans-serif;
      --font-color: #212121;

      --border-color: #eee;
      --padding-size: 0.5em;

      font-family: var(--font-family);
      color: var(--font-color);

      display: flex;
      flex-direction: column;

      border: 1px solid var(--border-color);
      border-radius: 3px;
    }

    #main {
      display: flex;
    }

    #footer {
      display: block;
      border-top: 1px solid var(--border-color);
      padding: var(--padding-size);
    }

    #left-panel {
      flex-grow: 1;
    }

    tree-logs {
      width: 500px;
    }
  `;
}
