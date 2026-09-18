import { Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Darukaa Earth home">
      <Sprout strokeWidth={1.3} aria-hidden="true" />
      <span>
        darukaa<span className="brand-earth">.earth</span>
      </span>
    </Link>
  );
}
