import { LitElement, customElement, html, css, property, PropertyValues } from "lit-element";

import { GraphRenderer } from "./graph/graph-renderer.js";
import { DomTree, EventDispatchingStep } from "./simulator.js";

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
        display: block;
      }

      svg {
        width: 100%;
        height: 100%;
        max-height: 500px;
        font-family: monospace;
      }

      .edge path {
        stroke: #505050;
      }

      .edge__shadow-root {
        stroke-dasharray: 8;
      }

      .edge__assigned-element {
        stroke-dasharray: 1, 4;
        stroke-linecap: round;
      }

      .node__composed-path > path {
        fill: #f3ea71;
      }

      .pointer {
        transition: transform 0.5s;
      }

      .pointer__event > path {
        fill: #f9a825;
        stroke: #bc5100;
      }

      .pointer__target > path {
        fill: #c7a4ff;
        stroke: #65499c;
      }
    `;
  }
}
