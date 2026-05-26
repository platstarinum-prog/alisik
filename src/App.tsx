import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6d6875','#b5838d','#4c9f70','#7b2cbf','#ffffff','#ff6b6b','#ffd93d','#6bcbdd','#95e1d3'];
const PLATE_COLORS = ['#4a9e5c','#3d8b4f','#2a7a3e','#5b8fc9','#8a7a5a','#6a6a7a','#5a5a5a','#ffffff'];
let nextId = 1;

const BRICK_TYPES = {
  '2x4':{w:2,d:4,label:'2x4'},'2x2':{w:2,d:2,label:'2x2'},'2x3':{w:2,d:3,label:'2x3'},
  '1x4':{w:1,d:4,label:'1x4'},'1x2':{w:1,d:2,label:'1x2'},
} as const;
type BrickType=keyof typeof BRICK_TYPES;

function studs(type:BrickType){
  const{w,d}=BRICK_TYPES[type];
  const p:[number,number,number][]=[];
  const xs=w===1?0:-0.5,zs=-(d/2)+0.5;
  for(let x=xs;x<w/2;x+=1)
    for(let z=zs;z<d/2;z+=1)
      p.push([x,0.6,z]);
  return p;
}

type BrickData={id:number;x:number;y:number;z:number;rot:number;color:string;type:BrickType};
const mkBrick=(t:BrickType,c:string):BrickData=>({id:nextId++,x:0,y:0.5,z:0,rot:0,color:c,type:t});

function Brick({d,onDown,sel}:{d:BrickData;onDown:(e:ThreeEvent<PointerEvent>,id:number)=>void;sel:boolean}){
  const{w,d:depth}=BRICK_TYPES[d.type];
  return(
    <group position={[d.x,d.y,d.z]} rotation={[0,d.rot,0]} onPointerDown={e=>onDown(e,d.id)}>
      <mesh>
        <boxGeometry args={[w,1,depth]} />
        <meshStandardMaterial color={d.color} roughness={0.25} metalness={0.15} />
      </mesh>
      {studs(d.type).map((p,i)=>(
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.25,0.25,0.2,8]} />
          <meshStandardMaterial color={d.color} roughness={0.2} metalness={0.15} />
        </mesh>
      ))}
      {sel&&(
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w,1,depth)]} />
          <lineBasicMaterial color="#a855f7" depthTest={false} />
        </lineSegments>
      )}
    </group>
  );
}

function Baseplate({color}:{color:string}){
  const size=20;
  return(<>
    <mesh position={[0,-0.02,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[size,size]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
    </mesh>
    {Array.from({length:size+1},(_,ix)=>ix-size/2).flatMap(x=>
      Array.from({length:size+1},(_,iz)=>iz-size/2).map(z=>[x,0.02,z] as [number,number,number])
    ).map((p,i)=>(
      <mesh key={i} position={p}><cylinderGeometry args={[0.08,0.1,0.04,6]} /><meshStandardMaterial color={color} roughness={0.9} metalness={0} /></mesh>
    ))}
  </>);
}

function Scene({bricks,onMove,onSelect,onCommitDrag,sel,theme,plateColor}:{
  bricks:BrickData[];onMove:(id:number,x:number,z:number)=>void;onSelect:(id:number)=>void;
  onCommitDrag:(b:BrickData[])=>void;sel:number|null;theme:any;plateColor:string
}){
  const ctrl=useRef<any>(null);
  const dr=useRef<{id:number;y:number}|null>(null);
  const plRef=useRef(new THREE.Plane(new THREE.Vector3(0,1,0)));
  const rcRef=useRef(new THREE.Raycaster());
  const ms=new THREE.Vector2();
  const mp=useRef(new Map<number,BrickData>());
  bricks.forEach(b=>mp.current.set(b.id,b));
  const bricksRef=useRef(bricks);
  bricksRef.current=bricks;
  const onCommitRef=useRef(onCommitDrag);
  onCommitRef.current=onCommitDrag;

  useEffect(()=>{
    const up=()=>{
      if(dr.current) onCommitRef.current(bricksRef.current);
      dr.current=null;
      if(ctrl.current) ctrl.current.enabled=true;
    };
    window.addEventListener('pointerup',up);
    return()=>window.removeEventListener('pointerup',up);
  },[]);

  useFrame(({camera:c,pointer:p})=>{
    const d=dr.current;if(!d)return;
    plRef.current.set(new THREE.Vector3(0,1,0),-d.y);
    ms.set(p.x,p.y);
    rcRef.current.setFromCamera(ms,c);
    const h=new THREE.Vector3();
    if(rcRef.current.ray.intersectPlane(plRef.current,h))
      onMove(d.id,Math.round(h.x*2)/2,Math.round(h.z*2)/2);
  });

  const hd=useCallback((e:ThreeEvent<PointerEvent>,id:number)=>{
    e.stopPropagation();
    const b=mp.current.get(id);if(!b)return;
    dr.current={id,y:b.y};
    onSelect(id);
    if(ctrl.current) ctrl.current.enabled=false;
  },[onSelect]);

  return(<>
    <OrbitControls ref={ctrl} makeDefault enableDamping={false} />
    <ambientLight intensity={theme.ambientI??0.4} color={theme.ambient} />
    <directionalLight position={[5,10,5]} intensity={theme.light1I??0.8} color={theme.light1} />
    <directionalLight position={[-5,5,-5]} intensity={theme.light2I??0.3} color={theme.light2} />
    <Baseplate color={plateColor} />
    {bricks.map(b=><Brick key={b.id} d={b} onDown={hd} sel={b.id===sel} />)}
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
  const[plateColor,setPlateColor]=useState('#4a9e5c');
  const[histVer,setHistVer]=useState(0);
  const historyRef=useRef<BrickData[][]>([]);
  const historyIdx=useRef(-1);

  const commit=useCallback((b:BrickData[])=>{
    historyRef.current=historyRef.current.slice(0,historyIdx.current+1);
    historyRef.current.push(b.map(x=>({...x})));
    if(historyRef.current.length>100)historyRef.current.shift();
    historyIdx.current=historyRef.current.length-1;
    setHistVer(v=>v+1);
  },[]);

  const undo=useCallback(()=>{
    if(historyIdx.current<=0)return;
    historyIdx.current--;
    setBricks(historyRef.current[historyIdx.current]!.map(x=>({...x})));
    setHistVer(v=>v+1);
  },[]);

  const redo=useCallback(()=>{
    if(historyIdx.current>=historyRef.current.length-1)return;
    historyIdx.current++;
    setBricks(historyRef.current[historyIdx.current]!.map(x=>({...x})));
    setHistVer(v=>v+1);
  },[]);

  const setBricksAndCommit=useCallback((fn:(p:BrickData[])=>BrickData[],doCommit:boolean=true)=>{
    setBricks(p=>{
      const r=fn(p);
      if(doCommit)commit(r);
      return r;
    });
  },[commit]);

  useEffect(()=>{
    if(historyIdx.current===-1&&bricks.length>0){
      historyRef.current=[bricks.map(x=>({...x}))];
      historyIdx.current=0;
    }
  },[]);

  useEffect(()=>localStorage.setItem(SKEY,JSON.stringify(saves)),[saves]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey){
        if(e.key==='z'&&!e.shiftKey){e.preventDefault();undo();return;}
        if(e.key==='z'&&e.shiftKey){e.preventDefault();redo();return;}
        if(e.key==='y'){e.preventDefault();redo();return;}
      }
      if(sel===null)return;
      setBricksAndCommit(p=>p.map(b=>{
        if(b.id!==sel)return b;
        if(e.key==='r')return{...b,rot:b.rot+Math.PI/2};
        if(e.key==='q')return{...b,y:Math.max(0.5,b.y-0.5)};
        if(e.key==='e')return{...b,y:b.y+0.5};
        if(e.key==='Delete'||e.key==='Backspace')return null;
        return b;
      }).filter(Boolean)as BrickData[]);
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[sel,undo,redo,setBricksAndCommit]);

  const hm=useCallback((id:number,x:number,z:number)=>setBricks(p=>p.map(b=>b.id===id?{...b,x,z}:b)),[]);
  const ha=useCallback(()=>{
    const off=(Math.random()-0.5)*4;
    setBricksAndCommit(p=>[...p,{...mkBrick(newType,newColor),x:off,z:off}]);
    setShowMenu(false);
  },[newType,newColor,setBricksAndCommit]);
  const hUp=useCallback(()=>{if(sel===null)return;setBricksAndCommit(p=>p.map(b=>b.id===sel?{...b,y:b.y+0.5}:b));},[sel,setBricksAndCommit]);
  const hDn=useCallback(()=>{if(sel===null)return;setBricksAndCommit(p=>p.map(b=>b.id===sel?{...b,y:Math.max(0.5,b.y-0.5)}:b));},[sel,setBricksAndCommit]);
  const hRot=useCallback(()=>{if(sel===null)return;setBricksAndCommit(p=>p.map(b=>b.id===sel?{...b,rot:b.rot+Math.PI/2}:b));},[sel,setBricksAndCommit]);
  const hDel=useCallback(()=>{
    if(sel===null)return;
    setBricksAndCommit(p=>p.filter(b=>b.id!==sel));
    setSel(null);
  },[sel,setBricksAndCommit]);
  const hClear=useCallback(()=>{
    commit(bricks);
    setBricks([]);
    setSel(null);
  },[commit,bricks]);

  const onDragEnd=useCallback((b:BrickData[])=>{commit(b);},[commit]);

  const theme=dark?{
    bg:'#0c0a1a',uiBg:'rgba(16,12,30,0.94)',txt:'#e4ddf5',muted:'#8a7ea8',
    border:'rgba(168,85,247,0.15)',ambient:'#ffffff',ambientI:0.7,light1:'#ffffff',light1I:1.2,light2:'#c8d0ff',light2I:0.5,
    accent:'#7c3aed',accent2:'#a855f7',btnBg:'rgba(255,255,255,0.10)',btnTxt:'#e4ddf5',
  }:{
    bg:'#f3eefb',uiBg:'rgba(248,244,255,0.94)',txt:'#1a1430',muted:'#7a6e98',
    border:'rgba(124,58,237,0.12)',ambient:'#ffffff',ambientI:0.5,light1:'#ffffff',light1I:1.0,light2:'#d0d8ff',light2I:0.4,
    accent:'#6d28d9',accent2:'#9333ea',btnBg:'rgba(109,40,217,0.08)',btnTxt:'#1a1430',
  };

  const canUndo=historyIdx.current>0;
  const canRedo=historyIdx.current<historyRef.current.length-1;
  /**/histVer;

  const grd=`linear-gradient(135deg,${theme.accent},${theme.accent2})`;
  const bBtn:any={padding:'9px 10px',fontSize:13,fontWeight:600,border:'none',borderRadius:10,cursor:'pointer',color:theme.btnTxt,background:theme.btnBg,minWidth:36,display:'flex',alignItems:'center',justifyContent:'center',touchAction:'manipulation',lineHeight:1};

  return(
    <div style={{width:'100vw',height:'100vh',position:'relative',overflow:'hidden',background:theme.bg}}>
      <Canvas camera={{position:[10,8,10],fov:50}} style={{touchAction:'none',background:theme.bg}}>
        <Scene bricks={bricks} onMove={hm} onSelect={setSel} onCommitDrag={onDragEnd} sel={sel} theme={theme} plateColor={plateColor} />
      </Canvas>

      <div style={{position:'absolute',top:'calc(20px + env(safe-area-inset-top, 0px))',left:6,right:6,display:'flex',gap:4,zIndex:10,flexWrap:'wrap',alignItems:'center'}}>
        <button onClick={undo} style={{...bBtn,fontSize:14}} disabled={!canUndo}>↶</button>
        <button onClick={redo} style={{...bBtn,fontSize:14}} disabled={!canRedo}>↷</button>
        <div style={{width:1,height:24,background:theme.border}} />
        <button onClick={()=>setLoadList(p=>!p)} style={{...bBtn,fontSize:11}}>📂</button>
        <button onClick={hClear} style={{...bBtn,fontSize:11}}>🗑</button>
        <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Save..." maxLength={30} style={{...bBtn,width:90,fontSize:11,outline:'none',textAlign:'left'}}
          onKeyDown={e=>{if(e.key!=='Enter')return;if(!saveName.trim())return;const s={name:saveName.trim(),bricks:bricks.map(b=>({...b}))};setSaves(p=>[...p.filter(x=>x.name!==s.name),s]);setSaveName('');}} />
        <button onClick={()=>{if(!saveName.trim())return;const s={name:saveName.trim(),bricks:bricks.map(b=>({...b}))};setSaves(p=>[...p.filter(x=>x.name!==s.name),s]);setSaveName('');}} style={{...bBtn,fontSize:12,background:saveName.trim()?grd:theme.btnBg}}>💾</button>
        <div style={{flex:1}} />
        <button onClick={()=>setDark(p=>!p)} style={{...bBtn,fontSize:15,width:36}}>{dark?'☀':'☾'}</button>
      </div>

      {loadList&&(
        <div style={{position:'absolute',top:44,left:6,zIndex:20,background:theme.uiBg,backdropFilter:'blur(8px)',borderRadius:12,padding:10,minWidth:170,border:`1px solid ${theme.border}`,color:theme.txt,maxHeight:'50vh',overflowY:'auto'}}>
          <div style={{color:theme.muted,fontSize:10,marginBottom:6,fontFamily:'monospace'}}>Saves</div>
          {saves.length===0&&<div style={{color:theme.muted,fontSize:10}}>Empty</div>}
          {saves.map(s=>(
            <div key={s.name} style={{display:'flex',gap:4,marginBottom:4}}>
              <button onClick={()=>{nextId=Math.max(...s.bricks.map(b=>b.id),0)+1;commit(s.bricks.map(b=>({...b})));setBricks(s.bricks.map(b=>({...b})));setSel(null);setLoadList(false);}} style={{...bBtn,flex:1,textAlign:'left',fontSize:10,background:'rgba(255,255,255,0.06)',padding:'5px 8px'}}>{s.name} ({s.bricks.length})</button>
              <button onClick={()=>setSaves(p=>p.filter(x=>x.name!==s.name))} style={{...bBtn,padding:'3px 6px',fontSize:10,background:'rgba(230,57,70,0.3)'}}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{position:'absolute',bottom:'calc(10px + env(safe-area-inset-bottom, 0px))',left:'50%',transform:'translateX(-50%)',zIndex:10,display:'flex',gap:6,background:theme.uiBg,backdropFilter:'blur(8px)',borderRadius:16,padding:'6px 10px',border:`1px solid ${theme.border}`,alignItems:'center'}}>
        <button onClick={hDn} style={{...bBtn,width:40,height:40,fontSize:18,background:sel?grd:theme.btnBg,color:'#fff'}} disabled={!sel}>▼</button>
        <button onClick={hUp} style={{...bBtn,width:40,height:40,fontSize:18,background:sel?grd:theme.btnBg,color:'#fff'}} disabled={!sel}>▲</button>
        <button onClick={hRot} style={{...bBtn,width:40,height:40,fontSize:18,background:sel?grd:theme.btnBg,color:'#fff'}} disabled={!sel}>↻</button>
        <div style={{width:1,height:26,background:theme.border}} />
        <button onClick={hDel} style={{...bBtn,width:40,height:40,fontSize:16,background:sel?grd:theme.btnBg,color:'#fff'}} disabled={!sel}>✕</button>
        <div style={{width:1,height:26,background:theme.border}} />
        <button onClick={()=>setShowMenu(p=>!p)} style={{...bBtn,background:grd,color:'#fff',fontSize:20,width:48,height:48,borderRadius:14}}>+</button>
      </div>

      <div style={{position:'absolute',bottom:'calc(72px + env(safe-area-inset-bottom, 0px))',left:'50%',transform:'translateX(-50%)',color:theme.muted,fontSize:9,fontFamily:'monospace',zIndex:10,textAlign:'center',pointerEvents:'none',opacity:0.5}}>
        Drag to move • R/↻ rotate • Q/E height • Del • Ctrl+Z/Y
      </div>

      {showMenu&&(
        <div style={{position:'absolute',bottom:84,left:'50%',transform:'translateX(-50%)',zIndex:20,background:theme.uiBg,backdropFilter:'blur(8px)',borderRadius:16,padding:12,border:`1px solid ${theme.border}`,display:'flex',flexDirection:'column',gap:8,minWidth:220}}>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center'}}>
            {(Object.keys(BRICK_TYPES)as BrickType[]).map(t=>(
              <button key={t} onClick={()=>setNewType(t)} style={{...bBtn,fontSize:10,padding:'4px 8px',background:newType===t?grd:theme.btnBg,color:newType===t?'#fff':theme.btnTxt}}>{BRICK_TYPES[t].label}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:3,flexWrap:'wrap',justifyContent:'center'}}>
            {COLORS.map(c=>(
              <div key={c} onClick={()=>setNewColor(c)} style={{width:24,height:24,borderRadius:6,background:c,cursor:'pointer',border:newColor===c?'2px solid #a855f7':'2px solid transparent',transition:'border 0.15s'}} />
            ))}
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center'}}>
            <span style={{color:theme.muted,fontSize:10,fontFamily:'monospace',alignSelf:'center'}}>Plate:</span>
            {PLATE_COLORS.map(c=>(
              <div key={c} onClick={()=>setPlateColor(c)} style={{width:20,height:20,borderRadius:4,background:c,cursor:'pointer',border:plateColor===c?'2px solid #a855f7':'2px solid transparent'}} />
            ))}
          </div>
          <button onClick={ha} style={{...bBtn,background:grd,color:'#fff',fontSize:14,padding:'10px 16px'}}>Add Brick</button>
        </div>
      )}
    </div>
  );
}
