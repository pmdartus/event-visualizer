import { LitElement, html, css, property, customElement } from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { EventDispatchingStep } from "./lib/simulator";
import { getEventTargetLabel } from "./utils/label";

export type StepChangeEvent = CustomEvent<{ step: number }>;

@customElement("tree-logs")
export class TreeLogs extends LitElement {
  @property()
  steps: EventDispatchingStep[] = [];

  @property()
  activeStep: number = 0;

  dispatchStepChange(step: number) {
    const changeStepEvent: StepChangeEvent = new CustomEvent("stepchange", {
      detail: { step },
    });

    this.dispatchEvent(changeStepEvent);
  }

  render() {
    const { steps, activeStep } = this;

    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Current Target</th>
            <th scope="col">Target</th>
            <th scope="col">Composed Path</th>
          </tr>
        </thead>
        <tbody>
          ${steps.map((step, index) => {
            const previousStep = steps[index - 1];

            const targetChanged = step.target !== previousStep?.target ?? true;
            const currentTargetChanged = step.currentTarget !== previousStep?.currentTarget ?? true;
            const composedPathChanged =
              previousStep?.composedPath.some((node, i) => node !== step.composedPath[i]) ?? true;

            return html`
              <tr
                class=${activeStep === index ? "active-step" : ""}
                @click=${() => this.dispatchStepChange(index)}
              >
                <th scope="row">${index + 1}</th>
                <td class=${classMap({ "property-updated": currentTargetChanged })}>
                  ${getEventTargetLabel(step.currentTarget)}
                </td>
                <td class=${classMap({ "property-updated": targetChanged })}>
                  ${getEventTargetLabel(step.target)}
                </td>
                <td class=${classMap({ "property-updated": composedPathChanged })}>
                  ${step.composedPath.map((node) => getEventTargetLabel(node)).join(", ")}
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      input[type="range"] {
        width: 100%;
      }

      table {
        width: 100%;
      }

      tr:hover {
        background: #ececec;
      }

      tr.active-step {
        background: #c7c7c7;
      }

      td.property-updated {
        font-weight: bold;
        color: red;
      }
    `;
  }
}
