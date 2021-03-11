export interface Preset {
  id: string,
  label: string,
  content: string,
}

const SIMPLE_TREE = `
<div id="a">
  <div id="b"></div>
</div>
`;

const SHADOW_TREE = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b"></div>
  </template>
</div>
`;

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
`;

const SLOTTED_CONTENT = `
<div id="a">
  <template shadow-root mode="open">
    <div id="b">
      <slot></slot>
    </div>
  </template>
  <div id="c"></div>
</div>
`;

const PRESETS: Preset[] = [{
  id: 'simple-tree',
  label: 'A simple tree',
  content: SIMPLE_TREE,
}, {
  id: 'shadow-tree',
  label: 'A single shadow tree',
  content: SHADOW_TREE,
}, {
  id: 'nested-shadow-tree',
  label: 'Shadow trees nested into one another',
  content: NESTED_SHADOW_TREE,
}, {
  id: 'slotted-content',
  label: 'A single shadow tree with slotted content',
  content: SLOTTED_CONTENT
}];

export default PRESETS;