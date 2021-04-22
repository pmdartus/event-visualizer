import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import { GraphRenderer } from "./graph/renderer.js";
import { DomTree, EventDispatchingStep } from "./dom.js";

@customElement("event-graph")
export class EventGraph extends LitElement {
  @property() tree!: DomTree;
  @property() steps!: EventDispatchingStep[];
  @property() activeStep!: number;

  graphRender?: GraphRenderer;

  render() {
    return html`<svg></svg>`;
  }

  firstUpdated() {
    const root = this.shadowRoot?.querySelector("svg")!;

    this.graphRender = new GraphRenderer({
      root,
    });
  }

  updated(props: PropertyValues) {
    if (props.has("tree")) {
      this.graphRender?.setTree(this.tree);
    }

    const step = this.steps[this.activeStep];
    this.graphRender?.setStep(step);
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        align-items: center;
      }

      svg {
        width: 100%;
        height: 100%;
        max-height: 500px;
        font-family: monospace;
      }

      ${GraphRenderer.styles}
    `;
  }
}
