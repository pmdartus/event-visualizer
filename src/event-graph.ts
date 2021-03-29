import { LitElement, customElement, html, css, property, PropertyValues } from "lit-element";

import { GraphRenderer } from "./lib/graph-renderer";
import { DomTree, EventDispatchingStep } from "./lib/simulator";

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

        --max-height: 500px;

        --node-current-target-fill-color: #1a73e8;

        --node-target-fill-color: #ffa224;
        --node-target-stroke-color: #e4d60f;

        --node-composed-path-fill-color: #f3ea71;
        --node-composed-path-stroke-color: #c49000;

        --edge-stroke-color: #505050;
      }

      svg {
        width: 100%;
        height: 100%;
        max-height: var(--max-height);
        font-family: monospace;
      }

      .edge path {
        stroke: var(--edge-stroke-color);
      }

      .edge__shadow-root {
        stroke-dasharray: 8;
      }

      .edge__assigned-element {
        stroke-dasharray: 1, 4;
        stroke-linecap: round;
      }

      .node__composed-path > path {
        fill: var(--node-composed-path-fill-color);
      }

      .edge__composed-path > path {
        stroke: var(--node-composed-path-stroke-color);
      }

      .node__current-target > path {
        stroke: var(--node-current-target-fill-color);
      }

      .node__target > path {
        fill: var(--node-target-fill-color);
      }
    `;
  }
}
