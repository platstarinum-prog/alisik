import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { useStore, type Brick } from './store';
import LegoBrick from './LegoBrick';

function Scene({
  bricks,
  onDragStart,
  onDragEnd,
}: {
  bricks: Brick[];
  onDragStart: () => void;
  onDragEnd: (id: number, x: number, z: number) => void;
}) {
  const controlsRef = useRef<OrbitControlsType>(null);

  return (
    <>
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
      <OrbitControls ref={controlsRef} makeDefault />
      {bricks.map((b) => (
        <LegoBrick
          key={b.id}
          brick={b}
          onDragStart={() => {
            if (controlsRef.current) controlsRef.current.enabled = false;
            onDragStart();
          }}
          onDragEnd={(id, x, z) => {
            if (controlsRef.current) controlsRef.current.enabled = true;
            onDragEnd(id, x, z);
          }}
        />
      ))}
    </>
  );
}

export default function App() {
  const { bricks, addBrick, updatePosition } = useStore();
  const [, forceUpdate] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
        <Scene
          bricks={bricks}
          onDragStart={() => {}}
          onDragEnd={(id, x, z) => {
            updatePosition(id, x, z);
            forceUpdate((c) => c + 1);
          }}
        />
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
          WebkitUserSelect: 'none',
          userSelect: 'none',
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
        ЛКМ на кубике — перетащить • ПКМ/колёсико — вращать/зум
      </div>
    </div>
  );
}
