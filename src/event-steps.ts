import { LitElement, html, css, property, customElement } from "lit-element";

import { EventDispatchingStep, TreeNode, TreeNodeType } from "./dom.js";

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

  render() {
    const { steps, activeStep, eventConfig } = this;

    return html`
      <ol>
        ${steps.map((step, i) => {
          let content;
          let previousStep: EventDispatchingStep | undefined;

          if (i === 0) {
            content = html`
              <p>
                Dispatching
                <code>
                  new Event({ bubbles: ${eventConfig.bubbles ?? false}, composed:
                  ${eventConfig.composed ?? false}})
                </code>
                on <code>${getNodeLabel(step.currentTarget)}</code>.
              </p>
            `;
          } else {
            content = html`<p>
              Event propagates to <code>${getNodeLabel(step.currentTarget)}</code>.
            </p>`;
            previousStep = steps[i - 1];
          }

          const isEventRetargeted = step.target !== previousStep?.target;
          if (isEventRetargeted) {
            content = html`
              ${content}
              <p>Target is set to <code>${getNodeLabel(step.target)}</code>.</p>
            `;
          }

          const isComposedPathUpdated =
            step.composedPath.length !== previousStep?.composedPath.length ||
            step.composedPath.some((target, i) => target !== previousStep?.composedPath[i]);
          if (isComposedPathUpdated) {
            content = html`
              ${content}
              <p>
                Composed path is set to
                <code
                  >[${step.composedPath
                    .map((eventTarget) => getNodeLabel(eventTarget))
                    .join(", ")}]</code
                >.
              </p>
            `;
          }

          return html`<li class=${i === activeStep ? "active" : ""}>
            <button @click=${() => this.dispatchStepChange(i)}>
              <div class="counter">${i + 1}</div>
              <div class="description">${content}</div>
            </button>
          </li>`;
        })}
      </ol>
    `;
  }

  static styles = css`
    :host {
      display: block;

      --active-step-color: #e0f0ff;
      --hover-step-color: #e1e8ee;

      --counter-color: #fff;
      --counter-background-color: #80868b;
      --active-counter-background-color: #1a73e8;
    }

    ol,
    li {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li button {
      /* Reset button styles */
      border: 0;
      background: inherit;
      text-align: left;
      text-decoration: none;
      font-size: inherit;
      cursor: pointer;

      /* Apply custom button style for list item */
      width: 100%;
      display: flex;
      padding: 0.5em;
      align-items: center;
      transition: background 0.3s ease;
    }

    li.active button {
      background: var(--active-step-color);
    }

    li .counter {
      margin: 0 1em;
      border-radius: 1em;
      line-height: 2em;
      width: 2em;
      min-width: 2em;
      font-weight: bold;
      text-align: center;
      color: var(--counter-color);
      background: var(--counter-background-color);
    }

    li.active .counter {
      background: var(--active-counter-background-color);
    }

    li .description {
      line-height: 1.3em;
      flex-grow: 1;
    }

    li .description p {
      margin: 0.3em;
    }
  `;
}
