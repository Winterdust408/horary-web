import { useEffect } from 'react'
import { Chart as AstroChart } from '@astrodraw/astrochart'

export function ChartWheel({ data }: { data: { planets: Record<string, [number]>; cusps: number[]; aspects: any[] } }) {
  const containerId = 'horary-wheel'

  useEffect(() => {
    const el = document.getElementById(containerId)
    if (el) el.innerHTML = ''
    try {
      const chart = new AstroChart(containerId, 520, 520)
      const radix = chart.radix({ planets: data.planets, cusps: data.cusps })
      radix.aspects(data.aspects)
    } catch (e) {
      if (el) el.textContent = e instanceof Error ? e.message : 'Failed to render chart.'
    }
  }, [data])

  return <div id={containerId} />
}
