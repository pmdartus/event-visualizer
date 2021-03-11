/**
 * @typedef {Object} Preset
 * @property {string} name - The template preset
 * @property {DocumentFragment} content - The template document fragment associated to the preset
 */

/** Reference to the <select> preset element */
const SELECT_PRESET = document.querySelector("#select-preset");
/** Reference to the editor element */
const PRESET_EDITOR = document.querySelector("#editor-preset");

/**
 * List of know presets.
 * @type {Preset[]}
 */
const PRESETS = Array.from(document.querySelectorAll('template[type="tree-preset"]')).map((template) => {
  return {
    name: template.getAttribute("name"),
    content: template.content,
  };
});

/**
 * Reference to the current tree root.
 * @type {(Element|undefined)}
 */
let treeRoot;

/** Current node identifier. It keeps incrementing */
let currentNodeId = 0;

/**
 *
 * @param {Preset} preset
 */
function processPreset(preset, handleEvent) {
  if (preset.content.children.length !== 1) {
    throw new Error(
      `Invalid preset. Expect 1 but found ${preset.content.children.length} root elements`
    );
  }

  const originalRoot = preset.content.children[0];
  const root = originalRoot.cloneNode(true);

  /** @type {(Element|DocumentFragment)[]} */
  const processQueue = [root];

  /** @type {Map<string, Node>} */
  const idToNodeLookup = new Map();
  /** @type {Map<Node, string>} */
  const nodeToIdLookup = new Map();

  /** @type {Node} */
  let node;
  while ((node = processQueue.pop())) {
    if (
      node instanceof HTMLTemplateElement &&
      node.hasAttribute("shadow-root")
    ) {
      const shadowRoot = node.parentElement.attachShadow({
        mode: node.getAttribute("mode") ?? "open",
      });

      // Append the template content in the newly created ShadowRoot and remove the original
      // template element.
      shadowRoot.append(node.content);
      node.remove();

      processQueue.push(shadowRoot);
    } else {
      const id = String(currentNodeId++);

      idToNodeLookup.set(id, node);
      nodeToIdLookup.set(node, id);

      node.addEventListener("test", handleEvent);

      processQueue.push(...node.children);
    }
  }

  return {
    root,
    originalRoot,
    idToNodes: idToNodeLookup,
    nodesToId: nodeToIdLookup,
  };
}

/**
 * Apply a preset.
 * @param {Preset} preset
 */
function applyPreset(preset) {
  if (treeRoot) {
    treeRoot.remove();
  }

  const res = processPreset(preset, () => {
    console.log('TODO')
  });

  treeRoot = res.root;

  document.body.appendChild(res.root);
  PRESET_EDITOR.textContent = res.originalRoot.outerHTML;
}

/**
 * Initialization routine.
 */
(() => {
  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.textContent = preset.name;
    SELECT_PRESET.appendChild(option);
  }

  SELECT_PRESET.addEventListener("change", (evt) => {
    const preset = PRESETS.find((preset) => preset.name === evt.target.value);
    applyPreset(preset);
  });

  applyPreset(PRESETS[0]);
})();
