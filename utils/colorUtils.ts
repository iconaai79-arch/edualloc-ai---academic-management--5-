export const generatePastelColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  // Using high lightness and moderate saturation for a soft pastel color
  return `hsl(${h}, 80%, 92%)`;
};
