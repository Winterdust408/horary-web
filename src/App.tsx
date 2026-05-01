import { useMemo, useState } from 'react'
import { calculateChart, dmsToDecimal, dtLocalNowValue, formatDeg } from './chartCalc'
import { ChartWheel } from './ChartWheel'
import './App.css'

function App() {
  const [dateTimeLocal, setDateTimeLocal] = useState(dtLocalNowValue())
  // Latitude: degrees, minutes, seconds, N/S
  const [latDeg, setLatDeg] = useState('51')
  const [latMin, setLatMin] = useState('30')
  const [latSec, setLatSec] = useState('27')
  const [latSign, setLatSign] = useState<'N' | 'S'>('N')
  // Longitude: degrees, minutes, seconds, E/W
  const [lonDeg, setLonDeg] = useState('0')
  const [lonMin, setLonMin] = useState('7')
  const [lonSec, setLonSec] = useState('40')
  const [lonSign, setLonSign] = useState<'E' | 'W'>('W')
  const [question, setQuestion] = useState('')

  const parsed = useMemo(() => {
    const dt = new Date(dateTimeLocal)
    const latDec = dmsToDecimal(
      Number(latDeg) || 0,
      Number(latMin) || 0,
      Number(latSec) || 0,
      latSign,
    )
    const lonDec = dmsToDecimal(
      Number(lonDeg) || 0,
      Number(lonMin) || 0,
      Number(lonSec) || 0,
      lonSign,
    )
    return { dt, lat: latDec, lon: lonDec }
  }, [dateTimeLocal, latDeg, latMin, latSec, latSign, lonDeg, lonMin, lonSec, lonSign])

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
            Latitude (degrees °, minutes ′, seconds ″)
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={0}
                max={90}
                value={latDeg}
                onChange={(e) => setLatDeg(e.target.value)}
                placeholder="°"
                style={{ width: 56 }}
                title="Degrees"
              />
              <span>°</span>
              <input
                type="number"
                min={0}
                max={59}
                value={latMin}
                onChange={(e) => setLatMin(e.target.value)}
                placeholder="′"
                style={{ width: 56 }}
                title="Minutes"
              />
              <span>′</span>
              <input
                type="number"
                min={0}
                max={59}
                value={latSec}
                onChange={(e) => setLatSec(e.target.value)}
                placeholder="″"
                style={{ width: 56 }}
                title="Seconds"
              />
              <span>″</span>
              <select
                value={latSign}
                onChange={(e) => setLatSign(e.target.value as 'N' | 'S')}
                style={{ marginLeft: 4 }}
              >
                <option value="N">N</option>
                <option value="S">S</option>
              </select>
            </div>
          </label>
          <label>
            Longitude (degrees °, minutes ′, seconds ″)
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={0}
                max={180}
                value={lonDeg}
                onChange={(e) => setLonDeg(e.target.value)}
                placeholder="°"
                style={{ width: 56 }}
                title="Degrees"
              />
              <span>°</span>
              <input
                type="number"
                min={0}
                max={59}
                value={lonMin}
                onChange={(e) => setLonMin(e.target.value)}
                placeholder="′"
                style={{ width: 56 }}
                title="Minutes"
              />
              <span>′</span>
              <input
                type="number"
                min={0}
                max={59}
                value={lonSec}
                onChange={(e) => setLonSec(e.target.value)}
                placeholder="″"
                style={{ width: 56 }}
                title="Seconds"
              />
              <span>″</span>
              <select
                value={lonSign}
                onChange={(e) => setLonSign(e.target.value as 'E' | 'W')}
                style={{ marginLeft: 4 }}
              >
                <option value="E">E</option>
                <option value="W">W</option>
              </select>
            </div>
          </label>
        </div>
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
                <b>Date:</b> {parsed.dt.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })} <br />
                <b>Time:</b> {parsed.dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <br />
                <b>Timezone:</b> {chart.summary.time.timezone || '(unknown)'}
              </div>
              <div>
                <b>ASC:</b> {chart.summary.ascendant}
              </div>
              <div>
                <b>DSC:</b> {chart.summary.descendant}
              </div>
              <div>
                <b>MC:</b> {chart.summary.midheaven}
              </div>
              <div>
                <b>IC:</b> {chart.summary.ic}
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
