export interface Preset {
  id: string;
  label: string;
  rawTree: string;
  targetId: string;
}

const SIMPLE_TREE = `
<div id="a">
  <div id="b"></div>
</div>
`.trim();

const SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b"></div>
  </template>
</div>
`.trim();

const NESTED_SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b">
      <template shadow-root mode="open">
        <div id="c"></div>
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
  <div id="c"></div>
</div>
`.trim();

const PRESETS: Preset[] = [
  {
    id: "simple-tree",
    label: "A simple tree",
    rawTree: SIMPLE_TREE,
    targetId: "b",
  },
  {
    id: "shadow-tree",
    label: "A single shadow tree",
    rawTree: SHADOW_TREE,
    targetId: "b",
  },
  {
    id: "nested-shadow-tree",
    label: "Shadow trees nested into one another",
    rawTree: NESTED_SHADOW_TREE,
    targetId: "c",
  },
  {
    id: "slotted-content",
    label: "A single shadow tree with slotted content",
    rawTree: SLOTTED_CONTENT,
    targetId: "c",
  },
];

export default PRESETS;
