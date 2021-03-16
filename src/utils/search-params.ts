interface SavedState {
  rawTree: string | null;
  eventConfig: {
    bubbles: boolean;
    composed: boolean;
  };
}

export function loadStateFromSearchParams(): SavedState {
  const { searchParams } = new URL(window.location.href);

  const rawTree = searchParams.get("raw-tree");
  const eventConfig = {
    bubbles: Boolean(searchParams.has("event-bubbles") ?? true),
    composed: Boolean(searchParams.has("event-composed") ?? true),
  };

  return {
    rawTree,
    eventConfig,
  };
}

export function saveStateToSearchParams(state: SavedState) {
  const searchParams = new URLSearchParams({
    "raw-tree": state.rawTree,
    "event-bubbles": String(state.eventConfig.bubbles),
    "event-composed": String(state.eventConfig.composed),
  });

  const newLocation = new URL(window.location.href);
  newLocation.search = searchParams.toString();

  window.history.replaceState({}, "", newLocation.toString());
}
