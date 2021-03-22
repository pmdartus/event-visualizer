import { customElement, html, css, LitElement, property, PropertyValues } from "lit-element";

export type StepChangeEvent = CustomEvent<{ step: number }>;

const STEP_DURATION = 3_000;

@customElement("player-controls")
export default class PlayerControls extends LitElement {
  @property() steps = [];
  @property() activeStep = 0;
  @property() isPlaying: boolean = false;

  _playIntervalHandle?: number;

  play() {
    this.isPlaying = true;

    // Clear existing interval in case the play method is called twice without calling stop in
    // between.
    clearInterval(this._playIntervalHandle);

    this._playIntervalHandle = setInterval(() => {
      const nextStep = this.activeStep + 1;
      this.dispatchStepChange(nextStep);

      // Stop the animation when reaching the end of the steps.
      const isAtEnd = nextStep >= this.steps.length - 1;
      if (isAtEnd) {
        this.stop();
      }
    }, STEP_DURATION);
  }

  stop() {
    this.isPlaying = false;
    clearInterval(this._playIntervalHandle);
  }

  handleSetStep(step: number) {
    this.stop();
    this.dispatchStepChange(step);
  }

  dispatchStepChange(step: number) {
    const changeStepEvent: StepChangeEvent = new CustomEvent("stepchange", {
      detail: { step },
    });

    this.dispatchEvent(changeStepEvent);
  }

  updated(props: PropertyValues) {
    // Stop current animation when new steps are set.
    if (props.has("steps")) {
      this.stop();
    }
  }

  render() {
    let mainButton;

    if (this.isPlaying) {
      mainButton = html`<button title="Pause" @click=${() => this.stop()}>⏸</button>`;
    } else {
      if (this.activeStep < this.steps.length - 1) {
        mainButton = html`<button title="Play" @click=${() => this.play()}>▶️</button>`;
      } else {
        mainButton = html`<button
          title="Reset"
          ?disabled=${this.steps.length <= 1}
          @click=${() => this.handleSetStep(0)}
        >
          ↩️
        </button>`;
      }
    }

    return html`
      <div id="buttons">
        <button
          title="Previous step"
          ?disabled=${this.activeStep === 0}
          @click=${() => this.handleSetStep(this.activeStep - 1)}
        >
          ⏮
        </button>
        ${mainButton}
        <button
          title="Next step"
          ?disabled=${this.activeStep === this.steps.length - 1}
          @click=${() => this.handleSetStep(this.activeStep + 1)}
        >
          ⏭
        </button>
      </div>
      <input
        title="Active step"
        type="range"
        min="0"
        max=${this.steps.length - 1}
        .value=${this.activeStep}
        @input=${(evt: Event) => this.handleSetStep((evt.target as HTMLInputElement).valueAsNumber)}
      />
    `;
  }

  static styles = css`
    :host {
      display: flex;
    }

    #buttons button {
      margin: 0 0.1em;
    }

    input[type="range"] {
      flex-grow: 1;
    }
  `;
}
