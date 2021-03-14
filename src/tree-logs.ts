import { LitElement, html, css, property, customElement } from "lit-element";

import { EventDispatchingStep } from "./simulator";
import { getEventTargetLabel } from "./utils/label";

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

  handleInputChange(evt: Event) {
    const step = (evt.target as HTMLInputElement).valueAsNumber;

    this.isPlaying = false;
    clearInterval(this._playIntervalHandle);
  }

  handleStepClick(step: number) {
    clearInterval(this._playIntervalHandle);
    this.dispatchStepChange(step);
  }

  dispatchStepChange(step: number) {
    this.dispatchEvent(
      new CustomEvent("stepchange", {
        detail: { step },
      })
    );
  }

  render() {
    const { steps, activeStep, isPlaying: isPlayingSteps } = this;

    return html`
      <button @click=${this.handlePlayPauseClick} title=${isPlayingSteps ? "Pause" : "Play"}>
        ${isPlayingSteps ? "⏸" : "▶️"}
      </button>

      <input
        type="range"
        min="0"
        max=${steps.length}
        .value=${activeStep}
        @value=${this.handleInputChange}
      />

      <ul>
        ${steps.map(
          (step, index) => html`
            <li
              class=${activeStep === index ? "active" : ""}
              @click=${() => this.handleStepClick(index)}
            >
              <strong>Current target:</strong>
              <code>${getEventTargetLabel(step.currentTarget)}</code> | <strong>Target:</strong>
              <code>${getEventTargetLabel(step.target)}</code> |
              <strong>Composed Path:</strong>
              <code>
                ${step.composedPath.map((node) => getEventTargetLabel(node)).join(", ")}
              </code>
            </li>
          `
        )}
      </ul>
    `;
  }
}
