import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6d6875','#b5838d','#4c9f70','#7b2cbf'];
let nextId = 1;

type BrickData = { id: number; x: number; z: number; rot: number; color: string };

function makeBrick(): BrickData {
  return {
    id: nextId++,
    x: Math.round(Math.random()*6-3),
    z: Math.round(Math.random()*6-3),
    rot: 0,
    color: COLORS[Math.floor(Math.random()*COLORS.length)]!,
  };
}

function Brick({ data, onPointerDown, onPointerUp }: {
  data: BrickData;
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: number) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>, id: number) => void;
}) {
  return (
    <group position={[data.x, 0.5, data.z]} rotation={[0, data.rot, 0]}
      onPointerDown={(e) => onPointerDown(e, data.id)}
      onPointerUp={(e) => onPointerUp(e, data.id)}
    >
      <mesh>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color={data.color} roughness={0.6} metalness={0.1} />
      </mesh>
      {[-0.5,0.5].flatMap(x => [-1.5,-0.5,0.5,1.5].map(z => ({x,z}))).map((p,i) => (
        <mesh key={i} position={[p.x, 0.6, p.z]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 12]} />
          <meshStandardMaterial color={data.color} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ bricks, onMove, onSelect }: {
  bricks: BrickData[];
  onMove: (id: number, x: number, z: number) => void;
  onSelect: (id: number) => void;
}) {
  const controlsRef = useRef<any>(null);
  const draggingRef = useRef<number | null>(null);
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), -0.5);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  useFrame(({ camera, pointer }) => {
    const id = draggingRef.current;
    if (id === null) return;
    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      onMove(id, Math.round(hit.x), Math.round(hit.z));
    }
  });

  const handleDown = useCallback((e: ThreeEvent<PointerEvent>, id: number) => {
    e.stopPropagation();
    draggingRef.current = id;
    onSelect(id);
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [onSelect]);

  const handleUp = useCallback((_e: ThreeEvent<PointerEvent>, _id: number) => {
    draggingRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  return (
    <>
      <OrbitControls ref={controlsRef} makeDefault />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5,10,5]} intensity={1} />
      <directionalLight position={[-5,5,-5]} intensity={0.3} />
      <Grid args={[20,20]} cellSize={1} cellThickness={0.5} cellColor="#6e6e8a"
        sectionSize={5} sectionThickness={1} sectionColor="#9a9ab8"
        fadeDistance={30} position={[0,-0.01,0]} />
      {bricks.map(b => (
        <Brick key={b.id} data={b} onPointerDown={handleDown} onPointerUp={handleUp} />
      ))}
    </>
  );
}

export default function App() {
  const [bricks, setBricks] = useState<BrickData[]>([makeBrick()]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' && selectedId !== null) {
        setBricks(prev => prev.map(b =>
          b.id === selectedId ? { ...b, rot: b.rot + Math.PI / 2 } : b
        ));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  const handleMove = useCallback((id: number, x: number, z: number) => {
    setBricks(prev => prev.map(b => b.id === id ? { ...b, x, z } : b));
  }, []);

  const handleAdd = useCallback(() => {
    setBricks(prev => [...prev, makeBrick()]);
  }, []);

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative' }}>
      <Canvas camera={{ position:[10,8,10], fov:50 }}>
        <Scene bricks={bricks} onMove={handleMove} onSelect={setSelectedId} />
      </Canvas>
      <button onClick={handleAdd} style={{
        position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)',
        padding:'12px 28px', fontSize:18, fontWeight:600,
        background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff',
        border:'none', borderRadius:12, cursor:'pointer',
        boxShadow:'0 4px 24px rgba(124,58,237,0.4)', zIndex:10
      }}>+ Add Brick</button>
    </div>
  );
}
