/** Higher digits roll only as the lower places carry, in either direction. */
export function counterDigitPosition(value: number, place: number) {
  const magnitude = Math.abs(value), unit = 10 ** place;
  return place === 0 ? magnitude % 10 : Math.floor(magnitude / unit) % 10 + Math.max(0, magnitude % unit - (unit - 1));
}
