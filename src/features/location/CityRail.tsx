import type { LocationState } from './locations'

interface CityRailProps {
  state: LocationState
  onSelect: (index: number) => void
  onAdd: () => void
}

/**
 * Saved cities as a one-tap rail. Hidden entirely on a single city — a switcher
 * with nothing to switch to is just chrome on a screen with no room for it.
 */
export function CityRail({ state, onSelect, onAdd }: CityRailProps) {
  if (state.items.length < 2) return null

  return (
    <div className="city-rail" role="tablist" aria-label="Saved cities">
      {state.items.map((city, i) => (
        <button
          key={`${city.latitude},${city.longitude}`}
          type="button"
          role="tab"
          aria-selected={i === state.activeIndex}
          onClick={() => onSelect(i)}
        >
          {city.label}
        </button>
      ))}
      <button type="button" className="city-add" onClick={onAdd} aria-label="Add a city">
        +
      </button>
    </div>
  )
}
