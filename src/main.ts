import PRESETS, { Preset } from "./presets";

const SELECT_PRESET: HTMLSelectElement = document.querySelector(
  "#select-preset"
)!;
const PRESET_EDITOR: HTMLPreElement = document.querySelector("#editor-preset")!;

type TreeNode = Element | ShadowRoot;

interface DomTree {
  root: Element;
  nodes: TreeNode[];
}

function buildDomTree(html: string): DomTree {
  const tmpl = document.createElement("template");
  tmpl.innerHTML = html;

  const { content } = tmpl;
  if (content.children.length !== 1) {
    throw new Error(
      `Invalid preset. Expect 1 but found ${content.children.length} root elements`
    );
  }

  const root = content.children[0].cloneNode(true) as HTMLElement;

  const processed: TreeNode[] = [];
  const remaining: TreeNode[] = [root];

  let node;
  while ((node = remaining.pop())) {
    if (
      node instanceof HTMLTemplateElement &&
      node.hasAttribute("shadow-root")
    ) {
      const shadowRoot = node.parentElement!.attachShadow({
        mode: (node.getAttribute("mode") as ShadowRootMode) ?? "open",
      });

      // Append the template content in the newly created ShadowRoot and remove the original
      // template element.
      shadowRoot.append(node.content);
      node.remove();

      remaining.push(shadowRoot);
    } else {
      processed.push(node);
      remaining.push(...Array.from(node.children));
    }
  }

  return {
    root,
    nodes: processed,
  };
}

function handlePresetChange(preset: Preset) {
  const res = buildDomTree(preset.content);
  PRESET_EDITOR.textContent = preset.content;
}

(() => {
  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    SELECT_PRESET.appendChild(option);
  }

  SELECT_PRESET.addEventListener("change", (evt) => {
    const presetName = SELECT_PRESET.value;
    const preset = PRESETS.find((preset) => preset.id === presetName);

    if (!preset) {
      throw new Error(`Unknown preset "${presetName}".`);
    }

    handlePresetChange(preset);
  });

  handlePresetChange(PRESETS[0]);
})();
