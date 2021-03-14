import { LitElement, html, css, property, customElement } from "lit-element";
import { debounce } from "./utils/debounce";

import PRESETS from "./utils/presets";

export type PresetChangeEvent = CustomEvent<{ id: string }>;
export type TreeChangeEvent = CustomEvent<{ value: string }>;

const DEBOUNCE_DURATION = 300;

@customElement("tree-editor")
export class TreeEditor extends LitElement {
  @property()
  presetId: string | null = null;

  @property()
  value = "";

  debouncedInputChange = debounce(
    (value: string) => this.dispatchTreeChange(value),
    DEBOUNCE_DURATION
  );

  handlePresetChange(evt: Event) {
    const presetChangeEvent: PresetChangeEvent = new CustomEvent("presetchange", {
      detail: {
        id: (evt.target as HTMLSelectElement).value,
      },
    });

    this.dispatchEvent(presetChangeEvent);
  }

  dispatchTreeChange(value: string) {
    const treeChangeEvent: TreeChangeEvent = new CustomEvent("treechange", {
      detail: {
        value: value,
      },
    });

    this.dispatchEvent(treeChangeEvent);
  }

  render() {
    console.log("ici");
    return html`
      <select @change=${this.handlePresetChange}>
        <option disabled ?selected=${this.presetId === null}>Select an example...</option>
        ${PRESETS.map(
          (preset) =>
            html`
              <option value=${preset.id} ?selected=${preset.id === this.presetId}>
                ${preset.label}
              </option>
            `
        )}
      </select>

      <textarea
        .value=${this.value}
        @input=${(evt: Event) =>
          this.debouncedInputChange((evt.target as HTMLTextAreaElement).value)}
      ></textarea>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      select {
        width: 100%;
        margin-bottom: 1rem;
      }

      textarea {
        display: block;
        background: #f5f5f5;
        width: 100%;
        min-height: 300px;
        resize: none;
      }
    `;
  }
}
