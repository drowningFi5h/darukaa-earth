import type { Polygon } from 'geojson';
export type User = { id: string; name: string; email: string; is_demo: boolean };
export type Project = {
  id: string;
  name: string;
  description: string;
  category: 'carbon' | 'biodiversity';
  site_count: number;
  area_ha: number;
};
export type Site = {
  id: string;
  project_id: string;
  name: string;
  geometry: Polygon;
  area_ha: number;
};
export type Analytics = {
  is_sample: boolean;
  measurements: { date: string; carbon_tco2e: number; species_count: number }[];
};
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: 'Service unavailable. Please try again.' }));
    const detail = Array.isArray(body.detail)
      ? body.detail.map((d: { msg: string }) => d.msg).join('. ')
      : body.detail;
    throw new ApiError(detail || 'Something went wrong. Please try again.', response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(value);
