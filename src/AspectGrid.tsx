const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
  quincunx: '⚻',
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#aaa',
  opposition: '#c55',
  square: '#c55',
  trine: '#55c',
  sextile: '#5a5',
  quincunx: '#c85',
}

type Aspect = { from: string; to: string; type: string; orb: string; applying: boolean | null }

export function AspectGrid({ planets, aspects }: { planets: string[]; aspects: Aspect[] }) {
  const aspectMap = new Map<string, Aspect>()
  for (const a of aspects) {
    aspectMap.set(`${a.from}|${a.to}`, a)
    aspectMap.set(`${a.to}|${a.from}`, a)
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.85em' }}>
        <thead>
          <tr>
            <th />
            {planets.slice(0, -1).map(p => (
              <th key={p} style={{ padding: '4px 6px', opacity: 0.7, fontWeight: 'normal' }}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planets.slice(1).map((row, rowIdx) => (
            <tr key={row}>
              <td style={{ padding: '4px 6px', opacity: 0.7 }}>{row}</td>
              {planets.slice(0, rowIdx + 1).map(col => {
                const asp = aspectMap.get(`${row}|${col}`)
                return (
                  <td key={col} style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', minWidth: 32 }}>
                    {asp ? (
                      <span
                        title={`${asp.type} ${asp.orb} — ${asp.applying == null ? '' : asp.applying ? 'applying' : 'separating'}`}
                        style={{ color: ASPECT_COLORS[asp.type] ?? '#aaa', fontSize: '1.1em', cursor: 'default' }}
                      >
                        {ASPECT_SYMBOLS[asp.type] ?? asp.type.slice(0, 3)}
                      </span>
                    ) : null}
                  </td>
                )
              })}
              {planets.slice(rowIdx + 1, -1).map(col => (
                <td key={col} style={{ padding: '4px 6px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 32 }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
