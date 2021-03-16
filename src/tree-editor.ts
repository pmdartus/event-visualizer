import { LitElement, html, css, property, customElement, PropertyValues } from "lit-element";

import { debounce } from "./utils/debounce";
import { createEditor, replaceEditorContent, EditorView } from "./utils/code-mirror";

export type ChangeEvent = CustomEvent<{ value: string }>;

const DEBOUNCE_DURATION = 300;

@customElement("tree-editor")
export class TreeEditor extends LitElement {
  @property()
  value!: string;

  private editorView: EditorView | undefined;

  render() {
    return html` <div id="editor"></div> `;
  }

  firstUpdated() {
    const debouncedInputChange = debounce((value: string) => {
      const treeChangeEvent: ChangeEvent = new CustomEvent("change", {
        detail: {
          value: value,
        },
      });

      this.dispatchEvent(treeChangeEvent);
    }, DEBOUNCE_DURATION);

    this.editorView = createEditor({
      root: this.shadowRoot!,
      parent: this.shadowRoot?.querySelector("div")!,
      onInput: debouncedInputChange,
    });
  }

  updated(props: PropertyValues) {
    if (props.has("value")) {
      replaceEditorContent({
        content: this.value,
        view: this.editorView!,
      });
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
    `;
  }
}
