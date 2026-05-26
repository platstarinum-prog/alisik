import { useState, useRef } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { useStore } from './store';
import LegoBrick from './LegoBrick';

type TransformMode = 'translate' | 'rotate';

function Scene({
  activeId,
  mode,
  onSelect,
  onUpdate,
}: {
  activeId: number | null;
  mode: TransformMode;
  onSelect: (id: number | null) => void;
  onUpdate: (id: number, pos: [number, number, number], rot: [number, number, number]) => void;
}) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const brickGroupRef = useRef<THREE.Group>(null);
  const { bricks } = useStore();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, id: number) => {
    e.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;
    onSelect(id);
  };

  const handlePointerUp = () => {
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (brickGroupRef.current && activeId !== null) {
      const p = brickGroupRef.current.position;
      const r = brickGroupRef.current.rotation;
      onUpdate(activeId, [
        Math.round(p.x * 2) / 2,
        Math.round(p.y * 2) / 2,
        Math.round(p.z * 2) / 2,
      ], [r.x, r.y, r.z]);
    }
  };

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
      <OrbitControls ref={controlsRef} makeDefault enableDamping={false} />

      {bricks.map((b) => {
        const isActive = b.id === activeId;
        return (
          <group key={b.id}>
            {isActive && (
              <TransformControls
                mode={mode}
                snap={mode === 'translate' ? 0.5 : Math.PI / 4}
                onPointerUp={handlePointerUp}
              >
                <group ref={brickGroupRef}>
                  <LegoBrick brick={b} />
                </group>
              </TransformControls>
            )}
            {!isActive && (
              <group onPointerDown={(e) => handlePointerDown(e, b.id)}>
                <LegoBrick brick={b} />
              </group>
            )}
          </group>
        );
      })}
    </>
  );
}

export default function App() {
  const { addBrick, updateBrick } = useStore();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mode, setMode] = useState<TransformMode>('translate');

  const handleCanvasClick = () => {
    setActiveId(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [10, 8, 10], fov: 50 }}
        onPointerMissed={handleCanvasClick}
      >
        <Scene
          activeId={activeId}
          mode={mode}
          onSelect={(id) => {
            if (id !== null) setActiveId(id);
          }}
          onUpdate={(id, pos, rot) => {
            updateBrick(id, pos, rot);
          }}
        />
      </Canvas>

      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        <button
          onClick={() => setMode('translate')}
          style={{
            padding: '8px 16px', fontSize: 14, fontWeight: 600, border: 'none',
            borderRadius: 8, cursor: 'pointer',
            background: mode === 'translate'
              ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
              : 'rgba(255,255,255,0.1)',
            color: '#fff',
            boxShadow: mode === 'translate' ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          Move
        </button>
        <button
          onClick={() => setMode('rotate')}
          style={{
            padding: '8px 16px', fontSize: 14, fontWeight: 600, border: 'none',
            borderRadius: 8, cursor: 'pointer',
            background: mode === 'rotate'
              ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
              : 'rgba(255,255,255,0.1)',
            color: '#fff',
            boxShadow: mode === 'rotate' ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          Rotate
        </button>
      </div>

      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        <button
          onClick={() => { setActiveId(null); addBrick(); }}
          style={{
            padding: '12px 28px', fontSize: 18, fontWeight: 600,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          }}
        >
          + Add Brick
        </button>
      </div>

      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: '#9a9ab8', fontSize: 13, fontFamily: 'monospace',
        zIndex: 10, textAlign: 'center', pointerEvents: 'none',
        opacity: 0.8,
      }}>
        Клик на кубик — выбрать • Move / Rotate — режим • Клик на пустое место — снять выделение
      </div>
    </div>
  );
}
