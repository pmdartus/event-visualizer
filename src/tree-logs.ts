import { LitElement, html, css, property, customElement } from "lit-element";

import { EventDispatchingStep } from "./lib/simulator";
import { getEventTargetLabel } from "./utils/label";

export type ChangeStepEvent = CustomEvent<{ step: number }>;

const STEP_DURATION = 2000;

@customElement("tree-logs")
export class TreeLogs extends LitElement {
  @property()
  steps: EventDispatchingStep[] = [];

  @property()
  activeStep: number = 0;

  @property()
  isPlaying: boolean = false;

  _playIntervalHandle: number | undefined;

  handlePlayPauseClick() {
    this.isPlaying = !this.isPlaying;
    clearInterval(this._playIntervalHandle);

    if (this.isPlaying) {
      this._playIntervalHandle = setInterval(() => {
        if (this.activeStep >= this.steps.length) {
          this.isPlaying = false;
          clearInterval(this._playIntervalHandle);
        }

        this.dispatchStepChange(this.activeStep + 1);
      }, STEP_DURATION);
    }
  }

  handleSliderChange(evt: Event) {
    const step = (evt.target as HTMLInputElement).valueAsNumber;

    this.isPlaying = false;

    clearInterval(this._playIntervalHandle);
    this.dispatchStepChange(step);
  }

  handleStepClick(step: number) {
    clearInterval(this._playIntervalHandle);
    this.dispatchStepChange(step);
  }

  dispatchStepChange(step: number) {
    const changeStepEvent: ChangeStepEvent = new CustomEvent("stepchange", {
      detail: { step },
    });

    this.dispatchEvent(changeStepEvent);
  }

  render() {
    const { steps, activeStep, isPlaying } = this;

    return html`
      <section class="player">
        <button @click=${this.handlePlayPauseClick} title=${isPlaying ? "Pause" : "Play"}>
          ${isPlaying ? "⏸" : "▶️"}
        </button>

        <input
          type="range"
          min="0"
          max=${steps.length - 1}
          .value=${activeStep}
          @input=${this.handleSliderChange}
        />
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
          ${steps.map(
            (step, index) => html`
              <tr
                class=${activeStep === index ? "active-step" : ""}
                @click=${() => this.handleStepClick(index)}
              >
                <th scope="row">${index + 1}</th>
                <td>${getEventTargetLabel(step.currentTarget)}</td>
                <td>${getEventTargetLabel(step.target)}</td>
                <td>${step.composedPath.map((node) => getEventTargetLabel(node)).join(", ")}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .player {
        display: flex;
      }

      .player input {
        flex-grow: 1;
      }

      table {
        width: 100%;
      }

      tr.active-step {
        background: #c7c7c7;
      }
    `;
  }
}
