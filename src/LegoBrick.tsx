import * as THREE from 'three';
import { Box, Cylinder } from '@react-three/drei';
import type { Brick } from './store';

const W = 2;
const D = 4;
const H = 1;

const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.2;
const STUD_OFFSET = 0.5;

interface LegoBrickProps {
  brick: Brick;
}

export default function LegoBrick({ brick }: LegoBrickProps) {
  const studPositions: [number, number, number][] = [];
  for (let x = -W / 2 + STUD_OFFSET; x < W / 2; x += 1) {
    for (let z = -D / 2 + STUD_OFFSET; z < D / 2; z += 1) {
      studPositions.push([x, H / 2 + STUD_HEIGHT / 2, z]);
    }
  }

  return (
    <group
      position={new THREE.Vector3(...brick.position)}
      rotation={new THREE.Euler(...brick.rotation)}
    >
      <Box args={[W, H, D]} position={[0, 0, 0]}>
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
