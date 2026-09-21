const defaultTagline = 'Revealing Christ • Equipping His Family • Discipling the Nations';

export function BrandTagline({text, className = ''}: {text?: string; className?: string}) {
  const parts = (text?.trim() || defaultTagline).replace(/\.$/, '').split(/[•·]/).map(part => part.trim()).filter(Boolean);
  return <p className={'brand-tagline ' + className}>
    {parts.map((part, i) => <span className="tagline-part" key={i}>
      {i > 0 && <span className="tagline-divider" aria-hidden="true"> • </span>}{part}
    </span>)}
  </p>;
}
