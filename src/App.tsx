import { useMemo, useState } from 'react'
import { calculateChart, dmsToDecimal, dtLocalNowValue, formatDeg } from './chartCalc'
import { ChartWheel } from './ChartWheel'
import './App.css'

function decimalToDMS(decimal: number): { deg: string; min: string; sec: string } {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = Math.round((minFloat - min) * 60)
  return { deg: String(deg), min: String(min), sec: String(sec) }
}

function App() {
  const now = dtLocalNowValue()
  const [dateLocal, setDateLocal] = useState(now.slice(0, 10))
  const [timeHour, setTimeHour] = useState(now.slice(11, 13)) // stored as 0-23
  const [timeMinute, setTimeMinute] = useState(now.slice(14, 16))
  const [use24Hour, setUse24Hour] = useState(false)
  const [amPm, setAmPm] = useState<'AM' | 'PM'>(Number(now.slice(11, 13)) < 12 ? 'AM' : 'PM')

  const display12Hour = (() => {
    const h = Number(timeHour) || 0
    if (h === 0 || h === 12) return '12'
    return String(h > 12 ? h - 12 : h)
  })()

  function handleHour12Change(val: string) {
    const h = Number(val) || 0
    setTimeHour(amPm === 'AM' ? String(h === 12 ? 0 : h) : String(h === 12 ? 12 : h + 12))
  }

  function handleAmPmChange(val: 'AM' | 'PM') {
    setAmPm(val)
    const h = Number(timeHour) || 0
    if (val === 'AM' && h >= 12) setTimeHour(String(h - 12))
    if (val === 'PM' && h < 12) setTimeHour(String(h + 12))
  }

  const [locationName, setLocationName] = useState('')
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationTimezone, setLocationTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  const [latDeg, setLatDeg] = useState('51')
  const [latMin, setLatMin] = useState('30')
  const [latSec, setLatSec] = useState('27')
  const [latSign, setLatSign] = useState<'N' | 'S'>('N')
  const [lonDeg, setLonDeg] = useState('0')
  const [lonMin, setLonMin] = useState('7')
  const [lonSec, setLonSec] = useState('40')
  const [lonSign, setLonSign] = useState<'E' | 'W'>('W')
  const [question, setQuestion] = useState('')

  async function searchLocation() {
    if (!locationName.trim()) return
    setLocationSearching(true)
    setLocationError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      if (!data.length) { setLocationError('Location not found.'); return }
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      const ld = decimalToDMS(lat)
      const lo = decimalToDMS(lon)
      setLatDeg(ld.deg); setLatMin(ld.min); setLatSec(ld.sec)
      setLatSign(lat >= 0 ? 'N' : 'S')
      setLonDeg(lo.deg); setLonMin(lo.min); setLonSec(lo.sec)
      setLonSign(lon >= 0 ? 'E' : 'W')
      try {
        const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`)
        const tzData = await tzRes.json()
        if (tzData.timeZone) setLocationTimezone(tzData.timeZone)
      } catch { /* timezone lookup failed, keep existing */ }
    } catch {
      setLocationError('Search failed. Check your connection.')
    } finally {
      setLocationSearching(false)
    }
  }

  const parsed = useMemo(() => {
    const h = String(Number(timeHour) || 0).padStart(2, '0')
    const m = String(Number(timeMinute) || 0).padStart(2, '0')
    const dt = new Date(`${dateLocal}T${h}:${m}`)
    const latDec = dmsToDecimal(Number(latDeg) || 0, Number(latMin) || 0, Number(latSec) || 0, latSign)
    const lonDec = dmsToDecimal(Number(lonDeg) || 0, Number(lonMin) || 0, Number(lonSec) || 0, lonSign)
    return { dt, lat: latDec, lon: lonDec }
  }, [dateLocal, timeHour, timeMinute, latDeg, latMin, latSec, latSign, lonDeg, lonMin, lonSec, lonSign])

  const chart = useMemo(() => calculateChart(parsed.dt, parsed.lat, parsed.lon), [parsed])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, textAlign: 'left' }}>
      <h1 style={{ marginBottom: 8 }}>Horary Calculator</h1>
      <label style={{ display: 'block', marginBottom: 16 }}>
        Question
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is your question?"
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
        />
      </label>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        In-browser chart math via <code>circular-natal-horoscope-js</code>. House system: <b>Regiomontanus</b>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        <label>
          Date
          <input
            type="date"
            value={dateLocal}
            onChange={(e) => setDateLocal(e.target.value)}
            style={{ display: 'block', width: 'fit-content', marginTop: 4 }}
          />
        </label>
        <label>
          Time
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {use24Hour ? (
              <>
                <input type="number" min={0} max={23} value={timeHour} onChange={(e) => setTimeHour(e.target.value)} style={{ width: 56 }} title="Hour" />
                <span>h</span>
              </>
            ) : (
              <>
                <input type="number" min={1} max={12} value={display12Hour} onChange={(e) => handleHour12Change(e.target.value)} style={{ width: 56 }} title="Hour" />
                <select value={amPm} onChange={(e) => handleAmPmChange(e.target.value as 'AM' | 'PM')}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </>
            )}
            <input type="number" min={0} max={59} value={timeMinute} onChange={(e) => setTimeMinute(e.target.value)} style={{ width: 56 }} title="Minute" />
            <span>m</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: '0.9em' }}>
              <input type="checkbox" checked={use24Hour} onChange={(e) => setUse24Hour(e.target.checked)} />
              24h
            </label>
          </div>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Location
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
              placeholder="Search for a city or place"
              style={{ flex: 1 }}
            />
            <button onClick={searchLocation} disabled={locationSearching}>
              {locationSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {locationError && <div style={{ color: '#c55', marginTop: 4 }}>{locationError}</div>}
        </label>
        <div style={{ marginTop: 6, opacity: 0.7, fontSize: '0.9em' }}>Timezone: {locationTimezone}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          Latitude (degrees °, minutes ′, seconds ″)
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <input type="number" min={0} max={90} value={latDeg} onChange={(e) => setLatDeg(e.target.value)} style={{ width: 56 }} title="Degrees" />
            <span>°</span>
            <input type="number" min={0} max={59} value={latMin} onChange={(e) => setLatMin(e.target.value)} style={{ width: 56 }} title="Minutes" />
            <span>′</span>
            <input type="number" min={0} max={59} value={latSec} onChange={(e) => setLatSec(e.target.value)} style={{ width: 56 }} title="Seconds" />
            <span>″</span>
            <select value={latSign} onChange={(e) => setLatSign(e.target.value as 'N' | 'S')} style={{ marginLeft: 4 }}>
              <option value="N">N</option>
              <option value="S">S</option>
            </select>
          </div>
        </label>
        <label>
          Longitude (degrees °, minutes ′, seconds ″)
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <input type="number" min={0} max={180} value={lonDeg} onChange={(e) => setLonDeg(e.target.value)} style={{ width: 56 }} title="Degrees" />
            <span>°</span>
            <input type="number" min={0} max={59} value={lonMin} onChange={(e) => setLonMin(e.target.value)} style={{ width: 56 }} title="Minutes" />
            <span>′</span>
            <input type="number" min={0} max={59} value={lonSec} onChange={(e) => setLonSec(e.target.value)} style={{ width: 56 }} title="Seconds" />
            <span>″</span>
            <select value={lonSign} onChange={(e) => setLonSign(e.target.value as 'E' | 'W')} style={{ marginLeft: 4 }}>
              <option value="E">E</option>
              <option value="W">W</option>
            </select>
          </div>
        </label>
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
              <ul style={{ marginTop: 8 }}>
                <li><b>ASC:</b> {chart.summary.ascendant}</li>
                <li><b>DSC:</b> {chart.summary.descendant}</li>
                <li><b>MC:</b> {chart.summary.midheaven}</li>
                <li><b>IC:</b> {chart.summary.ic}</li>
              </ul>

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

              <h2 style={{ marginTop: 16 }}>Aspects</h2>
              <ul style={{ marginTop: 8 }}>
                {chart.summary.aspectsList.length === 0 && <li>No aspects found with default orbs.</li>}
                {chart.summary.aspectsList.map((a, idx) => (
                  <li key={`${a.from}-${a.to}-${idx}`}>
                    <b>{a.from}</b> {a.type} <b>{a.to}</b> {a.orb}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default App
