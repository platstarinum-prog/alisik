import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6d6875','#b5838d','#4c9f70','#7b2cbf','#ffffff','#ff6b6b','#ffd93d','#6bcbdd','#95e1d3'];
let nextId = 1;

const BRICK_TYPES = {
  '2x4':  { w:2, d:4, label:'2x4' },
  '2x2':  { w:2, d:2, label:'2x2' },
  '2x3':  { w:2, d:3, label:'2x3' },
  '1x4':  { w:1, d:4, label:'1x4' },
  '1x2':  { w:1, d:2, label:'1x2' },
} as const;
type BrickType = keyof typeof BRICK_TYPES;

function studPositions(type: BrickType) {
  const { w, d } = BRICK_TYPES[type];
  const positions: [number,number,number][] = [];
  const xStart = w === 1 ? 0 : -0.5;
  const xStep = w === 1 ? 1 : 1;
  const zStart = -(d/2) + 0.5;
  for (let x = xStart; x < w/2; x += xStep)
    for (let z = zStart; z < d/2; z += 1)
      positions.push([x, 0.6, z]);
  return positions;
}

type BrickData = { id: number; x: number; y: number; z: number; rot: number; color: string; type: BrickType };

function makeBrick(type: BrickType, color: string): BrickData {
  return { id: nextId++, x: 0, y: 0.5, z: 0, rot: 0, color, type };
}

function Brick({ data, onDown, onUp }: {
  data: BrickData;
  onDown: (e: ThreeEvent<PointerEvent>, id: number) => void;
  onUp: (e: ThreeEvent<PointerEvent>, id: number) => void;
}) {
  const { w, d } = BRICK_TYPES[data.type];
  return (
    <group position={[data.x, data.y, data.z]} rotation={[0, data.rot, 0]}
      onPointerDown={(e) => onDown(e, data.id)}
      onPointerUp={(e) => onUp(e, data.id)}
    >
      <mesh>
        <boxGeometry args={[w, 1, d]} />
        <meshStandardMaterial color={data.color} roughness={0.6} metalness={0.1} />
      </mesh>
      {studPositions(data.type).map((p,i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 8]} />
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
  const dragRef = useRef<{ id: number; y: number } | null>(null);
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0));
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const bricksMap = useRef(new Map<number, BrickData>());
  bricks.forEach(b => bricksMap.current.set(b.id, b));

  useFrame(({ camera, pointer }) => {
    const d = dragRef.current;
    if (!d) return;
    plane.set(new THREE.Vector3(0,1,0), -d.y);
    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      onMove(d.id, Math.round(hit.x), Math.round(hit.z));
    }
  });

  const handleDown = useCallback((e: ThreeEvent<PointerEvent>, id: number) => {
    e.stopPropagation();
    const b = bricksMap.current.get(id);
    if (!b) return;
    dragRef.current = { id, y: b.y };
    onSelect(id);
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [onSelect]);

  const handleUp = useCallback(() => {
    dragRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  return (
    <>
      <OrbitControls ref={controlsRef} makeDefault enableDamping={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5,10,5]} intensity={1} />
      <directionalLight position={[-5,5,-5]} intensity={0.3} />
      <Grid args={[20,20]} cellSize={1} cellThickness={0.5} cellColor="#6e6e8a"
        sectionSize={5} sectionThickness={1} sectionColor="#9a9ab8"
        fadeDistance={30} position={[0,-0.01,0]} />
      {bricks.map(b => (
        <Brick key={b.id} data={b} onDown={handleDown} onUp={handleUp} />
      ))}
    </>
  );
}

const STORAGE_KEY = 'alisik_saves';

function loadSaves(): { name: string; bricks: BrickData[] }[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveSaves(saves: { name: string; bricks: BrickData[] }[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
}

export default function App() {
  const [bricks, setBricks] = useState<BrickData[]>([makeBrick('2x4', COLORS[0]!)]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saves, setSaves] = useState(() => loadSaves());
  const [saveName, setSaveName] = useState('');
  const [showMenu, setShowMenu] = useState(true);
  const [newType, setNewType] = useState<BrickType>('2x4');
  const [newColor, setNewColor] = useState(COLORS[0]!);
  const [loadList, setLoadList] = useState(false);

  useEffect(() => { saveSaves(saves); }, [saves]);
  useEffect(() => { const n = nextId; bricks.forEach(b => { if (b.id >= n) nextId = b.id + 1; }); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedId === null) return;
      setBricks(prev => prev.map(b => {
        if (b.id !== selectedId) return b;
        if (e.key === 'r') return { ...b, rot: b.rot + Math.PI / 2 };
        if (e.key === 'q') return { ...b, y: Math.max(0.5, b.y - 0.5) };
        if (e.key === 'e') return { ...b, y: b.y + 0.5 };
        if (e.key === 'Delete' || e.key === 'Backspace') return null;
        return b;
      }).filter(Boolean) as BrickData[]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  const handleMove = useCallback((id: number, x: number, z: number) => {
    setBricks(prev => prev.map(b => b.id === id ? { ...b, x, z } : b));
  }, []);

  const handleAdd = useCallback(() => {
    setBricks(prev => [...prev, makeBrick(newType, newColor)]);
  }, [newType, newColor]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const entry = { name: saveName.trim(), bricks: bricks.map(b => ({ ...b })) };
    setSaves(prev => [...prev.filter(s => s.name !== entry.name), entry]);
    setSaveName('');
  }, [saveName, bricks]);

  const handleLoad = useCallback((name: string) => {
    const entry = saves.find(s => s.name === name);
    if (!entry) return;
    nextId = Math.max(...entry.bricks.map(b => b.id), 0) + 1;
    setBricks(entry.bricks.map(b => ({ ...b })));
    setSelectedId(null);
    setLoadList(false);
  }, [saves]);

  const handleDeleteSave = useCallback((name: string) => {
    setSaves(prev => prev.filter(s => s.name !== name));
  }, []);

  const handleNew = useCallback(() => {
    setBricks([]);
    setSelectedId(null);
    setShowMenu(true);
  }, []);

  const btn: any = { padding:'8px 14px', fontSize:13, fontWeight:600, border:'none', borderRadius:8, cursor:'pointer', color:'#fff', background:'rgba(255,255,255,0.1)' };

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>
      <Canvas camera={{ position:[10,8,10], fov:50 }} style={{ touchAction:'none' }}>
        <Scene bricks={bricks} onMove={handleMove} onSelect={setSelectedId} />
      </Canvas>

      <div style={{ position:'absolute', top:8, left:8, display:'flex', gap:6, flexWrap:'wrap', zIndex:10, maxWidth:'calc(100vw - 16px)' }}>
        <button onClick={() => setShowMenu(p => !p)} style={{ ...btn, background:'linear-gradient(135deg,#7c3aed,#a855f7)' }}>+ Add</button>
        <button onClick={() => setLoadList(p => !p)} style={btn}>Load</button>
        <button onClick={handleNew} style={btn}>New</button>
        <input value={saveName} onChange={e => setSaveName(e.target.value)}
          placeholder="Save name..." maxLength={30}
          style={{ ...btn, background:'rgba(255,255,255,0.05)', width:120, outline:'none' }}
          onKeyDown={e => e.key === 'Enter' && handleSave()} />
        <button onClick={handleSave} style={{ ...btn, background:saveName.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.1)' }}>Save</button>
      </div>

      {showMenu && (
        <div style={{ position:'absolute', bottom:72, left:'50%', transform:'translateX(-50%)', zIndex:20,
          background:'rgba(10,10,20,0.95)', borderRadius:16, padding:16, border:'1px solid rgba(255,255,255,0.1)',
          display:'flex', flexDirection:'column', gap:12, minWidth:200, backdropFilter:'blur(8px)' }}>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
            {(Object.keys(BRICK_TYPES) as BrickType[]).map(t => (
              <button key={t} onClick={() => setNewType(t)} style={{
                ...btn, padding:'6px 12px', fontSize:12,
                background: newType === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.08)',
              }}>{BRICK_TYPES[t].label}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setNewColor(c)} style={{
                width:24, height:24, borderRadius:6, background:c, cursor:'pointer',
                border: newColor === c ? '2px solid #a855f7' : '2px solid transparent',
                transition:'border 0.15s',
              }} />
            ))}
          </div>
          <button onClick={() => { handleAdd(); setShowMenu(false); }} style={{
            ...btn, background:'linear-gradient(135deg,#7c3aed,#a855f7)', padding:'10px 20px', fontSize:15,
          }}>+ Add Brick</button>
        </div>
      )}

      {loadList && (
        <div style={{ position:'absolute', top:48, left:8, zIndex:20,
          background:'rgba(10,10,20,0.95)', borderRadius:12, padding:12, minWidth:180,
          border:'1px solid rgba(255,255,255,0.1)', maxHeight:'60vh', overflowY:'auto' }}>
          <div style={{ color:'#9a9ab8', fontSize:12, marginBottom:8, fontFamily:'monospace' }}>Saves</div>
          {saves.length === 0 && <div style={{ color:'#666', fontSize:12 }}>No saves yet</div>}
          {saves.map(s => (
            <div key={s.name} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
              <button onClick={() => handleLoad(s.name)} style={{ ...btn, flex:1, textAlign:'left', fontSize:12, background:'rgba(255,255,255,0.06)' }}>{s.name} ({s.bricks.length})</button>
              <button onClick={() => handleDeleteSave(s.name)} style={{ ...btn, padding:'4px 8px', fontSize:11, background:'rgba(230,57,70,0.3)' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
        color:'#666', fontSize:10, fontFamily:'monospace', zIndex:10, textAlign:'center', pointerEvents:'none',
      }}>
        Drag — move • R — rotate • Q/E — up/down • Del — delete
      </div>
    </div>
  );
}
