export function pickWeighted<T extends { readonly weight: number }>(
  items: readonly T[],
  rng: () => number,
): T {
  if (items.length === 0) {
    throw new Error('Weighted pick requires at least one item.');
  }
  if (items.some((item) => !Number.isInteger(item.weight) || item.weight <= 0)) {
    throw new Error('Weighted pick requires positive integer weights.');
  }

  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let remaining = Math.floor(rng() * total);

  for (const item of items) {
    if (remaining < item.weight) {
      return item;
    }
    remaining -= item.weight;
  }

  throw new Error('Weighted pick requires positive integer weights.');
}
