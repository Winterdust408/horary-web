import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateChart, dmsToDecimal, dtLocalNowValue, formatDeg } from './chartCalc'
import { ChartWheel } from './ChartWheel'
import { AspectGrid } from './AspectGrid'
import './App.css'

function decimalToDMS(decimal: number): { deg: string; min: string; sec: string } {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = Math.round((minFloat - min) * 60)
  return { deg: String(deg), min: String(min), sec: String(sec) }
}

function fmtDMS(deg: string, min: string, sec: string, sign: string) {
  return `${deg}° ${min}′ ${sec}″ ${sign}`
}

function App() {
  const now = dtLocalNowValue()
  const [dateLocal, setDateLocal] = useState(now.slice(0, 10))
  const [timeHour, setTimeHour] = useState(now.slice(11, 13))
  const [timeMinute, setTimeMinute] = useState(now.slice(14, 16))
  const [use24Hour, setUse24Hour] = useState(false)
  const [amPm, setAmPm] = useState<'AM' | 'PM'>(Number(now.slice(11, 13)) < 12 ? 'AM' : 'PM')

  const [isEditing, setIsEditing] = useState(false)
  const [geolocating, setGeolocating] = useState(true)
  const [locationDetected, setLocationDetected] = useState(false)
  const detectedLocation = useRef<{ latDeg: string; latMin: string; latSec: string; latSign: 'N' | 'S'; lonDeg: string; lonMin: string; lonSec: string; lonSign: 'E' | 'W'; timezone: string } | null>(null)

  const [locationName, setLocationName] = useState('')
  const [detectedCityName, setDetectedCityName] = useState('')
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationTimezone, setLocationTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  const [latDeg, setLatDeg] = useState('')
  const [latMin, setLatMin] = useState('')
  const [latSec, setLatSec] = useState('')
  const [latSign, setLatSign] = useState<'N' | 'S'>('N')
  const [lonDeg, setLonDeg] = useState('')
  const [lonMin, setLonMin] = useState('')
  const [lonSec, setLonSec] = useState('')
  const [lonSign, setLonSign] = useState<'E' | 'W'>('W')
  const [question, setQuestion] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showAngles, setShowAngles] = useState(true)
  const [showHouses, setShowHouses] = useState(true)
  const [showPlanets, setShowPlanets] = useState(true)
  const [showAspects, setShowAspects] = useState(true)
  const [showAspectGrid, setShowAspectGrid] = useState(true)
  const [locationInputMode, setLocationInputMode] = useState<'search' | 'coordinates'>('search')
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showSettings) return
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  useEffect(() => {
    if (!navigator.geolocation) { setGeolocating(false); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const ld = decimalToDMS(lat)
        const lo = decimalToDMS(lon)
        setLatDeg(ld.deg); setLatMin(ld.min); setLatSec(ld.sec)
        setLatSign(lat >= 0 ? 'N' : 'S')
        setLonDeg(lo.deg); setLonMin(lo.min); setLonSec(lo.sec)
        setLonSign(lon >= 0 ? 'E' : 'W')
        let tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        try {
          const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`)
          const tzData = await tzRes.json()
          if (tzData.timeZone) tz = tzData.timeZone
        } catch { /* keep browser timezone */ }
        setLocationTimezone(tz)
        detectedLocation.current = {
          latDeg: ld.deg, latMin: ld.min, latSec: ld.sec, latSign: lat >= 0 ? 'N' : 'S',
          lonDeg: lo.deg, lonMin: lo.min, lonSec: lo.sec, lonSign: lon >= 0 ? 'E' : 'W',
          timezone: tz,
        }
        try {
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const revData = await revRes.json()
          const addr = revData.address ?? {}
          const city = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.county ?? ''
          const country = addr.country ?? ''
          setDetectedCityName([city, country].filter(Boolean).join(', '))
        } catch { /* city name lookup failed */ }
        setLocationDetected(true)
        setGeolocating(false)
      },
      () => { setGeolocating(false); setLocationDetected(false) },
      { timeout: 10000 }
    )
  }, [])

  function resetToNow() {
    const n = dtLocalNowValue()
    setDateLocal(n.slice(0, 10))
    setTimeHour(n.slice(11, 13))
    setTimeMinute(n.slice(14, 16))
    setAmPm(Number(n.slice(11, 13)) < 12 ? 'AM' : 'PM')
    if (detectedLocation.current) {
      const d = detectedLocation.current
      setLatDeg(d.latDeg); setLatMin(d.latMin); setLatSec(d.latSec); setLatSign(d.latSign)
      setLonDeg(d.lonDeg); setLonMin(d.lonMin); setLonSec(d.lonSec); setLonSign(d.lonSign)
      setLocationTimezone(d.timezone)
    }
    setIsEditing(false)
  }

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
      } catch { /* keep existing timezone */ }
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

  const locationFields = (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '0.9em' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="radio" name="locationInputMode" value="search" checked={locationInputMode === 'search'} onChange={() => setLocationInputMode('search')} />
          Search by city
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="radio" name="locationInputMode" value="coordinates" checked={locationInputMode === 'coordinates'} onChange={() => setLocationInputMode('coordinates')} />
          Enter coordinates
        </label>
      </div>

      {locationInputMode === 'search' ? (
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
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Latitude (°, ′, ″)
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
              Longitude (°, ′, ″)
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
          <div style={{ marginTop: 6, opacity: 0.7, fontSize: '0.9em' }}>Timezone: {locationTimezone}</div>
        </div>
      )}
    </>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', position: 'relative', zIndex: 200 }}>
        <h1 style={{ marginBottom: 4 }}>Horary Calculator</h1>
        <div style={{ position: 'relative' }} ref={settingsRef}>
          <button onClick={() => setShowSettings(s => !s)} style={{ fontSize: '1.2em', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }} title="Settings">⚙</button>
          {showSettings && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#ffffff', color: '#000000', border: '1px solid #ccc', borderRadius: 8, padding: 12, minWidth: 220, zIndex: 9999 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={use24Hour} onChange={(e) => setUse24Hour(e.target.checked)} />
                Use 24-hour time
              </label>
              <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '8px 0' }} />
              {[['showAngles', 'Show angles', showAngles, setShowAngles], ['showHouses', 'Show houses', showHouses, setShowHouses], ['showPlanets', 'Show planets', showPlanets, setShowPlanets], ['showAspects', 'Show aspects list', showAspects, setShowAspects], ['showAspectGrid', 'Show aspects chart', showAspectGrid, setShowAspectGrid]].map(([key, label, value, setter]) => (
                <label key={key as string} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', marginBottom: 4 }}>
                  <input type="checkbox" checked={value as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} />
                  {label as string}
                </label>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '8px 0' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={isEditing} onChange={(e) => { setIsEditing(e.target.checked); if (!e.target.checked) resetToNow() }} />
                I'm looking up a past question
              </label>
            </div>
          )}
        </div>
      </div>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.6, fontSize: '0.9em' }}>House system: Regiomontanus</p>

      {!isEditing && (
        <div style={{ marginBottom: 16, opacity: 0.85 }}>
          <div><b>Date:</b> {parsed.dt.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div><b>Time:</b> {parsed.dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24Hour })}</div>
          <div><b>Timezone:</b> {locationTimezone}</div>
          {geolocating && <div style={{ opacity: 0.6, marginTop: 4 }}>Detecting location…</div>}
          {!geolocating && locationDetected && (
            <div><b>Location:</b> {detectedCityName || `${fmtDMS(latDeg, latMin, latSec, latSign)}, ${fmtDMS(lonDeg, lonMin, lonSec, lonSign)}`}</div>
          )}
          {!geolocating && !locationDetected && locationFields}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: 16 }}>
        Question
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
          placeholder="What is your question?"
          rows={1}
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', fontSize: 'inherit' }}
        />
      </label>

      {isEditing && (
        <div style={{ marginBottom: 16 }}>
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
                    <input type="number" min={0} max={23} value={timeHour} onChange={(e) => setTimeHour(e.target.value)} style={{ width: '4ch' }} title="Hour" />
                    <span>:</span>
                    <input type="number" min={0} max={59} value={timeMinute} onChange={(e) => setTimeMinute(e.target.value)} style={{ width: '4ch' }} title="Minute" />
                  </>
                ) : (
                  <>
                    <input type="number" min={1} max={12} value={display12Hour} onChange={(e) => handleHour12Change(e.target.value)} style={{ width: '4ch' }} title="Hour" />
                    <span>:</span>
                    <input type="number" min={0} max={59} value={timeMinute} onChange={(e) => setTimeMinute(e.target.value)} style={{ width: '4ch' }} title="Minute" />
                    <select value={amPm} onChange={(e) => handleAmPmChange(e.target.value as 'AM' | 'PM')}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </>
                )}
              </div>
            </label>
          </div>
          {locationFields}
          <button style={{ marginTop: 12 }} onClick={resetToNow}>
            Use current time &amp; place
          </button>
        </div>
      )}

      {chart.summary ? (
        <>
          <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
            <h2 style={{ marginTop: 0 }}>Chart wheel</h2>
            <ChartWheel data={chart.summary.astroChartData} />
          </div>
        </>
      ) : null}

      <div style={{ marginTop: 16 }}>
        {chart.error ? (
          <div style={{ padding: 12, border: '1px solid #c33', borderRadius: 8 }}>
            <b>Error:</b> {chart.error}
          </div>
        ) : chart.summary ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {(showAngles || showHouses) && (
              <div style={{ padding: '12px 6px 12px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, minWidth: 0 }}>
                {showAngles && (
                  <>
                    <h2 style={{ marginTop: 0 }}>Angles</h2>
                    <ul style={{ marginTop: 8 }}>
                      <li><b>ASC:</b> {chart.summary.ascendant}</li>
                      <li><b>DSC:</b> {chart.summary.descendant}</li>
                      <li><b>MC:</b> {chart.summary.midheaven}</li>
                      <li><b>IC:</b> {chart.summary.ic}</li>
                    </ul>
                  </>
                )}
                {showHouses && (
                  <>
                    <h2 style={{ marginTop: showAngles ? 16 : 0 }}>Houses</h2>
                    <ol style={{ marginTop: 8 }}>
                      {chart.summary.houses.map((h) => (
                        <li key={h.house}>
                          <b>House {h.house}:</b> {h.sign} {h.formatted || formatDeg(h.eclipticDegrees)}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}

            {(showPlanets || showAspects) && (
              <div style={{ padding: '12px 12px 12px 6px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, minWidth: 0 }}>
                {showPlanets && (
                  <>
                    <h2 style={{ marginTop: 0 }}>Planets</h2>
                    <ul style={{ marginTop: 8 }}>
                      {chart.summary.planets.map((p) => (
                        <li key={p.key}>
                          <b>{p.name}:</b> {p.sign} {p.formatted || formatDeg(p.eclipticDegrees)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {showAspects && (
                  <>
                    <h2 style={{ marginTop: showPlanets ? 16 : 0 }}>Aspects</h2>
                    <ul style={{ marginTop: 8 }}>
                      {chart.summary.aspectsList.length === 0 && <li>No aspects found with default orbs.</li>}
                      {chart.summary.aspectsList.map((a, idx) => (
                        <li key={`${a.from}-${a.to}-${idx}`}>
                          <b>{a.from}</b> {a.type} <b>{a.to}</b> {a.orb}{a.applying != null ? ` — ${a.applying ? 'applying' : 'separating'}` : ''}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
          {showAspectGrid && (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, overflow: 'hidden' }}>
              <h2 style={{ marginTop: 0 }}>Aspects chart</h2>
              <AspectGrid
                planets={chart.summary.planets.map(p => p.name)}
                aspects={chart.summary.aspectsList}
              />
            </div>
          )}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default App
