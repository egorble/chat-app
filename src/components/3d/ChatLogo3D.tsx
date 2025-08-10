"use client"

import React from 'react'
import { CubeScene } from './CubeScene'

interface ChatLogo3DProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

export function ChatLogo3D({ 
  className = "", 
  size = 'md', 
  interactive = true 
}: ChatLogo3DProps) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48', 
    lg: 'w-64 h-64'
  }
  
  const cubeCount = {
    sm: 500,
    md: 1000,
    lg: 1500
  }
  
  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {/* 3D Scene */}
      <CubeScene 
        cubeCount={cubeCount[size]}
        interactive={interactive}
        className="w-full h-full"
      />
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-red-400/20 to-purple-400/20 rounded-lg blur-xl -z-10" />
      
      {/* Interactive hint */}
      {interactive && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-70 pointer-events-none">
          Click & drag to interact
        </div>
      )}
    </div>
  )
}