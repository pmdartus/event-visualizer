import EventVisualizer from "./event-visualizer";

declare global {
  interface HTMLElementTagNameMap {
    "event-visualizer": EventVisualizer;
  }
}

export default EventVisualizer;
