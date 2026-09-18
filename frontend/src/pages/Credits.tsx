import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
export default function Credits() {
  return (
    <main className="credits">
      <Brand />
      <h1>Photography and data</h1>
      <p>
        Landscape photography is sourced from Unsplash under the Unsplash License. Images illustrate
        the product’s environmental focus; they are not photographs of the sample sites.
      </p>
      <p>
        <a href="https://unsplash.com/license">Read the Unsplash License</a>
      </p>
      <ul>
        <li>
          Forest light:{' '}
          <a href="https://images.unsplash.com/photo-1441974231531-c6227db76b6e">Original image</a>
        </li>
        <li>
          Forest landscape:{' '}
          <a href="https://images.unsplash.com/photo-1473448912268-2022ce9509d8">Original image</a>
        </li>
        <li>
          Coastal landscape:{' '}
          <a href="https://images.unsplash.com/photo-1518837695005-2083093ee35b">Original image</a>
        </li>
        <li>
          Mountain landscape:{' '}
          <a href="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b">Original image</a>
        </li>
      </ul>
      <h2>About the demo</h2>
      <p>
        Project boundaries and monthly carbon and species observations are synthetic, deterministic
        examples. They do not represent verified projects, credits, ecological surveys, or measured
        environmental benefits. Site area is calculated from the illustrative polygon using PostGIS.
      </p>
      <Link className="text-link" to="/">
        Back to home
      </Link>
    </main>
  );
}
