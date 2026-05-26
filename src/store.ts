import { useState, useCallback } from 'react';

export interface Brick {
  id: number;
  position: [number, number, number];
  color: string;
}

let nextId = 1;

const COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#264653', '#6d6875', '#b5838d',
  '#4c9f70', '#7b2cbf',
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]!;
}

export function useStore() {
  const [bricks, setBricks] = useState<Brick[]>([
    { id: 0, position: [0, 0.5, 0], color: randomColor() },
  ]);

  const addBrick = useCallback(() => {
    const id = nextId++;
    setBricks((prev) => [
      ...prev,
      {
        id,
        position: [
          Math.round(Math.random() * 6 - 3),
          0.5,
          Math.round(Math.random() * 6 - 3),
        ],
        color: randomColor(),
      },
    ]);
  }, []);

  const updatePosition = useCallback((id: number, x: number, z: number) => {
    setBricks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, position: [x, 0.5, z] } : b
      )
    );
  }, []);

  return { bricks, addBrick, updatePosition };
}
