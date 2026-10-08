export function pickWeighted<T extends { readonly weight: number }>(
  items: readonly T[],
  rng: () => number,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const hasInvalidWeight = items.some((item) => !Number.isInteger(item.weight) || item.weight <= 0);
  let remaining = Math.floor(rng() * total);

  if (hasInvalidWeight) {
    throw new Error('Weighted pick requires positive integer weights.');
  }

  for (const item of items) {
    if (remaining < item.weight) {
      return item;
    }
    remaining -= item.weight;
  }

  throw new Error('Weighted pick requires positive integer weights.');
}
