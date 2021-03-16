export interface Preset {
  id: string;
  label: string;
  rawTree: string;
}

const SIMPLE_TREE = `
<div id="a">
  <div id="b" target></div>
  <div id="c"></div>
</div>
`.trim();

const SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b" target></div>
  </template>
</div>
`.trim();

const NESTED_SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b">
      <template shadow-root mode="open">
        <div id="c" target></div>
      </template>
    </div>
  </template>
</div>
`.trim();

const CLOSED_NESTED_SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="closed">
    <div id="b">
      <template shadow-root mode="closed">
        <div id="c" target></div>
      </template>
    </div>
  </template>
</div>
`.trim();

const SLOTTED_CONTENT = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b">
      <slot></slot>
    </div>
  </template>
  <div id="c" target></div>
</div>
`.trim();

const PRESETS: Preset[] = [
  {
    id: "simple-tree",
    label: "A simple tree",
    rawTree: SIMPLE_TREE,
  },
  {
    id: "shadow-tree",
    label: "A single shadow tree",
    rawTree: SHADOW_TREE,
  },
  {
    id: "nested-shadow-tree",
    label: "Shadow trees nested into one another",
    rawTree: NESTED_SHADOW_TREE,
  },
  {
    id: "closed-nested-shadow-tree",
    label: "Closed shadow trees nested into one another",
    rawTree: CLOSED_NESTED_SHADOW_TREE,
  },
  {
    id: "slotted-content",
    label: "A single shadow tree with slotted content",
    rawTree: SLOTTED_CONTENT,
  },
];

export default PRESETS;
