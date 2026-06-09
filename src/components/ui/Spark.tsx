// src/components/ui/Spark.tsx — Mini sparkline (SVG polyline + last-point dot).
// Port: app2/ui.jsx Spark

export interface SparkProps {
  data: readonly number[]
  color: string
  w?: number
  h?: number
}

export function Spark({ data, color, w = 70, h = 22 }: SparkProps) {
  if (data.length === 0) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const lastValue = data[data.length - 1] ?? 0
  const lastX = w
  const lastY = h - ((lastValue - min) / range) * (h - 2) - 1

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}
