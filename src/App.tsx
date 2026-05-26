import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useStore } from './store';
import LegoBrick from './LegoBrick';

export default function App() {
  const { bricks, addBrick, updatePosition } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => setIsDragging(true), []);
  const handleDragEnd = useCallback(
    (id: number, x: number, z: number) => {
      setIsDragging(false);
      updatePosition(id, x, z);
    },
    [updatePosition]
  );

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6e6e8a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9a9ab8"
          fadeDistance={30}
          position={[0, -0.01, 0]}
        />
        <OrbitControls
          makeDefault
          enablePan={!isDragging}
          enableZoom={!isDragging}
          enableRotate={!isDragging}
        />
        {bricks.map((b) => (
          <LegoBrick
            key={b.id}
            brick={b}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Canvas>

      <button
        onClick={addBrick}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 28px',
          fontSize: 18,
          fontWeight: 600,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          zIndex: 10,
        }}
      >
        + Add Brick
      </button>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#9a9ab8',
          fontSize: 14,
          fontFamily: 'monospace',
          zIndex: 10,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        Drag bricks to build • Click "+ Add Brick" for more
      </div>
    </div>
  );
}
