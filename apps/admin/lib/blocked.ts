export function showBlocked(message: string, setError: (msg: string) => void) {
  setError(message);
  window.alert(message);
}
