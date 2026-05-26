import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Brick } from './store';

const W = 2;
const D = 4;
const H = 1;

const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.2;
const STUD_OFFSET = 0.5;

interface LegoBrickProps {
  brick: Brick;
  onDragStart: () => void;
  onDragEnd: (id: number, x: number, z: number) => void;
}

export default function LegoBrick({ brick, onDragStart, onDragEnd }: LegoBrickProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useFrame(({ camera, pointer }) => {
    if (!dragging || !groupRef.current) return;
    mouse.current.set(pointer.x, pointer.y);
    raycaster.current.setFromCamera(mouse.current, camera);
    const hit = raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current);
    if (hit) {
      const sx = Math.round(intersectPoint.current.x);
      const sz = Math.round(intersectPoint.current.z);
      groupRef.current.position.set(sx, 1.5, sz);
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const camera = e.camera;
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), 0);
    raycaster.current.setFromCamera(
      new THREE.Vector2(e.nativeEvent.clientX, e.nativeEvent.clientY),
      camera
    );
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current);
    setDragging(true);
    onDragStart();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    setDragging(false);
    const x = Math.round(groupRef.current!.position.x);
    const z = Math.round(groupRef.current!.position.z);
    onDragEnd(brick.id, x, z);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const studPositions: [number, number, number][] = [];
  for (let x = -W / 2 + STUD_OFFSET; x < W / 2; x += 1) {
    for (let z = -D / 2 + STUD_OFFSET; z < D / 2; z += 1) {
      studPositions.push([x, H / 2 + STUD_HEIGHT / 2, z]);
    }
  }

  return (
    <group
      ref={groupRef}
      position={brick.position}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Box
        args={[W, H, D]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={brick.color}
          roughness={0.6}
          metalness={0.1}
        />
      </Box>

      {studPositions.map((pos, i) => (
        <Cylinder
          key={i}
          args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]}
          position={pos}
        >
          <meshStandardMaterial
            color={brick.color}
            roughness={0.5}
            metalness={0.1}
          />
        </Cylinder>
      ))}
    </group>
  );
}
