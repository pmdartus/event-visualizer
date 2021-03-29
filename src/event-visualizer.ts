import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";

import "./event-graph";
import "./player-controls";
import "./event-steps";

import {
  buildDomTree,
  DomTree,
  EventDispatchingStep,
  simulateDispatchEvent,
} from "./lib/simulator";

import type { StepChangeEvent } from "./event-steps";

@customElement("event-visualizer")
export default class EventVisualizer extends LitElement {
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

  get eventConfig(): EventInit {
    return {
      bubbles: this.eventbubbles,
      composed: this.eventcomposed,
    };
  }

  handleTreeChange() {
    this.computeTree();
    this.computeEventDispatchingStep();
  }

  computeTree() {
    const template = this.querySelector("template");

    if (template) {
      try {
        this.tree = buildDomTree(template);
      } catch (error) {
        console.warn(`Invalid event tree: ${error.message}`);
      }
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
      <div class="main">
        <div class="left-panel">
          <event-graph
            .tree=${this.tree}
            .steps=${this.steps}
            .activeStep=${this.activeStep}
          ></event-graph>
        </div>

        <div class="right-panel">
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

          <player-controls
            .steps=${this.steps}
            .activeStep=${this.activeStep}
            @stepchange=${(evt: StepChangeEvent) => (this.activeStep = evt.detail.step)}
          ></player-controls>

          <event-steps
            .steps=${this.steps}
            .activeStep=${this.activeStep}
            .eventConfig=${{ bubbles: this.eventbubbles, composed: this.eventcomposed }}
            @stepchange=${(evt: StepChangeEvent) => (this.activeStep = evt.detail.step)}
          ></event-steps>
        </div>
      </div>

      <slot @slotchange=${this.handleTreeChange}></slot>

      <slot class="footer" name="footer"></slot>
    `;
  }

  static styles = css`
    :host {
      --border-color: #eee;
      --padding-size: 0.5em;

      font-family: arial, sans-serif;
      color: #212121;
      background-color: #fff;

      border: 1px solid var(--border-color);
      border-radius: 5px;

      display: flex;
      flex-direction: column;
    }

    .main {
      display: flex;
      padding: var(--padding-size);
    }

    .left-panel {
      flex-grow: 1;
      max-height: 500px;
    }

    .right-panel {
      width: 400px;
    }

    @media (max-width: 600px) {
      .main {
        flex-direction: column;
      }

      .right-panel {
        width: 100%;
      }
    }

    player-controls,
    event-steps {
      margin-top: 0.5em;
    }

    .footer {
      display: block;
      border-top: 1px solid var(--border-color);
      padding: var(--padding-size);
    }
  `;
}
