import { useEffect, useMemo, useState } from 'react'
import { Horoscope, Origin } from 'circular-natal-horoscope-js/dist/index.js'
import { Chart as AstroChart, AspectCalculator } from '@astrodraw/astrochart'
import './App.css'

type ChartSummary = {
  ascendant: string
  midheaven: string
  time: { timezone: string; local: string; utc: string }
  houses: Array<{ house: number; eclipticDegrees: number; sign: string; formatted: string }>
  planets: Array<{ key: string; name: string; eclipticDegrees: number; sign: string; formatted: string }>
  astroChartData: { planets: Record<string, [number]>; cusps: number[]; aspects: any[] }
  aspectsList: Array<{ from: string; to: string; type: string; orb: string }>
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDeg(deg: number) {
  const d = Math.floor(deg)
  const mFloat = (deg - d) * 60
  const m = Math.floor(mFloat)
  return `${d}°${pad2(m)}'`
}

function dtLocalNowValue() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(
    now.getHours(),
  )}:${pad2(now.getMinutes())}`
}

function App() {
  const [dateTimeLocal, setDateTimeLocal] = useState(dtLocalNowValue())
  const [latitude, setLatitude] = useState('51.5074')
  const [longitude, setLongitude] = useState('-0.1278')

  const parsed = useMemo(() => {
    const dt = new Date(dateTimeLocal)
    const lat = Number(latitude)
    const lon = Number(longitude)
    return { dt, lat, lon }
  }, [dateTimeLocal, latitude, longitude])

  const chart = useMemo<{ summary?: ChartSummary; error?: string }>(() => {
    const { dt, lat, lon } = parsed
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
      // House is an interval; the cusp is the house start position.
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
        // AstroChart keys are capitalized: Sun, Moon, Mercury...
        astroPlanets[p.name] = [p.eclipticDegrees]
      }
      // Mark Midheaven (Mc) and IC on the wheel as additional points (but we will exclude them from aspect calc)
      const mcDeg = mc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0
      const icDeg = (mcDeg + 180) % 360
      astroPlanets.Mc = [mcDeg]
      astroPlanets.Ic = [icDeg]
      const cusps = houses.map((h) => h.eclipticDegrees).filter((x) => Number.isFinite(x)) as number[]

      // Calculate aspects between planets only (no MC/IC) for both drawing and listing
      const aspectPoints: Record<string, [number]> = {}
      for (const [name, coords] of Object.entries(astroPlanets)) {
        if (name === 'Mc' || name === 'Ic') continue
        aspectPoints[name] = coords
      }
      const aspectCalc = new AspectCalculator(aspectPoints)
      const astroAspects: any[] = aspectCalc.radix(aspectPoints)
      const aspectsList = astroAspects.map((a) => ({
        from: a.point?.name ?? '',
        to: a.toPoint?.name ?? '',
        type: a.aspect?.name ?? '',
        orb: typeof a.precision === 'number' ? `${a.precision.toFixed(2)}°` : String(a.precision ?? ''),
      }))

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
  }, [parsed])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, textAlign: 'left' }}>
      <h1 style={{ marginBottom: 8 }}>Horary (Regiomontanus) Calculator</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        In-browser chart math via <code>circular-natal-horoscope-js</code>. House system: <b>Regiomontanus</b>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
        <label>
          Date/time (local)
          <input
            type="datetime-local"
            value={dateTimeLocal}
            onChange={(e) => setDateTimeLocal(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            Latitude
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label>
            Longitude
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} style={{ width: '100%' }} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {chart.error ? (
          <div style={{ padding: 12, border: '1px solid #c33', borderRadius: 8 }}>
            <b>Error:</b> {chart.error}
          </div>
        ) : chart.summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
              <h2 style={{ marginTop: 0 }}>Angles</h2>
              <div style={{ opacity: 0.85, marginBottom: 8 }}>
                <b>Timezone:</b> {chart.summary.time.timezone || '(unknown)'} <br />
                <b>Local:</b> {chart.summary.time.local || '(unknown)'} <br />
                <b>UTC:</b> {chart.summary.time.utc || '(unknown)'}
              </div>
              <div>
                <b>ASC:</b> {chart.summary.ascendant}
              </div>
              <div>
                <b>MC:</b> {chart.summary.midheaven}
              </div>

              <h2>Houses</h2>
              <ol style={{ marginTop: 8 }}>
                {chart.summary.houses.map((h) => (
                  <li key={h.house}>
                    <b>House {h.house}:</b> {h.sign} {h.formatted || formatDeg(h.eclipticDegrees)}
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
              <h2 style={{ marginTop: 0 }}>Planets</h2>
              <ul style={{ marginTop: 8 }}>
                {chart.summary.planets.map((p) => (
                  <li key={p.key}>
                    <b>{p.name}:</b> {p.sign} {p.formatted || formatDeg(p.eclipticDegrees)}
                  </li>
                ))}
              </ul>

              <h2 style={{ marginTop: 16 }}>Aspects (planet–planet)</h2>
              <ul style={{ marginTop: 8 }}>
                {chart.summary.aspectsList.length === 0 && <li>No aspects found with default orbs.</li>}
                {chart.summary.aspectsList.map((a, idx) => (
                  <li key={`${a.from}-${a.to}-${idx}`}>
                    <b>{a.from}</b> {a.type} <b>{a.to}</b> ({a.orb} from perfect)
                  </li>
                ))}
              </ul>
              <p style={{ opacity: 0.75 }}>
                Wheel below shows the same planet–planet aspects from the chart center.
              </p>
            </div>
          </div>
        ) : null}

        {chart.summary ? (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
            <h2 style={{ marginTop: 0 }}>Chart wheel</h2>
            <ChartWheel data={chart.summary.astroChartData} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ChartWheel({ data }: { data: { planets: Record<string, [number]>; cusps: number[]; aspects: any[] } }) {
  const containerId = 'horary-wheel'

  useEffect(() => {
    // clear existing svg
    const el = document.getElementById(containerId)
    if (el) el.innerHTML = ''
    try {
      const chart = new AstroChart(containerId, 520, 520)
      const radix = chart.radix({ planets: data.planets, cusps: data.cusps })
      // Draw only the precomputed planet–planet aspects (no MC/IC)
      radix.aspects(data.aspects)
    } catch (e) {
      if (el) el.textContent = e instanceof Error ? e.message : 'Failed to render chart.'
    }
  }, [data])

  return <div id={containerId} />
}

export default App
