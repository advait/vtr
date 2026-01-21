# Web UI Icons (Lucide)

- Use `lucide-react` for all UI icons; avoid ad-hoc symbols.
- Default size: `h-4 w-4` (16px). Dense controls can use `h-3 w-3`.
- Default stroke width: keep Lucide defaults unless a control needs emphasis.
- Color: inherit via `text-tn-text-dim` for neutral icons, `text-tn-text` for primary.
- Accessibility: buttons must include an `aria-label`; icons should be `aria-hidden`.
