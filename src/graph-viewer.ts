import { LitElement, customElement, html, css, property, PropertyValues } from "lit-element";

import { GraphRenderer } from "./lib/graph-renderer";
import { DomTree, EventDispatchingStep } from "./lib/simulator";

@customElement("graph-viewer")
export class GraphViewer extends LitElement {
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

    if (props.has("step") || props.has("activeStep")) {
      const step = this.steps[this.activeStep];
      this.graphRender?.setStep(step);
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;

        --node-color: #e4e4e4;
        --node-border-color: #c0c0c0;
        --node-border-width: 4;

        --node-target-color: #f3ea71;
        --node-target-border-color: #e4d60f;

        --node-current-target-border-color: #f59e2e;
        --node-current-target-border-width: calc(var(--node-border-width) * 2);

        --connection-color: #505050;
        --connection-child-color: var(--connection-color);
        --connection-border-width: 3;
      }

      svg {
        width: 100%;
        height: 600px;
      }

      .node {
        fill: var(--node-color);
        stroke: var(--node-border-color);
        stroke-width: var(--node-border-width);
      }

      .node__target {
        fill: var(--node-target-color);
        stroke: var(--node-target-border-color);
      }

      .node__current-target {
        stroke: var(--node-current-target-border-color);
        stroke-width: var(--node-current-target-border-width);
      }

      .node-label {
        font-family: monospace;
      }

      .connection {
        stroke: var(--connection-child-color);
        stroke-width: var(--connection-border-width);
      }

      .connection__shadow-root {
        stroke-dasharray: 8;
      }

      .connection__assigned-element {
        stroke-dasharray: 1, 4;
        stroke-linecap: round;
      }
    `;
  }
}
