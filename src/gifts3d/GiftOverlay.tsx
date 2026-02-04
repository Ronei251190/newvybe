// src/gifts3d/GiftOverlay.tsx
import React from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF } from "@react-three/drei";
import type { Gift3D } from "./gifts";

function Model({ url, scale = 1.2, y = -0.2 }: { url: string; scale?: number; y?: number }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} scale={scale} position={[0, y, 0]} />;
}

export default function GiftOverlay({
  open,
  gift,
  onDone,
  durationMs = 3200,
}: {
  open: boolean;
  gift: Gift3D | null;
  onDone: () => void;
  durationMs?: number;
}) {
  React.useEffect(() => {
    if (!open || !gift) return;
    const t = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(t);
  }, [open, gift, onDone, durationMs]);

  if (!open || !gift) return null;

  return (
    <div className="gift3DOverlay">
      <Canvas camera={{ position: [0, 0.45, 3.0], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={2.2} />
        <directionalLight position={[6, 8, 6]} intensity={2.4} />
        <directionalLight position={[-5, -2, 3]} intensity={1.2} />
        <Float speed={2} rotationIntensity={0.8} floatIntensity={1.3}>
          <Model url={gift.modelUrl} scale={gift.scale} y={gift.y} />
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>

      <div className="gift3DLabel">🎁 {gift.name}</div>
    </div>
  );
}
