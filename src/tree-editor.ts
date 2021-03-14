import { LitElement, html, css, property, customElement } from "lit-element";
import { debounce } from "./utils/debounce";

import PRESETS from "./utils/presets";

@customElement("tree-editor")
export class TreeEditor extends LitElement {
  @property({
    attribute: true,
    reflect: true,
    type: String,
  })
  presetId: string | null = null;

  @property({
    attribute: true,
    type: String,
  })
  value = "";

  get preset() {
    return PRESETS.find((preset) => preset.id === this.presetId);
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
        min-height: 100px;
      }
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.value) {
      this.presetId = PRESETS[0].id;
    }
  }

  handlePresetChange(evt: Event) {
    this.presetId = (evt.target as HTMLSelectElement).value;

    this.dispatchPresetChange();
    this.dispatchTreeChange(this.preset!.content);
  }

  dispatchPresetChange() {
    this.dispatchEvent(
      new CustomEvent("presetchange", {
        detail: {
          id: this.presetId,
        },
      })
    );
  }

  dispatchTreeChange(content: string) {
    this.dispatchEvent(
      new CustomEvent("treechange", {
        detail: {
          html: content,
        },
      })
    );
  }

  render() {
    return html`
      <select @change=${this.handlePresetChange}>
        <option disabled>Select an example...</option>
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
        .value=${this.value || this.preset.content.trim()}
        @input=${(evt: Event) => debouncedInputChange((evt.target as HTMLTextAreaElement).value)}
      ></textarea>
    `;
  }
}
