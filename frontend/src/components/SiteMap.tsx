import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Polygon, FeatureCollection } from 'geojson';
import { MapPin } from 'lucide-react';
import type { Site } from '../lib/api';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

type Props = {
  sites: Site[];
  selected?: string;
  onSelect?: (id: string) => void;
  editing?: boolean;
  initial?: Polygon;
  onGeometry?: (geometry: Polygon | null) => void;
};
export default function SiteMap({
  sites,
  selected,
  onSelect,
  editing = false,
  initial,
  onGeometry,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<mapboxgl.Map | null>(null),
    drawRef = useRef<MapboxDraw | null>(null);
  const callbacks = useRef({ onSelect, onGeometry });
  callbacks.current = { onSelect, onGeometry };
  const initialRef = useRef(initial);
  const sitesRef = useRef(sites);
  sitesRef.current = sites;
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  useEffect(() => {
    if (!token || !container.current) return;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: container.current,
        accessToken: token,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [82.8, 22.2],
        zoom: 3.5,
        pitch: 0,
        maxPitch: 0,
        projection: 'mercator',
        attributionControl: true,
      });
    } catch {
      setError('Your browser could not open the map. Try a browser with WebGL enabled.');
      return;
    }
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('error', () =>
      setError('Map tiles could not load. Check your connection or Mapbox token permissions.'),
    );
    map.on('load', () => {
      setError('');
      map.addSource('sites', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'site-fill',
        type: 'fill',
        source: 'sites',
        paint: { 'fill-color': '#58764b', 'fill-opacity': 0.28 },
      });
      map.addLayer({
        id: 'site-outline',
        type: 'line',
        source: 'sites',
        paint: { 'line-color': '#31573a', 'line-width': 2 },
      });
      map.on('click', 'site-fill', (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (id && !editing) callbacks.current.onSelect?.(String(id));
      });
      map.on('mouseenter', 'site-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'site-fill', () => {
        map.getCanvas().style.cursor = '';
      });
      if (editing) {
        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, trash: true },
          defaultMode: initialRef.current ? 'simple_select' : 'draw_polygon',
        });
        map.addControl(draw, 'top-left');
        drawRef.current = draw;
        if (initialRef.current) {
          draw.add({ type: 'Feature', properties: {}, geometry: initialRef.current });
        }
        const update = () => {
          const all = draw.getAll();
          if (all.features.length > 1) {
            const last = all.features.at(-1)!;
            draw.deleteAll();
            draw.add(last);
          }
          const geom = draw.getAll().features[0]?.geometry;
          callbacks.current.onGeometry?.(geom?.type === 'Polygon' ? geom : null);
        };
        map.on('draw.create', update);
        map.on('draw.update', update);
        map.on('draw.delete', update);
      }
      setReady(true);
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [editing, token]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: sites.map((s) => ({
        type: 'Feature',
        properties: { id: s.id, name: s.name },
        geometry: s.geometry,
      })),
    };
    (map.getSource('sites') as mapboxgl.GeoJSONSource).setData(data);
    const polygons = initialRef.current ? [initialRef.current] : sites.map((s) => s.geometry);
    if (polygons.length) {
      const bounds = new mapboxgl.LngLatBounds();
      polygons.forEach((p) => p.coordinates[0].forEach((c) => bounds.extend([c[0], c[1]])));
      map.fitBounds(bounds, {
        padding: 65,
        maxZoom: 13,
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
      });
    }
  }, [sites, ready]);
  useEffect(() => {
    if (ready && mapRef.current) {
      mapRef.current.setPaintProperty('site-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'id'], selected || ''],
        0.55,
        0.25,
      ]);
    }
  }, [selected, ready]);
  if (!token)
    return (
      <div className="map-unavailable">
        <MapPin size={32} />
        <h3>Map access needs configuration</h3>
        <p>
          Add a Mapbox public token to VITE_MAPBOX_TOKEN and rebuild. Your saved sites remain
          available in the list.
        </p>
      </div>
    );
  return (
    <div className="map-shell">
      <div
        ref={container}
        className="map-container"
        aria-label={editing ? 'Draw or edit a site boundary' : 'Project sites map'}
      />
      {error && (
        <p className="map-error" role="alert">
          {error}
        </p>
      )}
      {!ready && !error && (
        <p className="map-loading" role="status">
          Loading the landscape…
        </p>
      )}
      <div className="map-key">
        <span /> Project boundary
      </div>
    </div>
  );
}
