import { useState, useRef, useCallback } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { useStore } from './store';
import LegoBrick from './LegoBrick';

type TransformMode = 'translate' | 'rotate';

export default function App() {
  const { bricks, addBricks, updateBrick } = useStore();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mode, setMode] = useState<TransformMode>('translate');
  const controlsRef = useRef<OrbitControlsType>(null);
  const brickGroupRef = useRef<THREE.Group>(null);

  const saveActiveTransform = useCallback(() => {
    if (brickGroupRef.current && activeId !== null) {
      const p = brickGroupRef.current.position;
      const r = brickGroupRef.current.rotation;
      updateBrick(activeId, [p.x, p.y, p.z], [r.x, r.y, r.z]);
    }
  }, [activeId, updateBrick]);

  const selectBrick = useCallback((id: number | null) => {
    saveActiveTransform();
    setActiveId(id);
    if (controlsRef.current) controlsRef.current.enabled = id === null;
  }, [saveActiveTransform]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>, id: number) => {
    e.stopPropagation();
    saveActiveTransform();
    if (controlsRef.current) controlsRef.current.enabled = false;
    setActiveId(id);
  }, [saveActiveTransform]);

  const handlePointerUp = useCallback(() => {
    saveActiveTransform();
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [saveActiveTransform]);

  const handleAddBricks = useCallback(() => {
    saveActiveTransform();
    setActiveId(null);
    addBricks(3);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [saveActiveTransform, addBricks]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [10, 8, 10], fov: 50 }}
        onPointerMissed={() => selectBrick(null)}
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
      </Canvas>

      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        {(['translate', 'rotate'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 600, border: 'none',
              borderRadius: 8, cursor: 'pointer',
              background: mode === m
                ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                : 'rgba(255,255,255,0.1)',
              color: '#fff',
              boxShadow: mode === m ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {m === 'translate' ? 'Move' : 'Rotate'}
          </button>
        ))}
      </div>

      <button
        onClick={handleAddBricks}
        style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 28px', fontSize: 18, fontWeight: 600,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          zIndex: 10,
        }}
      >
        + Add 3 Bricks
      </button>

      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: '#9a9ab8', fontSize: 13, fontFamily: 'monospace',
        zIndex: 10, textAlign: 'center', pointerEvents: 'none',
        opacity: 0.8,
      }}>
        Клик на кубик — выбрать • Move / Rotate — режим • Свободное место — снять выделение
      </div>
    </div>
  );
}
