import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";

import "./event-graph.js";
import "./event-steps.js";
import { StepChangeEvent } from "./event-steps";
import { createDomTree, DomTree, EventDispatchingStep, simulateDispatchEvent } from "./dom.js";

import { boxArrowUp } from "./utils/icons.js";
import { openInCodePen } from "./utils/code-pen.js";

@customElement("event-visualizer")
export default class EventVisualizer extends LitElement {
  @property({
    attribute: "label",
    type: String,
  })
  label = "Event propagation";

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
        this.tree = createDomTree(template);
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

  protected handleEditClick(evt: Event) {
    evt.preventDefault();
    openInCodePen(this);
  }

  protected render() {
    return html`
      <div class="header">
        <div class="header__left">
          <div class="label">${this.label}</div>
          <a href="#" @click=${this.handleEditClick}> ${boxArrowUp()} Edit </a>
        </div>

        <div class="event-config">
          <div class="event-config__option">
            <input
              id="bubbles"
              type="checkbox"
              .checked=${this.eventBubbles}
              @change=${(evt: Event) =>
                (this.eventBubbles = (evt.target as HTMLInputElement).checked)}
            />
            <label for="bubbles">bubbles</label>
          </div>

          <div class="event-config__option">
            <input
              id="composed"
              type="checkbox"
              .checked=${this.eventComposed}
              @change=${(evt: Event) =>
                (this.eventComposed = (evt.target as HTMLInputElement).checked)}
            />
            <label for="composed">composed</label>
          </div>
        </div>
      </div>

      <div class="main">
        <event-graph
          .tree=${this.tree}
          .steps=${this.steps}
          .activeStep=${this.activeStep}
        ></event-graph>

        <event-steps
          .steps=${this.steps}
          .activeStep=${this.activeStep}
          .eventConfig=${{ bubbles: this.eventBubbles, composed: this.eventComposed }}
          @stepchange=${(evt: StepChangeEvent) => (this.activeStep = evt.detail.step)}
        ></event-steps>
      </div>

      <slot @slotchange=${this.handleTreeChange}></slot>
    `;
  }

  static styles = css`
    :host {
      --font-family: Helvetica, Arial, Sans-Serif;
      --color: #212121;
      --color-light: #64748b;
      --background-color: #fff;

      --border-style: 1px solid #cdced0;
      --border-radius: 3px;

      --spacing-small: 6px;
      --spacing-medium: 12px;

      --target-color: #b39ddb;
      --target-alt-color: #5e35b1;
      --current-target-color: #a5d6a7;
      --current-target-alt-color: #2e7d32;
      --composed-path-color: #fde68a;
      --composed-path-alt-color: #ff6f00;
    }

    :host {
      font-family: var(--font-family);
      color: var(--color);
      background-color: var(--background-color);

      border: var(--border-style);
      border-radius: var(--border-radius);

      display: flex;
      flex-direction: column;
    }

    .main {
      display: flex;
    }

    event-graph {
      flex-grow: 1;
      align-self: stretch;
    }

    event-steps {
      max-width: 500px;
      padding: var(--spacing-medium);
    }

    @media (max-width: 600px) {
      .main {
        flex-direction: column;
      }
    }

    .header {
      display: flex;
      border-bottom: var(--border-style);
      padding: var(--spacing-medium);
    }

    .header .header__left {
      flex-grow: 1;
      margin-right: var(--spacing-medium);
    }

    .header .label {
      font-weight: 600;
      margin-bottom: 3px;
    }

    .header a {
      color: var(--color-light);
      text-decoration: none;
    }

    .event-config {
      color: var(--color-light);
    }

    .event-config__option {
      display: flex;
    }
  `;
}
