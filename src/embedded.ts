import { LitElement, html, css, property, customElement } from "lit-element";

import "./graph-viewer";
import "./tree-logs";

import {
  buildDomTree,
  DomTree,
  EventDispatchingStep,
  simulateDispatchEvent,
} from "./lib/simulator";

import type { EventConfigChangeEvent, StepChangeEvent } from "./tree-logs";

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
        this.recomputeTree();
        this.recomputeEventDispatching();
      }
    });
  }

  get eventConfig(): EventInit {
    return {
      bubbles: this.eventbubbles,
      composed: this.eventcomposed,
    };
  }

  recomputeTree() {
    const template = this.querySelector("template");

    if (template) {
      this.tree = buildDomTree(template);
    }
  }

  recomputeEventDispatching() {
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

  handleStepChange(evt: StepChangeEvent) {
    this.activeStep = evt.detail.step;

    this.recomputeEventDispatching();
  }

  handleEventConfigChange(evt: EventConfigChangeEvent) {
    const { composed, bubbles } = evt.detail.config;
    this.eventcomposed = composed;
    this.eventbubbles = bubbles;

    this.recomputeEventDispatching();
  }

  render() {
    return html`
      <div id="content">
        <graph-viewer
          .tree=${this.tree}
          .steps=${this.steps}
          .activeStep=${this.activeStep}
        ></graph-viewer>
        <tree-logs
          .steps=${this.steps}
          .activeStep=${this.activeStep}
          .eventConfig=${this.eventConfig}
          @stepchange=${this.handleStepChange}
          @eventconfigchange=${this.handleEventConfigChange}
        ></tree-logs>
      </div>

      <slot hidden></slot>

      <slot name="footer"></slot>
    `;
  }

  static styles = css`
    :host {
      --border-color: #eee;
      --padding-size: 0.5em;

      display: flex;
      flex-direction: column;

      border: 1px solid var(--border-color);
      border-radius: 3px;
    }

    #content {
      display: flex;
    }

    graph-viewer {
      flex-grow: 1;
    }

    tree-logs {
      width: 500px;
    }

    slot[name="footer"] {
      display: block;
      border-top: 1px solid var(--border-color);
      padding: var(--padding-size);
    }
  `;
}
