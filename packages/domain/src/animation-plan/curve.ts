export function spinProgress(t: number, accelFraction: number, decelPower: number): number {
  const clampedTime = Math.min(Math.max(t, 0), 1);
  if (clampedTime <= 0) {
    return 0;
  }
  if (clampedTime >= 1) {
    return 1;
  }

  const accelDistance = accelFraction / 2;
  const decelDistance = (1 - accelFraction) / (decelPower + 1);
  const maxVelocity = 1 / (accelDistance + decelDistance);

  if (clampedTime <= accelFraction) {
    return (maxVelocity * (clampedTime * clampedTime)) / (2 * accelFraction);
  }

  return (
    maxVelocity * accelDistance +
    maxVelocity *
      decelDistance *
      (1 - ((1 - clampedTime) / (1 - accelFraction)) ** (decelPower + 1))
  );
}
