"use client"

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { InstancedCube } from './InstancedCube'
import * as THREE from 'three'

interface CubeSceneProps {
  className?: string
  cubeCount?: number
  interactive?: boolean
}

function SceneContent({ cubeCount = 1000, interactive = true }: { cubeCount: number, interactive: boolean }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b6b" />
      <pointLight position={[10, -10, 10]} intensity={0.5} color="#4ecdc4" />
      
      {/* Environment for reflections */}
      <Environment preset="city" />
      
      {/* Main instanced cube */}
      <InstancedCube 
        count={cubeCount}
        size={0.08}
        spread={4}
        onClick={() => {
          if (interactive) {
            console.log('Cube clicked!')
          }
        }}
      />
      
      {/* Camera controls */}
      {interactive && (
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      )}
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col gap-0.5 animate-pulse">
        <div className="flex gap-0.5">
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 via-orange-400 to-orange-500 rounded-sm" />
          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 via-red-400 to-red-500 rounded-sm" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 via-red-500 to-red-600 rounded-sm" />
          <div className="w-6 h-6 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-sm" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-6 h-6 bg-gradient-to-br from-red-600 via-pink-600 to-purple-600 rounded-sm" />
          <div className="w-6 h-6 bg-gradient-to-br from-pink-600 via-purple-600 to-purple-700 rounded-sm" />
        </div>
      </div>
    </div>
  )
}

export function CubeScene({ className = "", cubeCount = 1000, interactive = true }: CubeSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ 
          position: [5, 5, 5], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
          gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        <Suspense fallback={null}>
          <SceneContent cubeCount={cubeCount} interactive={interactive} />
        </Suspense>
      </Canvas>
      
      {/* Loading overlay */}
      <Suspense fallback={<LoadingFallback />}>
        <div style={{ display: 'none' }} />
      </Suspense>
    </div>
  )
}