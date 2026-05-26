import { useState, useCallback } from 'react';

export interface Brick {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
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
    { id: 0, position: [0, 0.5, 0], rotation: [0, 0, 0], color: randomColor() },
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
        rotation: [0, 0, 0],
        color: randomColor(),
      },
    ]);
  }, []);

  const addBricks = useCallback((count: number) => {
    const newBricks: Brick[] = [];
    for (let i = 0; i < count; i++) {
      newBricks.push({
        id: nextId++,
        position: [
          Math.round(Math.random() * 6 - 3),
          0.5,
          Math.round(Math.random() * 6 - 3),
        ],
        rotation: [0, 0, 0],
        color: randomColor(),
      });
    }
    setBricks((prev) => [...prev, ...newBricks]);
  }, []);

  const updateBrick = useCallback(
    (id: number, position: [number, number, number], rotation: [number, number, number]) => {
      setBricks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, position, rotation } : b))
      );
    },
    []
  );

  return { bricks, addBrick, addBricks, updateBrick };
}
