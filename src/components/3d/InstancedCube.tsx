"use client"

import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { InstancedMesh, Object3D, Vector3, Color, ShaderMaterial } from 'three'
import * as THREE from 'three'
// Using React state for animations instead of anime.js

// Import shaders
const vertexShader = `
// Vertex shader for instanced cube with noise and animation
attribute vec3 instanceOffset;
attribute vec3 instanceColor;
attribute float instanceSeed;

varying vec3 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vSeed;

uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform float uExplodeStrength;

// Simplex noise function
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vColor = instanceColor;
  vSeed = instanceSeed;
  
  // Calculate world position with instance offset
  vec3 worldPos = position + instanceOffset;
  
  // Add time-based noise animation
  float noiseScale = 0.5;
  float timeScale = 0.8;
  vec3 noisePos = worldPos * noiseScale + vec3(uTime * timeScale);
  float noise = snoise(noisePos + instanceSeed);
  
  // Pulse effect
  float pulse = sin(uTime * 2.0 + instanceSeed * 10.0) * 0.1;
  
  // Mouse interaction
  vec2 mouseWorld = uMouse;
  float mouseDistance = length(worldPos.xy - mouseWorld);
  float mouseEffect = exp(-mouseDistance * 0.5) * uMouseInfluence;
  
  // Combine all effects
  vec3 displacement = normal * (noise * 0.2 + pulse + mouseEffect * 0.5);
  
  // Explode effect
  displacement += normalize(worldPos) * uExplodeStrength;
  
  vec3 finalPosition = worldPos + displacement;
  
  vPosition = finalPosition;
  vWorldPosition = finalPosition;
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
}
`

const fragmentShader = `
// Fragment shader for instanced cube with gradients and rim lighting
varying vec3 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vSeed;

uniform float uTime;
uniform vec3 uCameraPosition;
uniform float uRimPower;
uniform float uFresnelPower;
uniform vec3 uRimColor;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Smooth noise function
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  
  float n = p.x + p.y * 57.0 + 113.0 * p.z;
  return mix(
    mix(
      mix(hash(n + 0.0), hash(n + 1.0), f.x),
      mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
    mix(
      mix(hash(n + 113.0), hash(n + 114.0), f.x),
      mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  
  // Fresnel effect
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uFresnelPower);
  
  // Rim lighting
  float rim = 1.0 - max(dot(normal, viewDirection), 0.0);
  rim = pow(rim, uRimPower);
  
  // Use the base color from our palette
  vec3 baseColor = vColor;
  
  // Add subtle brightness variation based on time and position
  vec3 noisePos = vWorldPosition * 1.5 + vec3(uTime * 0.2);
  float brightnessNoise = noise(noisePos) * 0.15 + 0.85;
  
  // Apply brightness variation while keeping original colors
  vec3 finalColor = baseColor * brightnessNoise;
  
  // Apply lighting effects
  vec3 rimLight = uRimColor * rim * 2.0;
  vec3 fresnelColor = mix(finalColor, vec3(1.0), fresnel * 0.3);
  
  // Combine all effects
  vec3 color = fresnelColor + rimLight;
  
  // Add subtle glow
  float glow = sin(uTime * 3.0 + vSeed * 10.0) * 0.1 + 0.9;
  color *= glow;
  
  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(color, 1.0);
}
`

interface InstancedCubeProps {
  count?: number
  size?: number
  spread?: number
  onHover?: (position: Vector3 | null) => void
  onClick?: () => void
}

export function InstancedCube({ 
  count = 1000, 
  size = 0.1, 
  spread = 3,
  onHover,
  onClick 
}: InstancedCubeProps) {
  const meshRef = useRef<InstancedMesh>(null!)
  const materialRef = useRef<ShaderMaterial>(null!)
  const { camera, raycaster, mouse, scene } = useThree()
  
  // Mouse position in world coordinates
  const mouseWorldPos = useRef(new Vector3())
  const explodeStrength = useRef(0)
  
  // Create instance data
  const { offsets, colors, seeds } = useMemo(() => {
    const offsets = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    
    const tempObject = new Object3D()
    const tempColor = new Color()
    
    for (let i = 0; i < count; i++) {
      // Position in a cube formation
      const x = (Math.random() - 0.5) * spread
      const y = (Math.random() - 0.5) * spread
      const z = (Math.random() - 0.5) * spread
      
      offsets[i * 3] = x
      offsets[i * 3 + 1] = y
      offsets[i * 3 + 2] = z
      
      // Yellow and light orange palette
      const colorVariants = [
        { h: 0.16, s: 0.95, l: 0.8 },  // Bright yellow
        { h: 0.14, s: 0.9, l: 0.75 },  // Light yellow
        { h: 0.12, s: 0.85, l: 0.7 },  // Yellow-orange
        { h: 0.10, s: 0.8, l: 0.75 },  // Light orange-yellow
        { h: 0.08, s: 0.85, l: 0.7 },  // Light orange
        { h: 0.06, s: 0.8, l: 0.65 },  // Medium light orange
        { h: 0.04, s: 0.75, l: 0.6 },  // Soft orange
        { h: 0.02, s: 0.7, l: 0.55 }   // Warm light orange
      ]
      const variant = colorVariants[Math.floor(Math.random() * colorVariants.length)]
      tempColor.setHSL(variant.h, variant.s, variant.l)
      
      colors[i * 3] = tempColor.r
      colors[i * 3 + 1] = tempColor.g
      colors[i * 3 + 2] = tempColor.b
      
      // Random seed for each instance
      seeds[i] = Math.random() * 100
    }
    
    return { offsets, colors, seeds }
  }, [count, spread])
  
  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uMouseInfluence: { value: 0 },
        uExplodeStrength: { value: 0 },
        uCameraPosition: { value: camera.position },
        uRimPower: { value: 2.0 },
        uFresnelPower: { value: 1.5 },
        uRimColor: { value: new THREE.Vector3(1.0, 0.8, 0.2) } // Warm yellow-orange rim
      },
      transparent: true
    })
  }, [camera.position])
  
  // Set up instance attributes
  useEffect(() => {
    if (!meshRef.current) return
    
    const mesh = meshRef.current
    
    // Set instance attributes
    mesh.geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    mesh.geometry.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    
    // Set instance count
    mesh.count = count
  }, [offsets, colors, seeds, count])
  
  // Handle mouse interaction
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Convert mouse position to world coordinates
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Update mouse position for shader
      if (materialRef.current) {
        materialRef.current.uniforms.uMouse.value.set(x * 2, y * 2)
        materialRef.current.uniforms.uMouseInfluence.value = 1.0
      }
      
      // Animate mouse influence back to 0
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 1000, 1)
        const eased = 1 - Math.pow(1 - progress, 4) // easeOutQuart
        
        if (materialRef.current) {
          materialRef.current.uniforms.uMouseInfluence.value = 1 - eased
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    }
    
    const handleClick = () => {
      if (onClick) onClick()
      
      // Trigger explode effect
      if (materialRef.current) {
        const startTime = Date.now()
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / 800, 1)
          
          // Elastic easing approximation
          let value
          if (progress < 0.5) {
            value = progress * 2 // 0 to 1
          } else {
            const elasticProgress = (progress - 0.5) * 2
            value = 1 - elasticProgress + Math.sin(elasticProgress * Math.PI * 4) * 0.1 * (1 - elasticProgress)
          }
          
          materialRef.current!.uniforms.uExplodeStrength.value = Math.max(0, value)
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          }
        }
        requestAnimationFrame(animate)
      }
    }
    
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove)
      canvas.addEventListener('click', handleClick)
      
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove)
        canvas.removeEventListener('click', handleClick)
      }
    }
  }, [onClick])
  
  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uCameraPosition.value.copy(camera.position)
    }
    
    // Rotate the entire mesh slowly
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.002
      meshRef.current.rotation.y += 0.003
    }
  })
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      material={shaderMaterial}
      frustumCulled={false}
    >
      <boxGeometry args={[size, size, size]} />
      <shaderMaterial ref={materialRef} attach="material" {...shaderMaterial} />
    </instancedMesh>
  )
}