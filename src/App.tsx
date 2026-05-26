import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6d6875','#b5838d','#4c9f70','#7b2cbf','#ffffff','#ff6b6b','#ffd93d','#6bcbdd','#95e1d3'];
let nextId = 1;

const BRICK_TYPES = {
  '2x4':{w:2,d:4,label:'2x4'}, '2x2':{w:2,d:2,label:'2x2'}, '2x3':{w:2,d:3,label:'2x3'},
  '1x4':{w:1,d:4,label:'1x4'}, '1x2':{w:1,d:2,label:'1x2'},
} as const;
type BrickType = keyof typeof BRICK_TYPES;

function studs(type: BrickType) {
  const {w,d}=BRICK_TYPES[type]; const p:[number,number,number][]=[];
  const xs=w===1?0:-0.5, zs=-(d/2)+0.5;
  for(let x=xs;x<w/2;x+=1) for(let z=zs;z<d/2;z+=1) p.push([x,0.6,z]);
  return p;
}

type BrickData={id:number;x:number;y:number;z:number;rot:number;color:string;type:BrickType};
const mkBrick=(t:BrickType,c:string):BrickData=>({id:nextId++,x:0,y:0.5,z:0,rot:0,color:c,type:t});

function Brick({d,onDown,onUp}:{d:BrickData;onDown:(e:ThreeEvent<PointerEvent>,id:number)=>void;onUp:(e:ThreeEvent<PointerEvent>,id:number)=>void}){
  const {w,d:depth}=BRICK_TYPES[d.type];
  return(
    <group position={[d.x,d.y,d.z]} rotation={[0,d.rot,0]} onPointerDown={e=>onDown(e,d.id)} onPointerUp={e=>onUp(e,d.id)}>
      <mesh><boxGeometry args={[w,1,depth]} /><meshStandardMaterial color={d.color} roughness={0.6} metalness={0.1} /></mesh>
      {studs(d.type).map((p,i)=>(
        <mesh key={i} position={p}><cylinderGeometry args={[0.25,0.25,0.2,8]} /><meshStandardMaterial color={d.color} roughness={0.5} metalness={0.1} /></mesh>
      ))}
    </group>
  );
}

function Scene({bricks,onMove,onSelect,dark}:{bricks:BrickData[];onMove:(id:number,x:number,z:number)=>void;onSelect:(id:number)=>void;dark:boolean}){
  const ctrl=useRef<any>(null);
  const dr=useRef<{id:number;y:number}|null>(null);
  const pl=new THREE.Plane(new THREE.Vector3(0,1,0));
  const rc=new THREE.Raycaster(), ms=new THREE.Vector2();
  const mp=useRef(new Map<number,BrickData>());
  bricks.forEach(b=>mp.current.set(b.id,b));

  useFrame(({camera:c,pointer:p})=>{
    const d=dr.current; if(!d) return;
    pl.set(new THREE.Vector3(0,1,0),-d.y); ms.set(p.x,p.y);
    rc.setFromCamera(ms,c); const h=new THREE.Vector3();
    if(rc.ray.intersectPlane(pl,h)) onMove(d.id,Math.round(h.x),Math.round(h.z));
  });

  const hd=useCallback((e:ThreeEvent<PointerEvent>,id:number)=>{e.stopPropagation();const b=mp.current.get(id);if(!b)return;dr.current={id,y:b.y};onSelect(id);if(ctrl.current)ctrl.current.enabled=false;},[onSelect]);
  const hu=useCallback(()=>{dr.current=null;if(ctrl.current)ctrl.current.enabled=true;},[]);

  const gc=dark?'#6e6e8a':'#c0c0d0', sc=dark?'#9a9ab8':'#e0e0f0';
  return(<>
    <OrbitControls ref={ctrl} makeDefault enableDamping={false} />
    <ambientLight intensity={0.5} />
    <directionalLight position={[5,10,5]} intensity={1} />
    <directionalLight position={[-5,5,-5]} intensity={0.3} />
    <Grid args={[20,20]} cellSize={1} cellThickness={0.5} cellColor={gc} sectionSize={5} sectionThickness={1} sectionColor={sc} fadeDistance={30} position={[0,-0.01,0]} />
    {bricks.map(b=><Brick key={b.id} d={b} onDown={hd} onUp={hu} />)}
  </>);
}

const SKEY='alisik_saves';
const loadSaves=()=>{try{return JSON.parse(localStorage.getItem(SKEY)||'[]')}catch{return[]}};

export default function App(){
  const[bricks,setBricks]=useState<BrickData[]>([mkBrick('2x4',COLORS[0]!)]);
  const[sel,setSel]=useState<number|null>(null);
  const[saves,setSaves]=useState(loadSaves);
  const[saveName,setSaveName]=useState('');
  const[showMenu,setShowMenu]=useState(false);
  const[newType,setNewType]=useState<BrickType>('2x4');
  const[newColor,setNewColor]=useState(COLORS[0]!);
  const[loadList,setLoadList]=useState(false);
  const[dark,setDark]=useState(true);

  useEffect(()=>localStorage.setItem(SKEY,JSON.stringify(saves)),[saves]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(sel===null)return;
      setBricks(p=>p.map(b=>{if(b.id!==sel)return b;if(e.key==='r')return{...b,rot:b.rot+Math.PI/2};if(e.key==='q')return{...b,y:Math.max(0.5,b.y-0.5)};if(e.key==='e')return{...b,y:b.y+0.5};if(e.key==='Delete'||e.key==='Backspace')return null;return b;}).filter(Boolean)as BrickData[]);
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[sel]);

  const hm=useCallback((id:number,x:number,z:number)=>setBricks(p=>p.map(b=>b.id===id?{...b,x,z}:b)),[]);
  const ha=useCallback(()=>{setBricks(p=>[...p,mkBrick(newType,newColor)]);setShowMenu(false);},[newType,newColor]);
  const hUp=useCallback(()=>{if(sel===null)return;setBricks(p=>p.map(b=>b.id===sel?{...b,y:b.y+0.5}:b));},[sel]);
  const hDn=useCallback(()=>{if(sel===null)return;setBricks(p=>p.map(b=>b.id===sel?{...b,y:Math.max(0.5,b.y-0.5)}:b));},[sel]);

  const bg=dark?'#0b0b14':'#f0f0f5';
  const uiBg=`rgba(${dark?'10,10,20':'240,240,248'},0.93)`;
  const txt=dark?'#fff':'#111';
  const muted=dark?'#9a9ab8':'#666';
  const border=`1px solid rgba(${dark?'255,255,255':'0,0,0'},0.1)`;
  const grad='linear-gradient(135deg,#7c3aed,#a855f7)';

  const bBtn:any={padding:'10px 12px',fontSize:14,fontWeight:600,border:'none',borderRadius:10,cursor:'pointer',color:'#fff',background:'rgba(255,255,255,0.12)',minWidth:40,display:'flex',alignItems:'center',justifyContent:'center',touchAction:'manipulation'};

  return(
    <div style={{width:'100vw',height:'100vh',position:'relative',overflow:'hidden',background:bg}}>
      <Canvas camera={{position:[10,8,10],fov:50}} style={{touchAction:'none',background:bg}}>
        <Scene bricks={bricks} onMove={hm} onSelect={setSel} dark={dark} />
      </Canvas>

      {/* верхняя панель */}
      <div style={{position:'absolute',top:8,left:8,right:8,display:'flex',gap:6,flexWrap:'wrap',zIndex:10,alignItems:'center'}}>
        <div style={{display:'flex',gap:4,flex:1,flexWrap:'wrap'}}>
          <button onClick={()=>setLoadList(p=>!p)} style={{...bBtn,fontSize:12}}>📂 Load</button>
          <button onClick={()=>{setBricks([]);setSel(null);}} style={{...bBtn,fontSize:12}}>🗑 New</button>
          <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Save..." maxLength={30} style={{...bBtn,background:`rgba(${dark?'255,255,255':'0,0,0'},0.06)`,width:100,fontSize:12,outline:'none',textAlign:'left'}} onKeyDown={e=>e.key==='Enter'&&(()=>{if(!saveName.trim())return;setSaves(p=>[...p.filter(s=>s.name!==saveName.trim()),{name:saveName.trim(),bricks:bricks.map(b=>({...b}))}]);setSaveName('');})()}/>
          <button onClick={()=>{if(!saveName.trim())return;setSaves(p=>[...p.filter(s=>s.name!==saveName.trim()),{name:saveName.trim(),bricks:bricks.map(b=>({...b}))}]);setSaveName('');}} style={{...bBtn,fontSize:12,background:saveName.trim()?grad:'rgba(255,255,255,0.1)'}}>💾</button>
        </div>
        <button onClick={()=>setDark(p=>!p)} style={{...bBtn,fontSize:16,width:40}}>{dark?'☀':'☾'}</button>
      </div>

      {/* список сохранений */}
      {loadList&&(
        <div style={{position:'absolute',top:48,left:8,zIndex:20,background:uiBg,backdropFilter:'blur(8px)',borderRadius:12,padding:12,minWidth:180,border,color:txt,maxHeight:'50vh',overflowY:'auto'}}>
          <div style={{color:muted,fontSize:11,marginBottom:8,fontFamily:'monospace'}}>Saves</div>
          {saves.length===0&&<div style={{color:'#666',fontSize:11}}>Empty</div>}
          {saves.map(s=>(
            <div key={s.name} style={{display:'flex',gap:4,marginBottom:4}}>
              <button onClick={()=>{nextId=Math.max(...s.bricks.map(b=>b.id),0)+1;setBricks(s.bricks.map(b=>({...b})));setSel(null);setLoadList(false);}} style={{...bBtn,flex:1,textAlign:'left',fontSize:11,background:'rgba(255,255,255,0.06)',padding:'6px 10px'}}>{s.name} ({s.bricks.length})</button>
              <button onClick={()=>setSaves(p=>p.filter(x=>x.name!==s.name))} style={{...bBtn,padding:'4px 8px',fontSize:11,background:'rgba(230,57,70,0.3)'}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* нижняя панель */}
      <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',zIndex:10,display:'flex',gap:8,background:uiBg,backdropFilter:'blur(8px)',borderRadius:16,padding:'8px 12px',border,alignItems:'center'}}>
        <button onClick={hDn} style={{...bBtn,width:44,height:44,fontSize:20,background:sel?grad:'rgba(255,255,255,0.06)'}} disabled={!sel}>▼</button>
        <button onClick={hUp} style={{...bBtn,width:44,height:44,fontSize:20,background:sel?grad:'rgba(255,255,255,0.06)'}} disabled={!sel}>▲</button>
        <div style={{width:1,height:28,background:border}} />
        <button onClick={()=>setShowMenu(p=>!p)} style={{...bBtn,background:grad,fontSize:22,width:52,height:52,borderRadius:14}}>+</button>
      </div>

      {/* хинт */}
      <div style={{position:'absolute',bottom:76,left:'50%',transform:'translateX(-50%)',color:muted,fontSize:10,fontFamily:'monospace',zIndex:10,textAlign:'center',pointerEvents:'none',opacity:0.6}}>
        Tap brick to select • R=rotate • Q/E=up/down • Del=delete
      </div>

      {/* меню добавления */}
      {showMenu&&(
        <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',zIndex:20,background:uiBg,backdropFilter:'blur(8px)',borderRadius:16,padding:14,border,display:'flex',flexDirection:'column',gap:10,minWidth:240}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center'}}>
            {(Object.keys(BRICK_TYPES)as BrickType[]).map(t=>(
              <button key={t} onClick={()=>setNewType(t)} style={{...bBtn,fontSize:11,padding:'5px 10px',background:newType===t?grad:'rgba(255,255,255,0.08)'}}>{BRICK_TYPES[t].label}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center'}}>
            {COLORS.map(c=>(
              <div key={c} onClick={()=>setNewColor(c)} style={{width:26,height:26,borderRadius:6,background:c,cursor:'pointer',border:newColor===c?'2px solid #a855f7':'2px solid transparent',transition:'border 0.15s'}} />
            ))}
          </div>
          <button onClick={ha} style={{...bBtn,background:grad,fontSize:16,padding:'12px 20px'}}>Add Brick</button>
        </div>
      )}
    </div>
  );
}
