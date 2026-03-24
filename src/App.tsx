import { useEffect, useMemo, useState, type KeyboardEventHandler } from 'react'
import { Horoscope, Origin } from 'circular-natal-horoscope-js/dist/index.js'
import { Chart as AstroChart, AspectCalculator } from '@astrodraw/astrochart'
import './App.css'

type ChartSummary = {
  ascendant: string
  ascendantSign: string
  ascendantDeg: number
  midheaven: string
  midheavenSign: string
  midheavenDeg: number
  descendantSign: string
  descendantDeg: number
  imumCoeliSign: string
  imumCoeliDeg: number
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

/** Ecliptic longitude (0–360°) to degrees within sign (0–30°). Used so we display e.g. "Pisces 21°13'" not "Pisces 351°13'". */
function degreesWithinSign(eclipticLongitude: number): number {
  if (!Number.isFinite(eclipticLongitude)) return 0
  const d = eclipticLongitude % 30
  return d < 0 ? d + 30 : d
}

/** Format decimal degrees as degrees and arc minutes (e.g. for aspect orbs). */
function formatDegArcMin(deg: number): string {
  const d = Math.floor(deg)
  const mFloat = (deg - d) * 60
  const m = Math.round(mFloat)
  if (m >= 60) return `${d + 1}° 00′`
  return `${d}° ${pad2(m)}′`
}

/** Compact arc-minute format for small wheel labels. */
function formatDegArcMinCompact(deg: number): string {
  const d = Math.floor(deg)
  const mFloat = (deg - d) * 60
  const m = Math.round(mFloat)
  if (m >= 60) return `${d + 1}°00′`
  return `${d}°${pad2(m)}′`
}

/** Parse DM (degrees, minutes) to decimal degrees. Sign: N/E = positive, S/W = negative. */
function dmToDecimal(
  deg: number,
  min: number,
  sign: 'N' | 'S' | 'E' | 'W',
): number {
  const abs = deg + min / 60
  if (sign === 'S' || sign === 'W') return -abs
  return abs
}

/** Convert decimal degrees to DM (degrees and minutes only). */
function decimalToDM(
  decimal: number,
  isLat: boolean,
): { deg: number; min: number; sign: 'N' | 'S' | 'E' | 'W' } {
  const abs = Math.abs(decimal)
  const d = Math.floor(abs)
  const m = Math.round((abs - d) * 60)
  const [min, deg] = m >= 60 ? [0, d + 1] : [m, d]
  if (isLat) return { deg, min, sign: decimal >= 0 ? 'N' : 'S' }
  return { deg, min, sign: decimal >= 0 ? 'E' : 'W' }
}

function dtLocalNowValue() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(
    now.getHours(),
  )}:${pad2(now.getMinutes())}`
}

function dateLocalNowValue() {
  return dtLocalNowValue().slice(0, 10)
}

function timeLocalNowValue() {
  return dtLocalNowValue().slice(11, 16)
}

/** Cities with coordinates for location-by-city (name, lat, lon). */
const CITIES: Array<{ name: string; country: string; lat: number; lon: number }> = [
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.006 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.405 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lon: -3.1883 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194 },
  { name: 'Washington DC', country: 'USA', lat: 38.9072, lon: -77.0369 },
  { name: 'Seattle', country: 'USA', lat: 47.6062, lon: -122.3321 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lon: -123.1207 },
]

/** Human-readable timezone label (Origin.timezone may be a moment-timezone object). */
function formatTimezoneLabel(origin: any): string {
  const tz = origin?.timezone
  if (tz == null || tz === '') return ''
  if (typeof tz === 'string') return tz
  if (typeof tz === 'object') {
    if (typeof tz.name === 'string' && tz.name) return tz.name
    if (tz._z && typeof tz._z.name === 'string' && tz._z.name) return tz._z.name
    if (typeof tz.zoneName === 'string' && tz.zoneName) return tz.zoneName
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

const WHEEL_ASPECTS = {
  conjunction: { degree: 0, orbit: 5, color: 'transparent' },
  sextile: { degree: 60, orbit: 5, color: '#5dade2' },
  square: { degree: 90, orbit: 5, color: '#FF4500' },
  trine: { degree: 120, orbit: 5, color: '#27AE60' },
  opposition: { degree: 180, orbit: 5, color: '#27AE60' },
}

function App() {
  const [dateInput, setDateInput] = useState(dateLocalNowValue())
  const [timeInput, setTimeInput] = useState(timeLocalNowValue())
  const [dateLocal, setDateLocal] = useState(dateLocalNowValue())
  const [timeLocal, setTimeLocal] = useState(timeLocalNowValue())
  const [locationMode, setLocationMode] = useState<'manual' | 'city' | 'geolocation'>('geolocation')
  /** Committed coordinates — used for the chart. */
  const [latDeg, setLatDeg] = useState('51')
  const [latMin, setLatMin] = useState('30')
  const [latSign, setLatSign] = useState<'N' | 'S'>('N')
  const [lonDeg, setLonDeg] = useState('0')
  const [lonMin, setLonMin] = useState('7')
  const [lonSign, setLonSign] = useState<'E' | 'W'>('W')
  /** Draft coordinates — manual entry; applied on Enter / Enter button. */
  const [latDegDraft, setLatDegDraft] = useState('51')
  const [latMinDraft, setLatMinDraft] = useState('30')
  const [latSignDraft, setLatSignDraft] = useState<'N' | 'S'>('N')
  const [lonDegDraft, setLonDegDraft] = useState('0')
  const [lonMinDraft, setLonMinDraft] = useState('7')
  const [lonSignDraft, setLonSignDraft] = useState<'E' | 'W'>('W')
  const [geolocError, setGeolocError] = useState<string | null>(null)
  const [selectedCityIndex, setSelectedCityIndex] = useState<number | null>(null)
  const [showUpdatedFeedback, setShowUpdatedFeedback] = useState(false)

  const applyLatLon = (lat: number, lon: number) => {
    const latDM = decimalToDM(lat, true)
    const lonDM = decimalToDM(lon, false)
    setLatDeg(String(latDM.deg))
    setLatMin(String(latDM.min))
    setLatSign(latDM.sign)
    setLonDeg(String(lonDM.deg))
    setLonMin(String(lonDM.min))
    setLonSign(lonDM.sign)
    setLatDegDraft(String(latDM.deg))
    setLatMinDraft(String(latDM.min))
    setLatSignDraft(latDM.sign)
    setLonDegDraft(String(lonDM.deg))
    setLonMinDraft(String(lonDM.min))
    setLonSignDraft(lonDM.sign)
  }

  const applyLocationDraft = () => {
    setLatDeg(latDegDraft)
    setLatMin(latMinDraft)
    setLatSign(latSignDraft)
    setLonDeg(lonDegDraft)
    setLonMin(lonMinDraft)
    setLonSign(lonSignDraft)
  }


  const handleUseMyLocation = () => {
    setGeolocError(null)
    if (!navigator.geolocation) {
      setGeolocError('Geolocation is not supported by your browser.')
      setLocationMode('city')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLatLon(pos.coords.latitude, pos.coords.longitude)
        setLocationMode('manual')
      },
      (err) => {
        setGeolocError(err.message || 'Could not get location.')
        setLocationMode('city')
      },
      { enableHighAccuracy: true }
    )
  }

  const handleCitySelect = (index: string) => {
    const i = parseInt(index, 10)
    if (Number.isNaN(i) || i < 0 || i >= CITIES.length) return
    const c = CITIES[i]
    setSelectedCityIndex(i)
    applyLatLon(c.lat, c.lon)
  }

  const applyDateTime = () => {
    setDateLocal(dateInput)
    setTimeLocal(timeInput)
  }

  const applyAll = () => {
    applyDateTime()
    applyLocationDraft()
    setShowUpdatedFeedback(true)
  }

  useEffect(() => {
    if (!showUpdatedFeedback) return
    const t = setTimeout(() => setShowUpdatedFeedback(false), 1500)
    return () => clearTimeout(t)
  }, [showUpdatedFeedback])

  const handleApplyKeyDown: KeyboardEventHandler<HTMLInputElement | HTMLSelectElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyAll()
    }
  }

  useEffect(() => {
    if (locationMode === 'geolocation') {
      handleUseMyLocation()
    }
  }, [])

  const parsed = useMemo(() => {
    const dt = new Date(`${dateLocal}T${timeLocal}`)
    const latDec = dmToDecimal(Number(latDeg) || 0, Number(latMin) || 0, latSign)
    const lonDec = dmToDecimal(Number(lonDeg) || 0, Number(lonMin) || 0, lonSign)
    return { dt, lat: latDec, lon: lonDec }
  }, [dateLocal, timeLocal, latDeg, latMin, latSign, lonDeg, lonMin, lonSign])

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
      const cusps = houses.map((h) => h.eclipticDegrees).filter((x) => Number.isFinite(x)) as number[]

      const aspectPoints = { ...astroPlanets }
      const aspectCalc = new AspectCalculator(aspectPoints, { ASPECTS: WHEEL_ASPECTS } as any)
      const astroAspects: any[] = aspectCalc.radix(aspectPoints)
      const seen = new Set<string>()
      const aspectsList = astroAspects
        .map((a) => {
          const precNum = typeof a.precision === 'number' ? a.precision : parseFloat(String(a.precision ?? 0))
          const orbStr = Number.isFinite(precNum) ? formatDegArcMin(precNum) : String(a.precision ?? '')
          return {
            from: a.point?.name ?? '',
            to: a.toPoint?.name ?? '',
            type: a.aspect?.name ?? '',
            orb: orbStr,
          }
        })
        .filter((a) => {
          const key = [a.from, a.to].sort().join('|') + '|' + a.type
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

      const house4 = houses[3]
      const house7 = houses[6]

      const summary: ChartSummary = {
        ascendant: `${asc.Sign?.label ?? asc.Sign?.key ?? ''} ${
          asc.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ?? formatDeg(asc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0)
        }`,
        ascendantSign: asc.Sign?.label ?? asc.Sign?.key ?? '',
        ascendantDeg: asc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0,
        midheaven: `${mc.Sign?.label ?? mc.Sign?.key ?? ''} ${
          mc.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ?? formatDeg(mc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0)
        }`,
        midheavenSign: mc.Sign?.label ?? mc.Sign?.key ?? '',
        midheavenDeg: mc.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0,
        descendantSign: house7?.sign ?? '',
        descendantDeg: house7?.eclipticDegrees ?? 0,
        imumCoeliSign: house4?.sign ?? '',
        imumCoeliDeg: house4?.eclipticDegrees ?? 0,
        houses,
        planets,
        time: {
          timezone: formatTimezoneLabel(origin),
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
      <h1 style={{ marginBottom: 8 }}>Horary Calculator</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        In-browser chart math via <code>circular-natal-horoscope-js</code>. House system: <b>Regiomontanus</b>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Date (local)
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={handleApplyKeyDown}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Time (local)
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={handleApplyKeyDown}
              style={{ width: '100%' }}
            />
          </label>
        </div>
        <div>
          <label>
            Location
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                value={locationMode}
                onChange={(e) => {
                  const m = e.target.value as 'manual' | 'city' | 'geolocation'
                  setLocationMode(m)
                  if (m === 'manual') {
                    setLatDegDraft(latDeg)
                    setLatMinDraft(latMin)
                    setLatSignDraft(latSign)
                    setLonDegDraft(lonDeg)
                    setLonMinDraft(lonMin)
                    setLonSignDraft(lonSign)
                  }
                }}
                style={{ width: '100%' }}
              >
                <option value="geolocation">Use my location</option>
                <option value="city">Nearest city</option>
                <option value="manual">Enter coordinates (° and ′)</option>
              </select>
              {locationMode === 'manual' && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Latitude (degrees °, minutes ′)</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={latDegDraft}
                      onChange={(e) => setLatDegDraft(e.target.value)}
                      onKeyDown={handleApplyKeyDown}
                      placeholder="°"
                      style={{ width: 56 }}
                      title="Degrees"
                    />
                    <span>°</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={latMinDraft}
                      onChange={(e) => setLatMinDraft(e.target.value)}
                      onKeyDown={handleApplyKeyDown}
                      placeholder="′"
                      style={{ width: 56 }}
                      title="Minutes"
                    />
                    <span>′</span>
                    <select
                      value={latSignDraft}
                      onChange={(e) => setLatSignDraft(e.target.value as 'N' | 'S')}
                      onKeyDown={handleApplyKeyDown}
                      style={{ marginLeft: 4 }}
                    >
                      <option value="N">N</option>
                      <option value="S">S</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Longitude (degrees °, minutes ′)</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={lonDegDraft}
                      onChange={(e) => setLonDegDraft(e.target.value)}
                      onKeyDown={handleApplyKeyDown}
                      placeholder="°"
                      style={{ width: 56 }}
                      title="Degrees"
                    />
                    <span>°</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={lonMinDraft}
                      onChange={(e) => setLonMinDraft(e.target.value)}
                      onKeyDown={handleApplyKeyDown}
                      placeholder="′"
                      style={{ width: 56 }}
                      title="Minutes"
                    />
                    <span>′</span>
                    <select
                      value={lonSignDraft}
                      onChange={(e) => setLonSignDraft(e.target.value as 'E' | 'W')}
                      onKeyDown={handleApplyKeyDown}
                      style={{ marginLeft: 4 }}
                    >
                      <option value="E">E</option>
                      <option value="W">W</option>
                    </select>
                  </div>
                </>
              )}
              {locationMode === 'city' && (
                <select
                  value={selectedCityIndex !== null ? String(selectedCityIndex) : ''}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="" disabled>Select a city</option>
                  {CITIES.map((c, i) => (
                    <option key={i} value={i}>
                      {c.name}, {c.country}
                    </option>
                  ))}
                </select>
              )}
              {locationMode === 'geolocation' && (
                <div>
                  <button type="button" onClick={handleUseMyLocation} style={{ padding: '6px 12px' }}>
                    Use my location
                  </button>
                  {geolocError && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#e88' }}>{geolocError}</div>
                  )}
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button
          type="button"
          onClick={applyAll}
          style={{ padding: '8px 16px' }}
        >
          Enter
        </button>
        {showUpdatedFeedback && (
          <span style={{ fontSize: 14, opacity: 0.9 }}>Chart updated</span>
        )}
      </div>

      {chart.summary ? (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Chart wheel</h2>
          <ChartWheel data={chart.summary.astroChartData} />
        </div>
      ) : null}

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
                {chart.summary.time.timezone ? (
                  <>
                    <b>Timezone:</b> {chart.summary.time.timezone} <br />
                  </>
                ) : null}
                <b>Local:</b> {chart.summary.time.local || '(unknown)'} <br />
                <b>UTC:</b> {chart.summary.time.utc || '(unknown)'}
              </div>
              <div>
                <b>ASC:</b> {chart.summary.ascendantSign} {formatDeg(degreesWithinSign(chart.summary.ascendantDeg))}
              </div>
              <div>
                <b>MC:</b> {chart.summary.midheavenSign} {formatDeg(degreesWithinSign(chart.summary.midheavenDeg))}
              </div>
              <div>
                <b>DSC:</b> {chart.summary.descendantSign} {formatDeg(degreesWithinSign(chart.summary.descendantDeg))}
              </div>
              <div>
                <b>IC:</b> {chart.summary.imumCoeliSign} {formatDeg(degreesWithinSign(chart.summary.imumCoeliDeg))}
              </div>

              <h2>Houses</h2>
              <ol style={{ marginTop: 8 }}>
                {chart.summary.houses.map((h) => (
                  <li key={h.house}>
                    <b>House {h.house}:</b> {h.sign} {formatDeg(degreesWithinSign(h.eclipticDegrees))}
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
              <h2 style={{ marginTop: 0 }}>Planets</h2>
              <ul style={{ marginTop: 8 }}>
                {chart.summary.planets.map((p) => (
                  <li key={p.key}>
                    <b>{p.name}:</b> {p.sign} {formatDeg(degreesWithinSign(p.eclipticDegrees))}
                  </li>
                ))}
              </ul>

              <h2 style={{ marginTop: 16 }}>Aspects</h2>
              <ul style={{ marginTop: 8 }}>
                {chart.summary.aspectsList.length === 0 && <li>No aspects found with default orbs.</li>}
                {chart.summary.aspectsList.map((a, idx) => (
                  <li key={`${a.from}-${a.to}-${idx}`}>
                    <b>{a.from}</b> {a.type} <b>{a.to}</b> ({a.orb} from perfect)
                  </li>
                ))}
              </ul>
              <p style={{ opacity: 0.75 }}>
                The chart wheel above shows the same planet–planet aspects from the chart center.
              </p>
            </div>
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
      const chart = new AstroChart(containerId, 520, 520, {
        SYMBOL_SCALE: 0.6,
        // Labels next to planets (degrees/minutes); separate from glyph size (SYMBOL_SCALE).
        POINTS_TEXT_SIZE: 11,
        SYMBOL_AXIS_STROKE: 2.2,
        SHOW_DIGNITIES_TEXT: false,
        ASPECTS: WHEEL_ASPECTS,
      })
      const radix = chart.radix({ planets: data.planets, cusps: data.cusps })
      // Draw only the precomputed planet–planet aspects (no MC/IC)
      radix.aspects(data.aspects)
      // Replace default whole-degree wheel labels with degree+arc-minute labels.
      const paperId = `${containerId}-astrology`
      const planetsLayer = document.getElementById(`${paperId}-radix-planets`)
      if (planetsLayer) {
        const symbols = planetsLayer.querySelectorAll<SVGElement>(`[id^="${paperId}-radix-planets-"]`)
        symbols.forEach((symbolEl) => {
          const name = symbolEl.id.replace(`${paperId}-radix-planets-`, '')
          const eclipticDeg = data.planets[name]?.[0]
          if (!Number.isFinite(eclipticDeg)) return
          let next: Element | null = symbolEl.nextElementSibling
          while (next && next.tagName.toLowerCase() !== 'text') {
            next = next.nextElementSibling
          }
          if (next && next.tagName.toLowerCase() === 'text') {
            next.textContent = formatDegArcMinCompact(degreesWithinSign(eclipticDeg))
            // Move label from above symbol to below
            const y = parseFloat(next.getAttribute('y') ?? '0')
            next.setAttribute('y', String(y + 18))
          }
        })
      }
    } catch (e) {
      if (el) el.textContent = e instanceof Error ? e.message : 'Failed to render chart.'
    }
  }, [data])

  return <div id={containerId} />
}

export default App
