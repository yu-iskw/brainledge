export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

export function setText(id: string, text: string): void {
  byId<HTMLElement>(id).textContent = text;
}
