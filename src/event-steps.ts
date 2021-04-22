import { LitElement, html, css, property, customElement } from "lit-element";

import { EventDispatchingStep, TreeNode, TreeNodeType } from "./dom.js";
import { classMap } from "./utils/class-map.js";

export type StepChangeEvent = CustomEvent<{ step: number }>;

function getNodeLabel(treeNode: TreeNode): string {
  if (treeNode.type === TreeNodeType.Element) {
    return `${treeNode.name}${treeNode.label ? `#${treeNode.label}` : ""}`;
  } else {
    return `[shadow-root${treeNode.label ? `#${treeNode.label}` : ""}]`;
  }
}

@customElement("event-steps")
export class EventSteps extends LitElement {
  @property() steps: EventDispatchingStep[] = [];
  @property() activeStep: number = 0;
  @property() eventConfig!: EventInit;

  protected dispatchStepChange(step: number) {
    const changeStepEvent: StepChangeEvent = new CustomEvent("stepchange", {
      detail: { step },
    });

    this.dispatchEvent(changeStepEvent);
  }

  protected handleListKey(evt: KeyboardEvent) {
    if (evt.code === "Enter" || evt.code === "Space") {
      const { step } = (evt.target as HTMLElement).dataset;
      if (!step) {
        return;
      }

      evt.preventDefault();
      this.dispatchStepChange(parseInt(step));
    }
  }

  render() {
    const { steps, activeStep, eventConfig } = this;

    const items = steps.map((step, i) => {
      let content;
      let previousStep: EventDispatchingStep | undefined;

      const { currentTarget, target, composedPath } = steps[activeStep];

      if (i === 0) {
        content = html`
          <p>
            Dispatching a ${eventConfig.bubbles ? "" : "non-"}bubbling and
            ${eventConfig.composed ? "" : "non-"}composed event on
            <b class=${classMap({ "current-target": currentTarget === step.currentTarget })}
              >${getNodeLabel(step.currentTarget)}.</b
            >
          </p>
        `;
      } else {
        content = html`<p>
          Event propagates to
          <b class=${classMap({ "current-target": currentTarget === step.currentTarget })}
            >${getNodeLabel(step.currentTarget)}</b
          >.
        </p>`;
        previousStep = steps[i - 1];
      }

      const isEventTargetUpdated = step.target !== previousStep?.target;
      if (isEventTargetUpdated) {
        content = html`
          ${content}
          <p>
            Target updated to
            <b class=${classMap({ target: target === step.target })}>${getNodeLabel(step.target)}</b
            >.
          </p>
        `;
      }

      const isComposedPathUpdated =
        step.composedPath.length !== previousStep?.composedPath.length ||
        step.composedPath.some((target, i) => target !== previousStep?.composedPath[i]);
      const isActiveComposedPath =
        composedPath.length === step.composedPath.length &&
        composedPath.every((target, i) => target === step.composedPath[i]);
      if (isComposedPathUpdated) {
        content = html`
          ${content}
          <p>
            Composed path updated to
            <b class=${classMap({ "composed-path": isActiveComposedPath })}
              >[${step.composedPath.map((eventTarget) => getNodeLabel(eventTarget)).join(", ")}]</b
            >.
          </p>
        `;
      }

      const isActive = i === activeStep;

      return html`<li
        class="step ${classMap({ active: isActive })}"
        tabindex="0"
        aria-selected="${String(isActive)}"
        @click=${() => this.dispatchStepChange(i)}
        data-step="${i}"
      >
        <div class="counter">${i + 1}</div>
        <div class="description">${content}</div>
      </li>`;
    });

    return html`
      <div class="step-controls">
        <button
          ?disabled=${activeStep === 0}
          @click=${() => this.dispatchStepChange(activeStep - 1)}
        >
          <b>❬</b> Previous step
        </button>
        <button
          ?disabled=${activeStep === steps.length - 1}
          @click=${() => this.dispatchStepChange(activeStep + 1)}
        >
          Next step <b>❭</b>
        </button>
      </div>

      <ol @keydown=${this.handleListKey}>
        ${items}
      </ol>
    `;
  }

  static styles = css`
    :host {
      display: block;

      --button-color: #3b82f6;
      --button-hover: #2b6cb0;

      --step-active-background: #f3f4f6;

      --step-counter-background: #9ca3af;
      --step-counter-active-background: #3b82f6;
    }

    ol,
    li {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    button {
      font-family: inherit;
      font-size: inherit;
      margin: 0;
      padding: 0;
      background-color: transparent;
      background-image: none;
      border: none;
      cursor: pointer;
    }

    button {
      padding: 0.5rem 1rem;
      color: #fff;
      background: var(--button-color);
      border-radius: var(--border-radius);
    }

    button:hover {
      background: var(--button-hover);
    }

    button[disabled] {
      background: var(--button-color);
      opacity: 0.5;
    }

    .step-controls {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-medium);
      margin-bottom: var(--spacing-medium);
    }

    .steps-controls button {
      display: block;
    }

    .step {
      padding: var(--spacing-medium);
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .step .counter {
      margin: 0 1em;
      border-radius: 1em;
      line-height: 2em;
      width: 2em;
      min-width: 2em;
      font-weight: 600;
      text-align: center;
      color: #fff;
      background: var(--step-counter-background);
    }

    .description {
      line-height: 1.3em;
      flex-grow: 1;
    }

    .description p {
      margin: 0.3em;
    }

    .description .current-target {
      color: var(--current-target-alt-color);
    }

    .description .target {
      color: var(--target-alt-color);
    }

    .description .composed-path {
      color: var(--composed-path-alt-color);
    }

    /* Step variant */

    .step.active,
    .step:hover,
    .step:focus {
      background: var(--step-active-background);
    }

    .step.active .counter {
      background: var(--step-counter-active-background);
    }

    .step.active .description {
      color: var(--color);
    }
  `;
}
