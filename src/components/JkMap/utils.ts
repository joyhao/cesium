export function query(selector: string) {
  return document.querySelector(selector) as HTMLElement;
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
