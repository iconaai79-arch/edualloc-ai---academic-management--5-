export const generatePastelColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  // Using high lightness and moderate saturation for a soft pastel color
  return `hsl(${h}, 80%, 92%)`;
};
};

export const generatePastelColorRgb = (seed: string): [number, number, number] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hEncoded = hash % 360;
  const h = hEncoded < 0 ? hEncoded + 360 : hEncoded; // Ensure positive hue
  const s = 0.8; // 80%
  const l = 0.92; // 92%

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};
