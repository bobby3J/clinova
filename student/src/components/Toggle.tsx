type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export default function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-500" : "bg-gray-200"
        }`}
      >
        <span
          // Explicit left-[..] for both states, not translate-x from an
          // undeclared static position — a <span> absolutely positioned
          // with no `left` set falls back to the browser's computed
          // static-position algorithm, which isn't guaranteed to be 0 the
          // way translate-x math here assumed, and let the knob render
          // outside the track's own rounded bounds. Setting `left`
          // directly is unambiguous: track is 44px (w-11), knob is 20px
          // (h-5 w-5), so left-0.5 (2px) / left-[22px] are the two
          // positions with a matching 2px inset on whichever side.
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
