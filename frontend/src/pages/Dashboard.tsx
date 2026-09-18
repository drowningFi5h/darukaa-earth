import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Polygon } from 'geojson';
import area from '@turf/area';
import {
  ArrowRight,
  ArrowUpRight,
  FolderOpen,
  Leaf,
  LogOut,
  Map,
  MapPin,
  Plus,
  Search,
  Sprout,
  Trees,
} from 'lucide-react';
import { api, ApiError, post, number, type User, type Project, type Site } from '../lib/api';
import { Brand } from '../components/Brand';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/dialog';
const SiteMap = lazy(() => import('../components/SiteMap'));
const Analytics = lazy(() => import('../components/Analytics'));
const EMPTY_SITES: Site[] = [];
const projectSchema = z.object({
  name: z.string().trim().min(1, 'Enter a project name').max(100),
  description: z.string().max(2000),
  category: z.enum(['carbon', 'biodiversity']),
});
type ProjectValues = z.infer<typeof projectSchema>;

function ProjectForm({ onDone }: { onDone: () => void }) {
  const cache = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { category: 'carbon', description: '' },
  });
  const create = useMutation({
    mutationFn: (data: ProjectValues) => post<Project>('/projects', data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['projects'] });
      onDone();
    },
  });
  return (
    <form className="stack-form" onSubmit={handleSubmit((data) => create.mutate(data))}>
      <label>
        Project name
        <input {...register('name')} autoComplete="off" />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </label>
      <label>
        Focus
        <select {...register('category')}>
          <option value="carbon">Carbon restoration</option>
          <option value="biodiversity">Biodiversity protection</option>
        </select>
      </label>
      <label>
        Description
        <textarea {...register('description')} rows={3} />
        {errors.description && <span className="field-error">{errors.description.message}</span>}
      </label>
      {create.error && (
        <p className="error-box" role="alert">
          {create.error.message}
        </p>
      )}
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Creating…' : 'Create project'}
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}

function SiteForm({
  project,
  site,
  onDone,
}: {
  project: Project;
  site?: Site;
  onDone: () => void;
}) {
  const cache = useQueryClient(),
    [name, setName] = useState(site?.name || ''),
    [geometry, setGeometry] = useState<Polygon | null>(site?.geometry || null),
    [mapVersion, setMapVersion] = useState(0),
    [geoText, setGeoText] = useState(site ? JSON.stringify(site.geometry) : ''),
    [error, setError] = useState('');
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  const save = useMutation({
    mutationFn: () =>
      site
        ? api<Site>(`/sites/${site.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, geometry }),
          })
        : post<Site>(`/projects/${project.id}/sites`, { name, geometry }),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['sites'] });
      cache.invalidateQueries({ queryKey: ['projects'] });
      onDone();
    },
  });
  let estimated = 0;
  try {
    if (geometry) estimated = area(geometry) / 10000;
  } catch {
    /* API validates final geometry. */
  }
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!geometry) {
          setError('Draw a boundary or paste a GeoJSON Polygon first.');
          return;
        }
        setError('');
        save.mutate();
      }}
    >
      <label>
        Site name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          name="site-name"
          autoComplete="off"
        />
      </label>
      <p className="field-hint">
        Click to place corners, then click the first point to close the boundary. Select a boundary
        to move its vertices.
      </p>
      <div className="draw-map">
        <Suspense fallback={<p>Loading drawing tools…</p>}>
          <SiteMap
            sites={EMPTY_SITES}
            editing
            key={mapVersion}
            initial={geometry || undefined}
            onGeometry={(g) => {
              setGeometry(g);
              setGeoText(g ? JSON.stringify(g) : '');
            }}
          />
        </Suspense>
      </div>
      <p className="field-hint">
        Estimated area: {number(estimated, 2)} ha. PostGIS calculates the final area when saved.
      </p>
      <details>
        <summary>Use GeoJSON instead of drawing</summary>
        <label>
          Polygon geometry
          <textarea
            name="geojson"
            value={geoText}
            onChange={(e) => setGeoText(e.target.value)}
            rows={3}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              const parsed = JSON.parse(geoText);
              if (
                parsed.type !== 'Polygon' ||
                !Array.isArray(parsed.coordinates) ||
                !Array.isArray(parsed.coordinates[0]) ||
                parsed.coordinates[0].length < 4
              )
                throw new Error();
              if (!Number.isFinite(area(parsed)) || area(parsed) <= 0) throw new Error();
              setGeometry(parsed);
              setMapVersion((value) => value + 1);
              setError('');
            } catch {
              setError('Enter a GeoJSON geometry with type Polygon and coordinates.');
            }
          }}
        >
          Use these coordinates
        </Button>
      </details>
      {(error || save.error) && (
        <p className="error-box" role="alert">
          {error || save.error?.message}
        </p>
      )}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving boundary…' : site ? 'Save changes' : 'Save site'}
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}

export default function Dashboard() {
  const cache = useQueryClient(),
    [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(''),
    [createProject, setCreateProject] = useState(false),
    [editSite, setEditSite] = useState<Site | null | undefined>(undefined);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), retry: false });
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects'),
    enabled: !!me.data,
  });
  const projectId = params.get('project') || projects.data?.[0]?.id;
  const selectedProject = projects.data?.find((p) => p.id === projectId);
  const sites = useQuery({
    queryKey: ['sites', projectId, projects.data?.map((p) => p.id).join(',')],
    queryFn: async () =>
      projectId === 'all'
        ? (
            await Promise.all(
              (projects.data || []).map((p) => api<Site[]>(`/projects/${p.id}/sites`)),
            )
          ).flat()
        : api<Site[]>(`/projects/${projectId}/sites`),
    enabled: !!selectedProject || (projectId === 'all' && !!projects.data?.length),
  });
  const selectedSite = sites.data?.find((s) => s.id === params.get('site'));
  const logout = useMutation({
    mutationFn: () => post('/auth/logout'),
    onSuccess: () => {
      cache.clear();
      window.location.assign('/login');
    },
  });
  if (me.error instanceof ApiError && me.error.status === 401)
    return <Navigate to="/login" replace />;
  if (me.isPending) return <div className="page-loading">Opening your workspace…</div>;
  if (me.error)
    return (
      <main className="credits">
        <h1>We couldn’t open your workspace.</h1>
        <p role="alert">{me.error.message}</p>
        <Button onClick={() => me.refetch()}>Try again</Button>
      </main>
    );
  const all = projects.data || [],
    filtered = all.filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <div className="workspace">
      <a href="#workspace-main" className="skip-link">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">Your workspace</div>
        <nav aria-label="Workspace navigation">
          <Link to="/app" className="active">
            <Map size={18} />
            Landscape explorer
          </Link>
          <a href="#projects">
            <FolderOpen size={18} />
            Projects
          </a>
          <Link to="/">
            <ArrowUpRight size={18} />
            Visit our home
          </Link>
        </nav>
        <div className="sidebar-note">
          <Sprout size={30} strokeWidth={1} />
          <h3>
            Rooted in a<br />
            better tomorrow.
          </h3>
          <p>A clearer picture of the places you care for.</p>
        </div>
        <div className="profile">
          <span className="avatar">{me.data?.name.charAt(0)}</span>
          <div>
            <strong>{me.data?.name}</strong>
            <small>{me.data?.is_demo ? 'Demo workspace' : 'Project administrator'}</small>
          </div>
          <button onClick={() => logout.mutate()} disabled={logout.isPending} aria-label="Log out">
            <LogOut size={17} />
          </button>
        </div>
        {logout.error && <p role="alert">{logout.error.message}</p>}
      </aside>
      <main className="workspace-main" id="workspace-main">
        <header className="workspace-top">
          <span>
            Workspace <span className="breadcrumb-slash">/</span> Landscape explorer
          </span>
          <span className="workspace-status">
            <span /> {me.data?.is_demo ? 'Sample dataset' : 'Your projects'}
          </span>
        </header>
        <div className="workspace-body">
          <div className="dashboard-heading">
            <div>
              <p className="section-label">A little perspective goes a long way</p>
              <h1>Your living landscapes.</h1>
              <p>Every project, every site. A clearer view of your impact.</p>
            </div>
            <Button onClick={() => setCreateProject(true)} disabled={me.data?.is_demo}>
              <Plus size={16} />
              New project
            </Button>
          </div>
          {me.data?.is_demo && (
            <div className="demo-banner">
              <Leaf size={17} />
              <span>
                You’re exploring illustrative projects. Create an account to map your own.
              </span>
              <Link to="/register">
                Create account <ArrowRight size={15} />
              </Link>
            </div>
          )}
          <div className="summary-strip">
            <div>
              <FolderOpen />
              <span>
                Projects<strong>{number(all.length)}</strong>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                Mapped sites<strong>{number(all.reduce((s, p) => s + p.site_count, 0))}</strong>
              </span>
            </div>
            <div>
              <Trees />
              <span>
                Total mapped area
                <strong>
                  {number(
                    all.reduce((s, p) => s + p.area_ha, 0),
                    1,
                  )}{' '}
                  <small>ha</small>
                </strong>
              </span>
            </div>
          </div>
          {projects.error && (
            <p className="error-box" role="alert">
              {projects.error.message} <button onClick={() => projects.refetch()}>Retry</button>
            </p>
          )}
          <div className="explorer">
            <section className="project-pane" id="projects">
              <div className="pane-title">
                <h2>Your projects</h2>
                <span>{all.length}</span>
              </div>
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search projects"
                  placeholder="Find a landscape…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ project: 'all' })}
                aria-pressed={projectId === 'all'}
              >
                View all landscapes
              </Button>
              <div className="project-list">
                {projects.isPending ? (
                  <p role="status">Loading projects…</p>
                ) : (
                  filtered.map((p, i) => (
                    <button
                      key={p.id}
                      className={`project-item ${p.id === projectId ? 'selected' : ''}`}
                      onClick={() => setParams({ project: p.id })}
                    >
                      <img
                        src={`/images/${['forest', 'coast', 'mountain'][i % 3]}.webp`}
                        alt=""
                        width="56"
                        height="62"
                      />
                      <div>
                        <span className="project-kind">
                          {p.category === 'carbon' ? 'Carbon restoration' : 'Biodiversity'}
                        </span>
                        <h3>{p.name}</h3>
                        <p>
                          {p.site_count} sites <span>·</span> {number(p.area_ha, 1)} ha
                        </p>
                      </div>
                    </button>
                  ))
                )}
                {!projects.isPending && !filtered.length && (
                  <div className="empty-projects">
                    <Sprout />
                    <h3>{search ? 'No matching landscapes' : 'Your first landscape awaits.'}</h3>
                    <p>
                      {search
                        ? 'Try another project name.'
                        : 'Create a project, then draw the sites you care for.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="project-pane-bottom">
                <Leaf size={16} />
                <span>
                  {me.data?.is_demo
                    ? 'Illustrative boundaries and observations'
                    : 'Boundaries securely saved to your workspace'}
                </span>
              </div>
            </section>
            <section className="map-pane">
              <div className="map-heading">
                <div>
                  <h2>{selectedProject?.name || 'Landscape explorer'}</h2>
                  <p>
                    {selectedProject?.description ||
                      (projectId === 'all'
                        ? 'Every project and site in your workspace.'
                        : 'Create a project to start mapping.')}
                  </p>
                </div>
                {selectedProject && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={me.data?.is_demo}
                    onClick={() => setEditSite(null)}
                  >
                    <Plus size={15} />
                    Add site
                  </Button>
                )}
              </div>
              <div className="dashboard-map">
                <Suspense fallback={<p className="page-loading">Loading map…</p>}>
                  <SiteMap
                    sites={sites.data || EMPTY_SITES}
                    selected={selectedSite?.id}
                    onSelect={(id) =>
                      setParams({
                        project: sites.data?.find((s) => s.id === id)?.project_id || projectId!,
                        site: id,
                      })
                    }
                  />
                </Suspense>
              </div>
              <div className="site-list" aria-label="Sites in selected project">
                {sites.isPending && selectedProject ? (
                  <p role="status">Loading sites…</p>
                ) : (
                  sites.data?.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setParams({ project: s.project_id, site: s.id })}
                    >
                      <MapPin size={17} />
                      <span>
                        {s.name}
                        <small>{number(s.area_ha, 1)} ha</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))
                )}
                {selectedProject && !sites.isPending && !sites.data?.length && !sites.error && (
                  <p>No sites yet. Add a site to draw its boundary.</p>
                )}
                {sites.error && (
                  <p role="alert" className="error-box">
                    {sites.error.message}
                  </p>
                )}
              </div>
            </section>
          </div>
          <p className="workspace-footnote">
            {me.data?.is_demo
              ? 'Demo observations are synthetic and do not represent verified carbon credits or ecological outcomes.'
              : 'Area is computed on the Earth’s surface using PostGIS. New sites begin without measurement data.'}
          </p>
        </div>
      </main>
      <Modal
        open={createProject}
        onOpenChange={setCreateProject}
        title="A new landscape begins."
        description="Give your project a name and a focus."
      >
        <ProjectForm onDone={() => setCreateProject(false)} />
      </Modal>
      <Modal
        open={editSite !== undefined}
        onOpenChange={(open) => {
          if (!open && window.confirm('Close the editor? Unsaved changes will be lost.'))
            setEditSite(undefined);
        }}
        title={editSite ? 'Refine your boundary.' : 'Put your site on the map.'}
        description="Draw a boundary, or enter a GeoJSON polygon."
        className="site-editor"
      >
        {selectedProject && editSite !== undefined && (
          <SiteForm
            project={selectedProject}
            site={editSite || undefined}
            onDone={() => setEditSite(undefined)}
          />
        )}
      </Modal>
      <Modal
        open={!!selectedSite}
        onOpenChange={(open) => {
          if (!open) setParams({ project: projectId! });
        }}
        title={selectedSite?.name || 'Site details'}
        description={`${number(selectedSite?.area_ha || 0, 2)} hectares · ${selectedProject?.name || ''}`}
        className="site-details"
      >
        {selectedSite && (
          <>
            <div className="site-detail-label">
              <span>
                <span className="status-dot" />
                Boundary mapped
              </span>
              {!me.data?.is_demo && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditSite(selectedSite);
                    setParams({ project: projectId! });
                  }}
                >
                  Edit site
                </Button>
              )}
            </div>
            <Suspense fallback={<p>Loading analytics…</p>}>
              <Analytics siteId={selectedSite.id} />
            </Suspense>
          </>
        )}
      </Modal>
    </div>
  );
}
