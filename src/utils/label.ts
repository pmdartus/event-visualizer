export function getEventTargetLabel(target: EventTarget): string {
  if (target instanceof Element) {
    let label = target.tagName.toLocaleLowerCase();
    if (target.hasAttribute("id")) {
      label += `#${target.getAttribute("id")}`;
    }
    return label;
  } else if (target instanceof ShadowRoot) {
    return "[shadow-root]";
  }

  throw new Error(`Unknown event target. Can't compute a label for it`);
}
