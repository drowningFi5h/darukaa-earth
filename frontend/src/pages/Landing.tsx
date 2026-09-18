import { ArrowDown, ArrowRight, Leaf, ScanLine, Sprout, Trees, Waves } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Brand } from '../components/Brand';
import { Button } from '../components/ui/button';
import { post, type User } from '../lib/api';

const projects = [
  {
    name: 'Western Ghats',
    kind: 'Forest restoration',
    image: 'forest',
    description: 'A connected future for one of India’s richest forest landscapes.',
  },
  {
    name: 'Sundarbans',
    kind: 'Coastal resilience',
    image: 'coast',
    description: 'Mangrove habitats where land, river, and ocean meet.',
  },
  {
    name: 'Kaziranga',
    kind: 'Biodiversity protection',
    image: 'mountain',
    description: 'Making room for wildlife across grasslands and wetlands.',
  },
];
export default function Landing() {
  const navigate = useNavigate(),
    cache = useQueryClient();
  const demo = useMutation({
    mutationFn: () => post<User>('/auth/demo'),
    onSuccess: (user) => {
      cache.setQueryData(['me'], user);
      navigate('/app');
    },
  });
  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <section className="hero">
        <img
          src="/images/hero.webp"
          alt="Sunlight falling through a dense green forest"
          className="hero-photo"
          width="1920"
          height="1280"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <header className="landing-nav">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#approach">Our approach</a>
            <a href="#landscapes">Landscapes</a>
            <a href="#impact">Our impact</a>
          </nav>
          <Button asChild variant="cream" size="sm">
            <Link to="/login">
              Log in <ArrowRight size={15} />
            </Link>
          </Button>
        </header>
        <main id="main" className="hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <p className="hero-kicker">Rooted in nature. Guided by insight.</p>
            <h1>
              A clearer view
              <br />
              of a living
              <br />
              <em>planet.</em>
            </h1>
            <p className="hero-description">
              Bring your carbon and biodiversity projects into focus. Understand the land. See the
              change. Protect what matters.
            </p>
            <div className="hero-actions">
              <Button variant="cream" onClick={() => demo.mutate()} disabled={demo.isPending}>
                {demo.isPending ? 'Opening demo…' : 'Explore the platform'}
                <ArrowRight size={17} />
              </Button>
              <Link to="/register" className="text-link light">
                Create account
              </Link>
            </div>
            {demo.error && (
              <p role="alert" className="hero-error">
                {demo.error.message}
              </p>
            )}
          </motion.div>
        </main>
        <div className="hero-bottom">
          <span>Nature deserves a bigger picture.</span>
          <a href="#approach" aria-label="Discover our approach">
            <ArrowDown size={20} />
          </a>
          <span>Built for a world worth protecting</span>
        </div>
      </section>
      <section id="approach" className="approach">
        <div className="approach-copy">
          <p className="section-label">Our approach</p>
          <h2>
            Every landscape
            <br />
            has a story.
            <br />
            <em>See yours unfold.</em>
          </h2>
          <p>
            From the first boundary to the latest observation, connect your projects, places, and
            progress in one thoughtful workspace.
          </p>
          <div className="principles">
            <div>
              <ScanLine />
              <h3>Map the land</h3>
              <p>Draw site boundaries and bring every project into view.</p>
            </div>
            <div>
              <Leaf />
              <h3>Measure change</h3>
              <p>Follow carbon removal and biodiversity over time.</p>
            </div>
            <div>
              <Sprout />
              <h3>Act with clarity</h3>
              <p>Turn scattered observations into a clearer picture.</p>
            </div>
          </div>
          <Link to="/register" className="text-link">
            Start your first project <ArrowRight size={17} />
          </Link>
        </div>
        <div className="approach-image">
          <img
            src="/images/forest.webp"
            alt="Misty evergreen forest"
            width="900"
            height="1100"
            loading="lazy"
          />
          <div>
            <h2>
              Small observations.
              <br />
              <em>Lasting perspective.</em>
            </h2>
            <p>
              A place for every site.
              <br />A story in every season.
            </p>
          </div>
        </div>
      </section>
      <section id="landscapes" className="landscapes">
        <div className="section-heading">
          <div>
            <p className="section-label">Explore the possibilities</p>
            <h2>
              Different landscapes.
              <br />
              <em>One shared future.</em>
            </h2>
          </div>
          <p>
            Discover three illustrative projects in our demo workspace. Sample data, real
            possibilities.
          </p>
        </div>
        <div className="project-gallery">
          {projects.map((p) => (
            <button
              key={p.name}
              className="landscape-card"
              onClick={() => demo.mutate()}
              disabled={demo.isPending}
            >
              <img src={`/images/${p.image}.webp`} alt="" width="650" height="800" loading="lazy" />
              <div className="landscape-copy">
                <span>{p.kind}</span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <span className="circle-arrow">
                  <ArrowRight size={19} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section id="impact" className="impact">
        <div>
          <p className="section-label">Inside the demo</p>
          <h2>
            A little exploration.
            <br />
            <em>A wider perspective.</em>
          </h2>
          <p className="sample-note">
            Illustrative projects and synthetic measurements.
            <br />
            Not verified environmental outcomes.
          </p>
        </div>
        <div className="impact-stat">
          <Trees />
          <strong>3</strong>
          <span>Restoration projects</span>
        </div>
        <div className="impact-stat">
          <Waves />
          <strong>6</strong>
          <span>Mapped sites</span>
        </div>
        <div className="impact-stat">
          <Leaf />
          <strong>12</strong>
          <span>Months of observations</span>
        </div>
      </section>
      <section className="closing">
        <div>
          <p className="section-label">Make room for a greener future</p>
          <h2>
            Your next chapter
            <br />
            starts <em>with the land.</em>
          </h2>
          <Button asChild>
            <Link to="/register">
              Create your workspace <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
        <img
          src="/images/coast.webp"
          alt="A peaceful green coastal landscape"
          width="900"
          height="650"
          loading="lazy"
        />
      </section>
      <footer className="footer">
        <Brand />
        <p>Care for the land. Understand the change.</p>
        <div>
          <a href="#approach">Our approach</a>
          <Link to="/login">Workspace</Link>
          <a href="/credits">Photo credits</a>
        </div>
        <small>© {new Date().getFullYear()} Darukaa Earth · Hackathon demonstration</small>
      </footer>
    </div>
  );
}
