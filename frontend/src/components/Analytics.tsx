import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, number, type Analytics as AnalyticsData } from '../lib/api';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);
export default function Analytics({ siteId }: { siteId: string }) {
  const [metric, setMetric] = useState<'carbon' | 'species'>('carbon');
  const data = useQuery({
    queryKey: ['analytics', siteId],
    queryFn: () => api<AnalyticsData>(`/sites/${siteId}/analytics`),
  });
  if (data.isPending) return <p role="status">Loading observations…</p>;
  if (data.error)
    return (
      <p role="alert" className="error-box">
        {data.error.message}
      </p>
    );
  const rows = data.data.measurements;
  if (!rows.length)
    return (
      <div className="empty-analytics">
        <h3>A new story starts here.</h3>
        <p>
          No measurements yet. Your site boundary is saved; observations will appear here when data
          is added.
        </p>
      </div>
    );
  const total = rows.reduce((sum, row) => sum + row.carbon_tco2e, 0);
  return (
    <div className="analytics">
      <div className="analytics-summary">
        <div>
          <span>Annual carbon removal</span>
          <strong>
            {number(total, 1)} <small>tCO₂e</small>
          </strong>
        </div>
        <div>
          <span>Latest species count</span>
          <strong>
            {rows.at(-1)?.species_count} <small>species</small>
          </strong>
        </div>
      </div>
      <div className="segmented" aria-label="Chart metric">
        <button aria-pressed={metric === 'carbon'} onClick={() => setMetric('carbon')}>
          Carbon removal
        </button>
        <button aria-pressed={metric === 'species'} onClick={() => setMetric('species')}>
          Biodiversity
        </button>
      </div>
      <div className="chart-container">
        <Line
          aria-label={
            metric === 'carbon'
              ? 'Monthly sample carbon removal in tonnes CO2 equivalent'
              : 'Monthly sample observed species count'
          }
          data={{
            labels: rows.map((r) =>
              new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
                new Date(r.date),
              ),
            ),
            datasets: [
              {
                label: metric === 'carbon' ? 'Carbon removal (tCO₂e)' : 'Species observed',
                data: rows.map((r) => (metric === 'carbon' ? r.carbon_tco2e : r.species_count)),
                borderColor: '#496844',
                backgroundColor: 'rgba(135,155,105,.13)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
                borderWidth: 2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: matchMedia('(prefers-reduced-motion: reduce)').matches
              ? false
              : { duration: 250 },
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: metric === 'carbon' ? 'tCO₂e / month' : 'Species count',
                },
                grid: { color: '#e9e7dd' },
              },
            },
          }}
        />
      </div>
      {data.data.is_sample && (
        <p className="sample-note">
          Synthetic monthly observations for 2025. Not verified environmental outcomes.
        </p>
      )}
      <details className="data-table">
        <summary>View measurement table</summary>
        <table>
          <caption>Monthly observations for 2025</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">tCO₂e</th>
              <th scope="col">Species</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <th scope="row">{r.date.slice(0, 7)}</th>
                <td>{r.carbon_tco2e}</td>
                <td>{r.species_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
