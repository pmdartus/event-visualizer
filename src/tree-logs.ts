import { LitElement, html, css, property, customElement } from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { EventDispatchingStep } from "./lib/simulator";
import { getEventTargetLabel } from "./utils/label";

export interface EventConfig {
  bubbles: boolean;
  composed: boolean;
}

export type StepChangeEvent = CustomEvent<{ step: number }>;
export type EventConfigChangeEvent = CustomEvent<EventConfig>;

@customElement("tree-logs")
export class TreeLogs extends LitElement {
  @property()
  steps: EventDispatchingStep[] = [];

  @property()
  activeStep: number = 0;

  @property()
  eventConfig: EventConfig = { bubbles: true, composed: true };

  dispatchStepChange(step: number) {
    const changeStepEvent: StepChangeEvent = new CustomEvent("stepchange", {
      detail: { step },
    });

    this.dispatchEvent(changeStepEvent);
  }

  handleEventConfigChange() {
    const eventConfigChangeEvent: EventConfigChangeEvent = new CustomEvent("eventconfigchange", {
      detail: {
        bubbles: (this.shadowRoot!.querySelector("#bubbles") as HTMLInputElement).checked!,
        composed: (this.shadowRoot!.querySelector("#composed") as HTMLInputElement).checked!,
      },
    });

    this.dispatchEvent(eventConfigChangeEvent);
  }

  render() {
    const { steps, activeStep, eventConfig } = this;

    return html`
      <section>
        <input
          title="Active step"
          type="range"
          min="0"
          max=${steps.length - 1}
          .value=${activeStep}
          @input=${(evt: Event) =>
            this.dispatchStepChange((evt.target as HTMLInputElement).valueAsNumber)}
        />

        <input
          id="bubbles"
          type="checkbox"
          .checked=${eventConfig.bubbles}
          @change=${this.handleEventConfigChange}
        />
        <label for="bubbles"><code>bubbles</code></label>

        <input
          id="composed"
          type="checkbox"
          .checked=${eventConfig.composed}
          @change=${this.handleEventConfigChange}
        />
        <label for="composed"><code>composed</code></label>
      </section>

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
