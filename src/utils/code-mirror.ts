import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { defaultKeymap, defaultTabBinding } from "@codemirror/commands";
import { lineNumbers } from "@codemirror/gutter";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { history, historyKeymap } from "@codemirror/history";
import { html } from "@codemirror/lang-html";
import { indentOnInput } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap } from "@codemirror/view";

/**
 * Wrapper utility around CodeMirror v6.
 * More details: https://codemirror.net/6/docs/ref/
 */

// Custom code mirror setup inspired from `@codemirror/basic-setup` with only the strict minimum.
// It reduces the generated bundle size by around 100KB (minified).
const CUSTOM_SETUP = [
  // Extension
  lineNumbers(),
  history(),
  indentOnInput(),
  closeBrackets(),
  highlightActiveLine(),
  html(),

  // Keymap
  keymap.of([defaultTabBinding, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),

  // Code highlighting
  defaultHighlightStyle,
];

export function createEditor({
  parent,
  root,
  onInput,
}: {
  parent: Element;
  root: ShadowRoot;
  onInput: (value: string) => void;
}): EditorView {
  const updateListenerExtension = EditorView.updateListener.of((viewUpdate) => {
    if (viewUpdate.docChanged) {
      const value = viewUpdate.state.doc.toString();
      onInput(value);
    }
  });

  const state = EditorState.create({
    extensions: [CUSTOM_SETUP, updateListenerExtension],
  });

  return new EditorView({
    parent,
    root,
    state,
  });
}

export function replaceEditorContent({ content, view }: { content: string; view: EditorView }) {
  const docLength = view.state.doc.length;
  view.dispatch({
    changes: {
      from: 0,
      to: docLength,
      insert: content,
    },
  });
}
