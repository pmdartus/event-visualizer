export function debounce<T>(fn: (...args: T[]) => void, duration: number) {
  let timeoutHandle: number | undefined;

  return (...args: T[]) => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    timeoutHandle = setTimeout(() => {
      fn(...args);
    }, duration);
  };
}
