import React from 'react'
import { Avatar as MAvatar } from '@mantine/core'

interface Props {
  name: string
  emoji?: string
  color?: string
  size?: number
  className?: string
}

const COLORS = [
  '#3b82f6', '#2563eb', '#7c3aed', '#059669',
  '#dc2626', '#d97706', '#db2777', '#0891b2',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, emoji, color, size = 40 }: Props) {
  const bg = color ?? colorFor(name)

  return (
    <MAvatar
      size={size}
      radius="xl"
      style={{ backgroundColor: bg, flexShrink: 0 }}
    >
      {emoji ? (
        <span style={{ fontSize: size * 0.45, lineHeight: 1 }}>{emoji}</span>
      ) : (
        <span style={{ fontSize: size * 0.37, fontWeight: 600, color: '#fff' }}>
          {initials(name)}
        </span>
      )}
    </MAvatar>
  )
}
