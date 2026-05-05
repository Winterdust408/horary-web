import { useEffect } from 'react'
import { Chart as AstroChart } from '@astrodraw/astrochart'

export function ChartWheel({ data }: { data: { planets: Record<string, number[]>; cusps: number[]; aspects: any[] } }) {
  const containerId = 'horary-wheel'

  useEffect(() => {
    const el = document.getElementById(containerId)
    if (el) el.innerHTML = ''
    try {
      const chart = new AstroChart(containerId, 520, 520, {
        ASPECTS: {
          conjunction: { degree: 0, orbit: 10, color: 'transparent' },
          sextile: { degree: 60, orbit: 6, color: '#5a5' },
          square: { degree: 90, orbit: 8, color: '#FF4500' },
          trine: { degree: 120, orbit: 8, color: '#27AE60' },
          opposition: { degree: 180, orbit: 10, color: '#FF0000' },
        },
        SHOW_DIGNITIES_TEXT: false,
        DIGNITIES_RULERSHIP: '',
        DIGNITIES_DETRIMENT: '',
        DIGNITIES_EXALTATION: '',
        DIGNITIES_EXACT_EXALTATION: '',
        DIGNITIES_FALL: '',
      } as any)
      const radix = chart.radix({ planets: data.planets, cusps: data.cusps })
      radix.aspects(data.aspects)
    } catch (e) {
      if (el) el.textContent = e instanceof Error ? e.message : 'Failed to render chart.'
    }
  }, [data])

  return <div id={containerId} />
}
