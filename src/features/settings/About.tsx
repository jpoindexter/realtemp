interface AboutProps {
  onBack: () => void
}

/** Help/documentation, deliberately separate from Settings — configuration and explanation are different jobs. */
export function About({ onBack }: AboutProps) {
  return (
    <main className="app stack">
      <div className="loc-bar">
        <button type="button" onClick={onBack}>&larr; back</button>
        <span>how this works</span>
      </div>

      <section className="settings-block">
        <p className="note">
          Weather stations measure air in a shaded box. Your body isn&rsquo;t in a box. RealTemp starts from the
          station number and adds what the street adds:
        </p>
        <ul className="how-list">
          <li><b>humidity friction</b> — moist air blocks sweat from cooling you (we use dew point, the honest measure)</li>
          <li><b>wind</b> — carries heat away; below 10&deg; it becomes wind chill</li>
          <li><b>sun premium</b> — direct sun by UV strength and how high the sun sits; zero in shade or at night</li>
          <li><b>surroundings</b> — concrete re-radiates heat into the evening; greenery cools</li>
          <li><b>activity</b> — moving bodies make their own heat</li>
          <li><b>acclimatization &amp; body</b> — optional: how adapted you are, your build, your clothes</li>
        </ul>
        <p className="note">
          The ledger always adds up — every degree is accounted for. Sweat efficiency shows how well sweating even
          works right now. Safe windows apply the same math to the next 24 hours. The shade map draws real building
          shadows for this minute&rsquo;s sun.
        </p>
      </section>

      <section className="settings-block">
        <h2 className="settings-label">About</h2>
        <p className="note">
          RealTemp v0.1 &middot; every coefficient in the formula is a named constant, not a black box. Weather by
          Open-Meteo &middot; buildings by OpenStreetMap.
        </p>
      </section>
    </main>
  )
}
