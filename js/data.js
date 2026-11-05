export const players = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;

  return {
    id: index + 1,
    name: `Người ${index + 1}`,
    alive: true,
    role: null,
    x: 50 + Math.cos(angle) * 25,
    y: 61 + Math.sin(angle) * 18
  };
});
