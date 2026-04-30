import { Horoscope, Origin } from 'circular-natal-horoscope-js/dist/index.js'
import { AspectCalculator } from '@astrodraw/astrochart'

export type ChartSummary = {
  ascendant: string
  midheaven: string
  time: { timezone: string; local: string; utc: string }
  houses: Array<{ house: number; eclipticDegrees: number; sign: string; formatted: string }>
  planets: Array<{ key: string; name: string; eclipticDegrees: number; sign: string; formatted: string }>
  astroChartData: { planets: Record<string, [number]>; cusps: number[]; aspects: any[] }
  aspectsList: Array<{ from: string; to: string; type: string; orb: string }>
}

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatDeg(deg: number) {
  const d = Math.floor(deg)
  const mFloat = (deg - d) * 60
  const m = Math.floor(mFloat)
  return `${d}°${pad2(m)}'`
}

/** Format decimal degrees as degrees and arc minutes (e.g. for aspect orbs). */
export function formatDegArcMin(deg: number): string {
  const d = Math.floor(deg)
  const mFloat = (deg - d) * 60
  const m = Math.round(mFloat)
  if (m >= 60) return `${d + 1}° 00′`
  return `${d}° ${pad2(m)}′`
}

/** Parse DMS (degrees, minutes, seconds) to decimal degrees. Sign: N/E = positive, S/W = negative. */
export function dmsToDecimal(
  deg: number,
  min: number,
  sec: number,
  sign: 'N' | 'S' | 'E' | 'W',
): number {
  const abs = deg + min / 60 + sec / 3600
  if (sign === 'S' || sign === 'W') return -abs
  return abs
}

export function dtLocalNowValue() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(
    now.getHours(),
  )}:${pad2(now.getMinutes())}`
}

export function calculateChart(dt: Date, lat: number, lon: number): { summary?: ChartSummary; error?: string } {
  if (Number.isNaN(dt.getTime())) return { error: 'Invalid date/time.' }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'Latitude must be between -90 and 90.' }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { error: 'Longitude must be between -180 and 180.' }

  try {
    const origin = new Origin({
      year: dt.getFullYear(),
      month: dt.getMonth(),
      date: dt.getDate(),
      hour: dt.getHours(),
      minute: dt.getMinutes(),
      latitude: lat,
      longitude: lon,
    })

    const horoscope = new Horoscope({
      origin,
      zodiac: 'tropical',
      houseSystem: 'regiomontanus',
      aspectPoints: [],
      aspectWithPoints: [],
      aspectTypes: [],
      language: 'en',
    })

    const asc = horoscope.Ascendant
    const mc = horoscope.Midheaven
    const houses = horoscope.Houses.map((h: any, idx: number) => {
      const cusp = h.ChartPosition?.StartPosition?.Ecliptic
      return {
        house: idx + 1,
        eclipticDegrees: cusp?.DecimalDegrees,
        sign: h.Sign?.label ?? h.Sign?.key ?? '',
        formatted: cusp?.ArcDegreesFormatted30 ?? '',
      }
    })

    const bodyKeys: Array<[string, string]> = [
      ['sun', 'Sun'],
      ['moon', 'Moon'],
      ['mercury', 'Mercury'],
      ['venus', 'Venus'],
      ['mars', 'Mars'],
      ['jupiter', 'Jupiter'],
      ['saturn', 'Saturn'],
      ['uranus', 'Uranus'],
      ['neptune', 'Neptune'],
      ['pluto', 'Pluto'],
    ]

    const planets = bodyKeys
      .map(([key, name]) => {
        const b: any = (horoscope.CelestialBodies as any)[key]
        if (!b) return undefined
        const ecliptic = b.ChartPosition?.Ecliptic?.DecimalDegrees
        return {
          key,
          name,
          eclipticDegrees: ecliptic,
          sign: b.Sign?.label ?? b.Sign?.key ?? '',
          formatted: b.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ?? '',
        }
      })
      .filter(Boolean) as ChartSummary['planets']

    const astroPlanets: Record<string, [number]> = {}
    for (const p of planets) {
      astroPlanets[p.name] = [p.eclipticDegrees]
    }
    const mcDeg = mc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0
    const icDeg = (mcDeg + 180) % 360
    astroPlanets.Mc = [mcDeg]
    astroPlanets.Ic = [icDeg]
    const cusps = houses.map((h: { eclipticDegrees: number }) => h.eclipticDegrees).filter((x: number) => Number.isFinite(x)) as number[]

    const aspectPoints: Record<string, [number]> = {}
    for (const [name, coords] of Object.entries(astroPlanets)) {
      if (name === 'Mc' || name === 'Ic') continue
      aspectPoints[name] = coords
    }
    const aspectCalc = new AspectCalculator(aspectPoints)
    const astroAspects: any[] = aspectCalc.radix(aspectPoints)
    const aspectsList = astroAspects.map((a) => {
      const precNum = typeof a.precision === 'number' ? a.precision : parseFloat(String(a.precision ?? 0))
      const orbStr = Number.isFinite(precNum) ? formatDegArcMin(precNum) : String(a.precision ?? '')
      return {
        from: a.point?.name ?? '',
        to: a.toPoint?.name ?? '',
        type: a.aspect?.name ?? '',
        orb: orbStr,
      }
    })

    const summary: ChartSummary = {
      ascendant: `${asc.Sign?.label ?? asc.Sign?.key ?? ''} ${
        asc.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ?? formatDeg(asc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0)
      }`,
      midheaven: `${mc.Sign?.label ?? mc.Sign?.key ?? ''} ${
        mc.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ?? formatDeg(mc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0)
      }`,
      houses,
      planets,
      time: {
        timezone: String((origin as any).timezone ?? ''),
        local: String((origin as any).localTimeFormatted ?? ''),
        utc: String((origin as any).utcTimeFormatted ?? ''),
      },
      astroChartData: { planets: astroPlanets, cusps, aspects: astroAspects },
      aspectsList,
    }

    return { summary }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to calculate chart.' }
  }
}
