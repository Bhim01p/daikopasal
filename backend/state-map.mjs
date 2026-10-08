// Cloud instances share authentication and limits; local development retains
// its existing in-memory behavior. Values are private backend state.
export function stateMap(store, name) {
  if (!store.transaction) return new Map();
  const entries = () => store.read().runtimeState?.[name] || [];
  const write = (values) => {
    const current = store.read();
    store.commit({
      ...current,
      runtimeState: { ...current.runtimeState, [name]: values },
    });
  };
  return {
    get(key) {
      return entries().find(([id]) => id === key)?.[1];
    },
    set(key, value) {
      write([...entries().filter(([id]) => id !== key), [key, value]]);
      return this;
    },
    delete(key) {
      if (!entries().some(([id]) => id === key)) return false;
      write(entries().filter(([id]) => id !== key));
      return true;
    },
    values() {
      return entries()
        .map(([, value]) => value)
        .values();
    },
    [Symbol.iterator]() {
      return entries()[Symbol.iterator]();
    },
  };
}
