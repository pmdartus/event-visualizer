import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";

import "./event-graph.js";
import "./player-controls.js";
import "./event-steps.js";

import { buildDomTree, DomTree, EventDispatchingStep, simulateDispatchEvent } from "./simulator.js";

import type { StepChangeEvent } from "./event-steps";

@customElement("event-visualizer")
export default class EventVisualizer extends LitElement {
  @property({
    attribute: "event-bubbles",
    reflect: true,
    type: Boolean,
  })
  eventBubbles = false;

  @property({
    attribute: "event-composed",
    reflect: true,
    type: Boolean,
  })
  eventComposed = false;

  @property() protected tree?: DomTree;
  @property() protected steps: EventDispatchingStep[] = [];
  @property() protected activeStep: number = 0;

  protected handleTreeChange() {
    this.computeTree();
    this.computeEventDispatchingStep();
  }

  protected computeTree() {
    const template = this.querySelector("template");

    if (template) {
      try {
        this.tree = buildDomTree(template);
      } catch (error) {
        console.warn(`Invalid event tree: ${error.message}`);
      }
    }
  }

  protected computeEventDispatchingStep() {
    const { tree } = this;

    if (!tree) {
      return;
    }

    const steps = simulateDispatchEvent({
      tree,
      eventConfig: {
        bubbles: this.eventBubbles,
        composed: this.eventComposed,
      },
    });

    this.steps = steps;
    this.activeStep = 0;
  }

  protected updated(props: PropertyValues) {
    if (props.has("eventComposed") || props.has("eventBubbles")) {
      this.computeEventDispatchingStep();
    }
  }

  protected render() {
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
            .checked=${this.eventBubbles}
            @change=${(evt: Event) =>
              (this.eventBubbles = (evt.target as HTMLInputElement).checked)}
          />
          <label for="bubbles">bubbles</label>

          <input
            id="composed"
            type="checkbox"
            .checked=${this.eventComposed}
            @change=${(evt: Event) =>
              (this.eventComposed = (evt.target as HTMLInputElement).checked)}
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
            .eventConfig=${{ bubbles: this.eventBubbles, composed: this.eventComposed }}
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
