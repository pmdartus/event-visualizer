import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";
import type { EditorView } from "@codemirror/view";

import "./utils/code-mirror";

import PRESETS from "./utils/presets";
import { debounce } from "./utils/debounce";
import { createEditor, replaceEditorContent } from "./utils/code-mirror";

export type PresetChangeEvent = CustomEvent<{ id: string }>;
export type TreeChangeEvent = CustomEvent<{ value: string }>;

const DEBOUNCE_DURATION = 300;

@customElement("tree-editor")
export class TreeEditor extends LitElement {
  @property()
  presetId: string | null = null;

  @property()
  value = "";

  private editorView!: EditorView;

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

      <div></div>
    `;
  }

  firstUpdated() {
    this.editorView = createEditor({
      root: this.shadowRoot!,
      parent: this.shadowRoot?.querySelector("div")!,
      onInput: (value) => {
        this.dispatchTreeChange(value);
      },
    });
  }

  updated(props: PropertyValues) {
    if (props.has("value")) {
      replaceEditorContent({
        content: this.value,
        view: this.editorView,
      });
    }
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
    `;
  }
}
