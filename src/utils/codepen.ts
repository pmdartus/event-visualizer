import EventVisualizer from "../event-visualizer";

/**
 * Create a new Code Pen editor from a event visualizer element.
 * Details: https://blog.codepen.io/documentation/prefill/
 */
export function openInCodePen(eventVisualizer: EventVisualizer) {
  const title = eventVisualizer.label;
  const serializedElement = eventVisualizer.outerHTML;

  let html = serializedElement;
  html += `\n <script type="module" src="https://cdn.skypack.dev/@pmdartus/event-visualizer"></script>`;

  const data = {
    title,
    html,
    layout: "left",
    editors: "100", // HTML opened, CSS and JS closed
  };

  const form = document.createElement("form");
  form.action = "https://codepen.io/pen/define";
  form.method = "POST";
  form.target = "_blank";
  form.style.display = "none";

  const input = document.createElement("input");
  input.name = "data";
  input.value = JSON.stringify(data);

  form.append(input);
  document.body.append(form);

  form.submit();
  form.remove();
}
