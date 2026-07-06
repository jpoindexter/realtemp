interface SegmentedControlProps<T extends string> {
  legend: string
  name: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** Radiogroup styled as an ink segmented control — real radios, 44px targets. */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="seg">
      <legend>{legend}</legend>
      <div className="seg-options">
        {options.map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
