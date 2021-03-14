import { LitElement, html, css, property, customElement } from "lit-element";

import "./tree-editor";
import "./tree-logs";
import { buildDomTree, simulateDispatchEvent } from "./simulator";

const tree = buildDomTree(`
<div id="a">
  <template shadow-root mode="open">
    <div id="b">
      <slot></slot>
    </div>
  </template>
  <div id="c"></div>
</div>
`);

const target = tree.nodes.find(
  (node) => node instanceof Element && node.getAttribute("id") === "c"
)!;
const res = simulateDispatchEvent({
  tree,
  target,
  eventOptions: {
    bubbles: true,
    composed: true,
  },
});

@customElement("event-app")
export class EventApp extends LitElement {
  @property() steps = res.steps;
  @property() activeStep = 0;

  static get styles() {
    return css`
      :host {
        display: flex;
      }
    `;
  }

  handlePresetChange() {}

  handleTreeChange() {}

  render() {
    console.log(this.activeStep);
    return html`
      <tree-editor
        @presetchange=${(evt: CustomEvent<{ id: string }>) => console.log(evt)}
        @treechange=${(evt: CustomEvent<{ html: string }>) => console.log(evt)}
      ></tree-editor>
      <tree-logs
        .steps=${this.steps}
        .activeStep=${this.activeStep}
        @stepchange=${(evt: CustomEvent<{ step: number }>) => (this.activeStep = evt.detail.step)}
      ></tree-logs>
    `;
  }
}
