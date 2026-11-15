'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, OrbitControls, Sparkles, Stars } from '@react-three/drei';
import { Minus, MoveVertical, Plus, RotateCcw, ZoomIn } from 'lucide-react';
import * as THREE from 'three';
import type { AstronautVitals, OrganZone, TriageProtocol } from '@/types/telemetry';
import { ORGAN_META, type ActiveOrgan } from '@/lib/presentation';
import { cn } from '@/lib/utils';

const CYAN = '#00F0FF';
const VIOLET = '#9D4EDD';
const RED = '#FF2A5F';

type Vec3 = [number, number, number];

const ORGAN_ORDER: ActiveOrgan[] = ['brain', 'heart', 'spine'];

const ORGAN_POSITIONS: Record<ActiveOrgan, Vec3> = {
  brain: [0, 2.68, 0.3],
  heart: [0.15, 1.6, 0.33],
  spine: [-0.02, 0.98, 0.31],
};

const LABEL_OFFSET_Y = 0.24;

type LabelRefs = Record<ActiveOrgan, RefObject<HTMLDivElement | null>>;

/* -------------------------------------------------------------------------- */
/*  Holographic body                                                          */
/* -------------------------------------------------------------------------- */

interface HoloPartProps {
  geometry: ReactNode;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  opacity?: number;
}

function HoloPart({
  geometry,
  position,
  rotation,
  scale,
  opacity = 0.11,
}: HoloPartProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        {geometry}
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={0.5}
          transparent
          opacity={opacity}
          depthWrite={false}
          roughness={0.25}
          metalness={0.05}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        {geometry}
        <meshBasicMaterial
          color={CYAN}
          wireframe
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function BodyShell({ alert }: { alert: boolean }) {
  return (
    <group>
      {/* Head / cranium */}
      <HoloPart
        geometry={<sphereGeometry args={[0.34, 26, 22]} />}
        position={[0, 2.72, 0]}
        scale={[0.92, 1.06, 0.92]}
        opacity={0.13}
      />
      {/* Neck */}
      <HoloPart
        geometry={<cylinderGeometry args={[0.1, 0.125, 0.2, 16]} />}
        position={[0, 2.38, 0]}
        opacity={0.1}
      />
      {/* Torso */}
      <HoloPart
        geometry={<capsuleGeometry args={[0.38, 0.95, 10, 26]} />}
        position={[0, 1.68, 0]}
        scale={[1, 1, 0.72]}
        opacity={0.1}
      />
      {/* Shoulder joints */}
      <HoloPart
        geometry={<sphereGeometry args={[0.15, 16, 14]} />}
        position={[-0.45, 2.02, 0]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.15, 16, 14]} />}
        position={[0.45, 2.02, 0]}
        opacity={0.1}
      />
      {/* Pelvis */}
      <HoloPart
        geometry={<sphereGeometry args={[0.34, 20, 16]} />}
        position={[0, 0.7, 0]}
        scale={[1.15, 0.82, 0.78]}
        opacity={0.1}
      />

      {/* Arms */}
      <HoloPart
        geometry={<capsuleGeometry args={[0.1, 0.5, 6, 14]} />}
        position={[-0.55, 1.62, 0]}
        rotation={[0, 0, 0.18]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.1, 0.5, 6, 14]} />}
        position={[0.55, 1.62, 0]}
        rotation={[0, 0, -0.18]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.105, 12, 12]} />}
        position={[-0.66, 1.26, 0]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.105, 12, 12]} />}
        position={[0.66, 1.26, 0]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.085, 0.46, 6, 14]} />}
        position={[-0.71, 0.97, 0]}
        rotation={[0, 0, 0.08]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.085, 0.46, 6, 14]} />}
        position={[0.71, 0.97, 0]}
        rotation={[0, 0, -0.08]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.105, 12, 12]} />}
        position={[-0.74, 0.6, 0]}
        scale={[0.8, 1.35, 0.65]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.105, 12, 12]} />}
        position={[0.74, 0.6, 0]}
        scale={[0.8, 1.35, 0.65]}
        opacity={0.1}
      />

      {/* Legs */}
      <HoloPart
        geometry={<capsuleGeometry args={[0.14, 0.55, 6, 16]} />}
        position={[-0.19, 0.21, 0]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.14, 0.55, 6, 16]} />}
        position={[0.19, 0.21, 0]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.12, 12, 12]} />}
        position={[-0.2, -0.17, 0]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<sphereGeometry args={[0.12, 12, 12]} />}
        position={[0.2, -0.17, 0]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.11, 0.55, 6, 16]} />}
        position={[-0.2, -0.57, 0]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<capsuleGeometry args={[0.11, 0.55, 6, 16]} />}
        position={[0.2, -0.57, 0]}
        opacity={0.09}
      />
      <HoloPart
        geometry={<boxGeometry args={[0.2, 0.08, 0.38]} />}
        position={[-0.2, -0.93, 0.08]}
        opacity={0.1}
      />
      <HoloPart
        geometry={<boxGeometry args={[0.2, 0.08, 0.38]} />}
        position={[0.2, -0.93, 0.08]}
        opacity={0.1}
      />

      {/* Internal skeletal spine line */}
      <mesh position={[0, 1.0, -0.22]}>
        <cylinderGeometry args={[0.012, 0.012, 1.75, 8]} />
        <meshBasicMaterial
          color={alert ? RED : VIOLET}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Organ nodes                                                               */
/* -------------------------------------------------------------------------- */

interface OrganNodeProps {
  organ: ActiveOrgan;
  position: Vec3;
  selected: boolean;
  alert: boolean;
  onSelect: (organ: ActiveOrgan) => void;
}

function OrganNode({ organ, position, selected, alert, onSelect }: OrganNodeProps) {
  const nodeRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = alert ? RED : selected || hovered ? VIOLET : CYAN;

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const pulse = alert
      ? 1 + Math.sin(time * 10) * 0.22
      : selected
        ? 1.08 + Math.sin(time * 3.2) * 0.06
        : 1 + Math.sin(time * 2 + position[1]) * 0.045;

    nodeRef.current?.scale.setScalar(pulse);
    if (haloRef.current) {
      haloRef.current.rotation.y = time * (alert ? 2.4 : 0.7);
      haloRef.current.rotation.x = time * 0.45;
    }
    if (ringRef.current) {
      const cycle = (time * 0.85) % 1;
      ringRef.current.scale.setScalar(1 + cycle * 5.2);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - cycle) * 0.62;
    }
  });

  return (
    <group position={position}>
      <group ref={nodeRef}>
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            onSelect(organ);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[0.095, 22, 22]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={alert ? 3.4 : 2.2}
            toneMapped={false}
            roughness={0.15}
          />
        </mesh>

        <mesh scale={1.75} raycast={() => null}>
          <sphereGeometry args={[0.095, 18, 18]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={alert ? 0.32 : 0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh ref={haloRef} scale={2.35} raycast={() => null}>
          <sphereGeometry args={[0.095, 12, 12]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={alert ? 0.6 : 0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {alert ? (
        <Billboard>
          <mesh ref={ringRef} raycast={() => null}>
            <ringGeometry args={[0.15, 0.17, 48]} />
            <meshBasicMaterial
              color={RED}
              transparent
              opacity={0.65}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ) : null}

      {selected && !alert ? (
        <Billboard>
          <mesh raycast={() => null}>
            <ringGeometry args={[0.17, 0.188, 48]} />
            <meshBasicMaterial
              color={VIOLET}
              transparent
              opacity={0.85}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      ) : null}

      {alert ? <pointLight color={RED} intensity={5} distance={2} /> : null}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

function OrbitalRings() {
  const ringGroup = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringGroup.current) ringGroup.current.rotation.y += delta * 0.12;
  });

  return (
    <group position={[0, -1.05, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.85, 0.012, 8, 120]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={ringGroup}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.18, 0.009, 8, 120, Math.PI * 1.45]} />
          <meshBasicMaterial
            color={VIOLET}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.4, 0]}>
          <torusGeometry args={[2.42, 0.005, 8, 120, Math.PI * 0.8]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {Array.from({ length: 48 }).map((_, index) => {
        const angle = (index / 48) * Math.PI * 2;
        const major = index % 12 === 0;
        const radius = 2.02;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[major ? 0.1 : 0.035, 0.004, 0.012]} />
            <meshBasicMaterial
              color={major ? VIOLET : CYAN}
              transparent
              opacity={major ? 0.75 : 0.35}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ScannerBand() {
  const bandRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!bandRef.current) return;
    const cycle = (clock.getElapsedTime() * 0.17) % 1;
    bandRef.current.position.y = -1 + cycle * 3.95;
    const material = bandRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.04 + Math.sin(cycle * Math.PI) * 0.12;
  });

  return (
    <mesh ref={bandRef} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.18, 1.05, 64]} />
      <meshBasicMaterial
        color={CYAN}
        transparent
        opacity={0.08}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                     */
/* -------------------------------------------------------------------------- */

interface SceneProps {
  selectedOrgan: OrganZone;
  protocol: TriageProtocol | null;
  solarStormActive: boolean;
  onSelectOrgan: (organ: ActiveOrgan) => void;
  labelRefs: LabelRefs;
  zoomUnlocked: boolean;
  controlsRef: RefObject<{ domElement?: HTMLCanvasElement; reset?: () => void } | null>;
  zoomRef: RefObject<number>;
}

/* Projects each organ's HTML tag from the rotating body into screen space and
 * writes the position straight to the DOM. Keeping the tags in the main React
 * tree (instead of a drei <Html> root per label) guarantees all three render,
 * and lets us disable pointer events so tags can never block node clicks. */
function LabelProjector({
  bodyRef,
  labelRefs,
}: {
  bodyRef: RefObject<THREE.Group | null>;
  labelRefs: LabelRefs;
}) {
  const { camera, size } = useThree();
  const projected = useRef(new THREE.Vector3());

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.updateWorldMatrix(true, false);

    for (const organ of ORGAN_ORDER) {
      const label = labelRefs[organ].current;
      if (!label) continue;

      const [x, y, z] = ORGAN_POSITIONS[organ];
      projected.current.set(x, y + LABEL_OFFSET_Y, z);
      body.localToWorld(projected.current);
      projected.current.project(camera);

      const visible =
        projected.current.z > -1 &&
        projected.current.z < 1 &&
        Math.abs(projected.current.x) < 1.15 &&
        Math.abs(projected.current.y) < 1.15;

      label.style.opacity = visible ? '1' : '0';
      label.style.transform =
        `translate3d(${(projected.current.x * 0.5 + 0.5) * size.width}px, ` +
        `${(-projected.current.y * 0.5 + 0.5) * size.height}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

/* Smoothly eases camera.zoom toward zoomRef.current (button-driven zoom). */
function ZoomRig({ zoomRef }: { zoomRef: RefObject<number> }) {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    const target = zoomRef.current ?? 1;
    const diff = target - camera.zoom;
    if (Math.abs(diff) > 0.001) {
      camera.zoom += diff * 0.18;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function TwinScene({
  selectedOrgan,
  protocol,
  solarStormActive,
  onSelectOrgan,
  labelRefs,
  zoomUnlocked,
  controlsRef,
  zoomRef,
}: SceneProps) {
  const bodyGroup = useRef<THREE.Group>(null);
  const severityAlert = protocol !== null && protocol.severity !== 'NOMINAL';
  const alert = severityAlert || solarStormActive;

  // Let vertical touch swipes pan the page (mobile) while horizontal drags rotate the twin
  useEffect(() => {
    const el = controlsRef.current?.domElement;
    if (el) el.style.touchAction = 'pan-y';
  }, [controlsRef]);

  useFrame(({ clock }) => {
    if (!bodyGroup.current) return;
    const time = clock.getElapsedTime();
    bodyGroup.current.rotation.y = time * 0.2 + Math.sin(time * 0.35) * 0.1;
    bodyGroup.current.position.y = Math.sin(time * 0.7) * 0.035;
  });

  const isNodeAlert = (organ: ActiveOrgan): boolean => {
    if (!severityAlert || !protocol) return false;
    return protocol.affectedOrgan === organ || protocol.affectedOrgan === null;
  };

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 5, 5]} intensity={48} color={CYAN} distance={18} decay={2} />
      <pointLight position={[-5, 2, 3]} intensity={38} color={VIOLET} distance={18} decay={2} />
      <pointLight position={[0, -2, 4]} intensity={18} color={CYAN} distance={12} decay={2} />

      <Stars
        radius={80}
        depth={45}
        count={1300}
        factor={2.6}
        saturation={0}
        fade
        speed={0.35}
      />

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        target={[0, 0.85, 0]}
        enablePan={false}
        enableZoom={zoomUnlocked}
        enableRotate
        minDistance={6.6}
        maxDistance={12}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.62}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
      />

      {/* mannequin content — nudged down so head + scanner ring sit comfortably in frame */}
      <group position={[0, -0.18, 0]}>
        <group ref={bodyGroup}>
          <BodyShell alert={alert} />
          {(ORGAN_ORDER).map((organ) => (
            <OrganNode
              key={organ}
              organ={organ}
              position={ORGAN_POSITIONS[organ]}
              selected={selectedOrgan === organ}
              alert={isNodeAlert(organ)}
              onSelect={onSelectOrgan}
            />
          ))}
        </group>

        <LabelProjector bodyRef={bodyGroup} labelRefs={labelRefs} />
      <ZoomRig zoomRef={zoomRef} />

        <OrbitalRings />
        <ScannerBand />
        <gridHelper args={[11, 22, '#0a2a3a', '#071522']} position={[0, -1.07, 0]} />

        <Sparkles
          count={70}
          scale={[4.2, 5.2, 4.2]}
          position={[0, 0.9, 0]}
          size={1.7}
          speed={0.32}
          opacity={0.55}
          color={CYAN}
        />
        <Sparkles
          count={35}
          scale={[3.2, 4.2, 3.2]}
          position={[0, 1.1, 0]}
          size={1.2}
          speed={0.22}
          opacity={0.4}
          color={VIOLET}
        />
      </group>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

interface HologramTwinProps {
  vitals: AstronautVitals | null;
  protocol: TriageProtocol | null;
  selectedOrgan: OrganZone;
  solarStormActive: boolean;
  onSelectOrgan: (organ: ActiveOrgan) => void;
}

export default function HologramTwin({
  vitals,
  protocol,
  selectedOrgan,
  solarStormActive,
  onSelectOrgan,
}: HologramTwinProps) {
  // Wheel on the canvas defaults to page scroll (page-friendly). Flip "wheel zoom mode"
  // via the on-screen toggle (or hold Ctrl/Cmd) to get classic wheel zoom back.
  const [wheelZoomMode, setWheelZoomMode] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  useEffect(() => {
    const unlock = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') setCtrlHeld(true);
    };
    const lock = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') setCtrlHeld(false);
    };
    const reset = () => setCtrlHeld(false);
    window.addEventListener('keydown', unlock);
    window.addEventListener('keyup', lock);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('keyup', lock);
      window.removeEventListener('blur', reset);
    };
  }, []);

  const zoomEnabled = wheelZoomMode || ctrlHeld;

  const brainLabelRef = useRef<HTMLDivElement>(null);
  const heartLabelRef = useRef<HTMLDivElement>(null);
  const spineLabelRef = useRef<HTMLDivElement>(null);
  const labelRefs: LabelRefs = {
    brain: brainLabelRef,
    heart: heartLabelRef,
    spine: spineLabelRef,
  };

  // Desired camera zoom factor — fed to ZoomRig inside the Canvas every frame
  const zoomRef = useRef(1);
  const controlsRef = useRef<{ domElement?: HTMLCanvasElement; reset?: () => void } | null>(null);
  const clampZoom = (value: number) => Math.min(2.4, Math.max(0.65, value));
  const nudgeZoom = (delta: number) => {
    zoomRef.current = clampZoom(zoomRef.current + delta);
  };
  const resetView = () => {
    zoomRef.current = 1;
    controlsRef.current?.reset?.();
  };

  const severityAlert = protocol !== null && protocol.severity !== 'NOMINAL';
  const isOrganAlert = (organ: ActiveOrgan): boolean =>
    severityAlert &&
    protocol !== null &&
    (protocol.affectedOrgan === organ || protocol.affectedOrgan === null);

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0.92, 8.7], fov: 38, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <TwinScene
            selectedOrgan={selectedOrgan}
            protocol={protocol}
            solarStormActive={solarStormActive}
            onSelectOrgan={onSelectOrgan}
            labelRefs={labelRefs}
            zoomUnlocked={zoomEnabled}
            controlsRef={controlsRef}
            zoomRef={zoomRef}
          />
        </Suspense>
      </Canvas>

      {/* zoom controls — mouse friendly, mirrors old wheel-zoom but doesn't steal page scroll */}
      <div
        className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5"
        role="group"
        aria-label="Hologram zoom controls"
      >
        <button
          type="button"
          onClick={() => nudgeZoom(0.25)}
          aria-label="Zoom in — bring the astronaut closer"
          title="Zoom in · zoom out with the minus button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-electric/30 bg-void/70 text-electric backdrop-blur-sm transition-all hover:border-electric/60 hover:bg-electric/15 hover:shadow-[0_0_18px_-6px_rgba(0,240,255,0.8)] focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => nudgeZoom(-0.25)}
          aria-label="Zoom out — see the whole body"
          title="Zoom out"
          className="grid h-10 w-10 place-items-center rounded-lg border border-electric/30 bg-void/70 text-electric backdrop-blur-sm transition-all hover:border-electric/60 hover:bg-electric/15 hover:shadow-[0_0_18px_-6px_rgba(0,240,255,0.8)] focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]"
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset view — original camera position and zoom"
          title="Reset view (camera + zoom)"
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-void/70 text-slate-400 backdrop-blur-sm transition-all hover:border-electric/35 hover:text-electric focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setWheelZoomMode((value) => !value)}
          aria-pressed={wheelZoomMode}
          aria-label={wheelZoomMode ? 'Wheel mode: zoom — click for page scroll' : 'Wheel mode: scroll — click for wheel zoom'}
          title={wheelZoomMode
            ? 'Wheel currently zooms the twin — click to make the wheel scroll the page'
            : 'Wheel currently scrolls the page — click to make the wheel zoom the twin (wheel-zoom mode)'}
          className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-white/10 bg-void/70 text-slate-400 backdrop-blur-sm transition-all hover:border-electric/35 hover:text-electric focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]"
        >
          {wheelZoomMode ? (
            <ZoomIn className="h-4 w-4" strokeWidth={2} />
          ) : (
            <MoveVertical className="h-4 w-4" strokeWidth={2} />
          )}
          <span className="mt-0.5 font-mono text-[5.5px] leading-none text-current">
            {wheelZoomMode ? 'ZOOM' : 'SCROLL'}
          </span>
        </button>
      </div>

      {/* organ tags — projected from the rotating body every frame */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {ORGAN_ORDER.map((organ) => {
          const selected = selectedOrgan === organ;
          const alert = isOrganAlert(organ);
          return (
            <div
              key={organ}
              ref={labelRefs[organ]}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 will-change-transform"
              style={{ opacity: 0, transition: 'opacity 200ms' }}
            >
              <div
                className={cn(
                  'select-none whitespace-nowrap rounded border bg-void/85 px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm',
                  alert
                    ? 'border-critical/60 text-critical shadow-[0_0_14px_-4px_rgba(255,42,95,0.9)]'
                    : selected
                      ? 'border-violet/55 text-violet'
                      : 'border-electric/35 text-electric',
                )}
              >
                {ORGAN_META[organ].short}
              </div>
            </div>
          );
        })}
      </div>

      {/* atmospheric vignette + horizontal holo sweep */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_28%,rgba(5,8,20,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-sweep-down h-24 w-full bg-gradient-to-b from-transparent via-electric/[0.055] to-transparent" />
      </div>

      {!vitals ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-electric/20 bg-void/70 px-5 py-4 backdrop-blur-md">
            <span className="h-2 w-2 animate-sentinel-blink rounded-full bg-electric" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-electric">
              Rendering biometric mesh…
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
