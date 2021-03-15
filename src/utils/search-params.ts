export function loadStateFromSearchParams() {
  const { searchParams } = new URL(window.location.href);

  const rawTree = searchParams.get("raw-tree");
  const targetId = searchParams.get("target-id");
  const eventConfig = {
    bubbles: searchParams.has("event-bubbles") ? Boolean(searchParams.has("event-bubbles")) : true,
    composed: searchParams.has("event-composed")
      ? Boolean(searchParams.has("event-composed"))
      : true,
  };

  return {
    rawTree,
    targetId,
    eventConfig,
  };
}

export function saveStateToSearchParams(rawTree: string, targetId: string) {
  const searchParams = new URLSearchParams({
    "raw-tree": rawTree,
    "target-id": targetId,
  });

  const newLocation = new URL(window.location.href);
  newLocation.search = searchParams.toString();

  window.history.replaceState({}, "", newLocation.toString());
}
