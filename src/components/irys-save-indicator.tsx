"use client"

import { Circle, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface IrysSaveIndicatorProps {
  status: 'saved' | 'pending' | 'error' | 'not_saved'
  className?: string
  size?: 'sm' | 'md'
}

export function IrysSaveIndicator({ status, className, size = 'sm' }: IrysSaveIndicatorProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          title: 'Збережено в Irys'
        }
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-500 animate-pulse',
          title: 'Збереження в процесі...'
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          title: 'Помилка збереження'
        }
      case 'not_saved':
      default:
        return {
          icon: Circle,
          color: 'text-red-500',
          title: 'Не збережено'
        }
    }
  }

  const { icon: Icon, color, title } = getStatusConfig()

  return (
    <div 
      className={cn('flex items-center justify-center', className)}
      title={title}
    >
      <Icon className={cn(iconSize, color)} />
    </div>
  )
}