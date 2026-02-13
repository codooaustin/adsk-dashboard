'use client'

import { ReactNode } from 'react'

const LEADER_LENGTH = 24
const TEXT_OFFSET = 28

interface LeaderLabelProps {
  text: string
  x?: number
  y?: number
  viewBox?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}

/**
 * Renders a short leader line and text label (e.g. for High/Low callouts on charts).
 * Receives Recharts label props (x, y in pixel coordinates).
 */
export default function LeaderLabel({ text, x = 0, y = 0 }: LeaderLabelProps): ReactNode {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-LEADER_LENGTH}
        stroke="#94a3b8"
        strokeWidth={1}
      />
      <text
        x={0}
        y={-TEXT_OFFSET}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={11}
        fontWeight={500}
      >
        {text}
      </text>
    </g>
  )
}
