'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Sparkles } from '@react-three/drei'
import { useRef, useMemo, Component, ReactNode } from 'react'

// ─── CSS fallback when WebGL is unavailable ───────────────────────────────────

function WebGLFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Animated gradient rings */}
      <div className="relative w-72 h-72 opacity-60">
        <div className="absolute inset-0 rounded-full border border-[#00d4ff]/20 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 rounded-full border border-[#00d4ff]/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className="absolute inset-8 rounded-full border border-[#00d4ff]/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[#00d4ff] text-2xl">⬡</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Error boundary wrapping the Canvas ──────────────────────────────────────

interface EBState { failed: boolean }
class WebGLErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <WebGLFallback /> : this.props.children
  }
}
import * as THREE from 'three'

// ─── Car Body ─────────────────────────────────────────────────────────────────

function CarBody() {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Low-poly sedan silhouette vertices
    const vertices = new Float32Array([
      // Bottom chassis
      -2.2, -0.35, 0.9,   // 0
       2.2, -0.35, 0.9,   // 1
       2.2, -0.35, -0.9,  // 2
      -2.2, -0.35, -0.9,  // 3

      // Upper body sides (front)
       1.8, -0.35, 0.9,   // 4
       1.8, -0.35, -0.9,  // 5
       1.2,  0.4,  0.85,  // 6
       1.2,  0.4, -0.85,  // 7

      // Roof
      -0.6,  0.85,  0.7,  // 8
      -0.6,  0.85, -0.7,  // 9
       0.9,  0.85,  0.7,  // 10
       0.9,  0.85, -0.7,  // 11

      // Upper body sides (rear)
      -1.6, -0.35,  0.9,  // 12
      -1.6, -0.35, -0.9,  // 13
      -1.4,  0.3,   0.8,  // 14
      -1.4,  0.3,  -0.8,  // 15

      // Hood slope front
       2.1, -0.1,  0.85,  // 16
       2.1, -0.1, -0.85,  // 17

      // Trunk slope rear
      -2.0, -0.1,  0.85,  // 18
      -2.0, -0.1, -0.85,  // 19

      // Windshield
       1.15,  0.38,  0.84, // 20
       1.15,  0.38, -0.84, // 21
       0.88,  0.84,  0.69, // 22
       0.88,  0.84, -0.69, // 23
    ])

    // Faces (triangles)
    const indices = [
      // Hood
      16, 4, 6,   16, 6, 20,
      17, 21, 7,  17, 7, 5,

      // Windshield
      20, 6, 22,  22, 6, 10,
      21, 23, 7,  23, 11, 7,

      // Roof
      22, 10, 11, 22, 11, 23,
      10, 8, 9,   10, 9, 11,
      8, 9, 15,   8, 15, 14,

      // Rear window
      14, 15, 19, 14, 19, 18,

      // Side panels (right)
      4, 1, 0,   4, 0, 12,
      6, 4, 12,  6, 12, 14,

      // Side panels (left)
      5, 2, 17,
      7, 5, 17,

      // Bottom
      0, 1, 2,   0, 2, 3,

      // Front face
      16, 17, 5,  16, 5, 4,

      // Rear face
      18, 12, 13, 18, 13, 19,
    ]

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#00d4ff"
        emissive="#003355"
        emissiveIntensity={0.4}
        metalness={0.7}
        roughness={0.2}
        wireframe={false}
      />
    </mesh>
  )
}

// ─── Wheel ────────────────────────────────────────────────────────────────────

function Wheel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x += 0.05
    }
  })

  return (
    <mesh ref={ref} position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <torusGeometry args={[0.36, 0.12, 8, 16]} />
      <meshStandardMaterial
        color="#0a1520"
        emissive="#001122"
        metalness={0.5}
        roughness={0.6}
      />
    </mesh>
  )
}

// ─── Grid Floor ───────────────────────────────────────────────────────────────

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 20, 20]} />
      <meshStandardMaterial
        color="#050810"
        emissive="#001a2e"
        emissiveIntensity={0.1}
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  )
}

// ─── Glow Ring ────────────────────────────────────────────────────────────────

function GlowRing() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z += 0.005
      const pulse = Math.sin(state.clock.elapsedTime * 1.2) * 0.15 + 0.85
      ref.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={ref} position={[0, -0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[2.5, 0.02, 8, 64]} />
      <meshStandardMaterial
        color="#00d4ff"
        emissive="#00d4ff"
        emissiveIntensity={1.5}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

// ─── Inner Car Scene (Three.js objects) ───────────────────────────────────────

function InnerScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} color="#111122" />
      <pointLight position={[5, 5, 5]} color="#00d4ff" intensity={3} castShadow />
      <pointLight position={[-5, 3, -3]} color="#0044aa" intensity={1.5} />
      <pointLight position={[0, -1, 0]} color="#003366" intensity={0.8} />
      <spotLight
        position={[0, 8, 2]}
        angle={0.4}
        penumbra={0.8}
        intensity={2}
        color="#00aaff"
        castShadow
      />

      {/* Car assembly */}
      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
        <group>
          <CarBody />
          {/* Wheels */}
          <Wheel position={[1.4, -0.6, 0.95]} />
          <Wheel position={[1.4, -0.6, -0.95]} />
          <Wheel position={[-1.4, -0.6, 0.95]} />
          <Wheel position={[-1.4, -0.6, -0.95]} />
        </group>
      </Float>

      {/* Ground effects */}
      <GridFloor />
      <GlowRing />

      {/* Particles — reduced count for lower GPU load */}
      <Sparkles
        count={60}
        scale={[12, 6, 12]}
        size={1.2}
        speed={0.2}
        color="#00d4ff"
        opacity={0.4}
      />

      {/* Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
        autoRotate={false}
        rotateSpeed={0.5}
      />
    </>
  )
}

// ─── Exported Scene ───────────────────────────────────────────────────────────

export function CarScene() {
  return (
    <div className="w-full h-full">
      <WebGLErrorBoundary>
        <Canvas
          camera={{ position: [0, 1.8, 7], fov: 45 }}
          shadows={false}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ background: 'transparent' }}
          className="three-scene"
        >
          <InnerScene />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  )
}

export default CarScene
