"use client";

import { useEffect, useState } from 'react';
import { getLatestTelemetry, getAlerts, getRiskAssessments, getEvents, resolveAlert } from '@/services/api';
import { SensorNode, SensorReading, Alert, RiskAssessment, OperationalEvent } from '@/types';
import { 
  Activity, 
  AlertTriangle, 
  CloudRain, 
  Droplets, 
  MapPin, 
  Thermometer, 
  Wifi, 
  CheckCircle2, 
  Cpu, 
  ShieldAlert, 
  Sliders, 
  Radio, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

import { CONFIG } from '@/lib/config';

export default function CommandCenter() {
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [riskMap, setRiskMap] = useState<Record<string, RiskAssessment>>({});
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [telemetry, fetchedAlerts, fetchedRisk, fetchedEvents] = await Promise.all([
        getLatestTelemetry(),
        getAlerts(),
        getRiskAssessments(),
        getEvents(30).catch(() => [])
      ]);
      setNodes(telemetry.nodes);
      setReadings(telemetry.readings);
      setAlerts(fetchedAlerts);
      setRiskMap(fetchedRisk);
      setEvents(fetchedEvents);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError("Live data unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (id: number) => {
    try {
      await resolveAlert(String(id));
      await fetchData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading Command Center...</div>;
  }

  const activeNodes = nodes.filter(n => {
    const diff = Date.now() - new Date(n.last_seen).getTime();
    return diff < 300000; // Count as active if seen in last 5 mins
  }).length;

  const getFreshness = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 30000) return { label: 'LIVE', color: 'bg-green-100 text-green-700' };
    if (diff < 300000) return { label: 'STALE', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OFFLINE', color: 'bg-gray-100 text-gray-700' };
  };

  const getRiskBadge = (risk?: RiskAssessment) => {
    if (!risk) return { label: 'UNKNOWN', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    if (risk.riskLevel === 'CRITICAL') return { label: 'CRITICAL RISK', color: 'bg-red-100 text-red-700 border-red-300' };
    if (risk.riskLevel === 'WARNING') return { label: 'WARNING RISK', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    if (risk.riskLevel === 'WATCH') return { label: 'WATCH', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    if (risk.riskLevel === 'NORMAL') return { label: 'NORMAL', color: 'bg-green-100 text-green-700 border-green-300' };
    return { label: 'RISK UNKNOWN', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  // Surface the latest meaningful event (preferring non-trivial events)
  const meaningfulEvent = events.find(e => e.event_type !== 'READING_RECEIVED') || events[0] || null;

  // Priority sort nodes: CRITICAL > WARNING > WATCH > UNKNOWN > NORMAL > STALE
  const sortedNodes = [...nodes].sort((a, b) => {
    const riskA = riskMap[a.node_id]?.riskLevel || 'UNKNOWN';
    const riskB = riskMap[b.node_id]?.riskLevel || 'UNKNOWN';
    const priorityWeight: Record<string, number> = {
      CRITICAL: 5,
      WARNING: 4,
      WATCH: 3,
      UNKNOWN: 2,
      NORMAL: 1,
    };
    return (priorityWeight[riskB] || 0) - (priorityWeight[riskA] || 0);
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Sentinel Command Center
            </h1>
            <p className="text-blue-200 text-sm">Environmental Early Warning & Operational Intelligence</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Network Active ({activeNodes}/{nodes.length} nodes)</span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <Wifi className="h-4 w-4" />
              <span>Last Sync: {lastSync.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto p-4 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Meaningful Event Operational Banner */}
      {meaningfulEvent && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <Link href={`/nodes/${meaningfulEvent.node_id}`}>
            <div className="p-3.5 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl flex items-center justify-between transition-colors shadow-2xs cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Radio className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Latest Network Event</span>
                    <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      Node: {meaningfulEvent.node_id}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(meaningfulEvent.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5 font-medium">
                    {meaningfulEvent.title} — {meaningfulEvent.description}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center text-xs text-blue-700 font-semibold gap-1">
                Inspect Node <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 space-y-6 mt-2">
        {/* Upper Grid - Map & Side Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Active System & Hazard Alerts ({alerts.length})
              </h2>
              {alerts.length === 0 ? (
                <p className="text-gray-400 text-xs py-4 text-center">No active alerts detected.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs text-gray-900">{alert.title}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-gray-700">{alert.message}</p>
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-200/60">
                        <span className="text-[10px] text-gray-500 font-mono">Node: {alert.node_id}</span>
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="text-xs bg-white hover:bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-300 flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-[380px] flex flex-col">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Live Deployment Map
              </h2>
              <div className="bg-blue-50 flex-1 rounded-lg border border-blue-100 relative overflow-hidden">
                <Map nodes={nodes} getFreshness={getFreshness} />
              </div>
            </section>
          </div>
        </div>

        {/* Network Situation & Node Comparison View (Parts 11 & 13) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Network Situation & Multi-Node Comparison
              </h2>
              <p className="text-xs text-gray-500">Live operational comparison ranked by risk priority</p>
            </div>
            <span className="text-xs font-mono text-gray-400">Total Monitored Stations: {nodes.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-mono">
                <tr>
                  <th className="px-4 py-3">Node / Station</th>
                  <th className="px-4 py-3">Operational State</th>
                  <th className="px-4 py-3">Risk Assessment</th>
                  <th className="px-4 py-3">Water Trend</th>
                  <th className="px-4 py-3">Rain Activity</th>
                  <th className="px-4 py-3">Data Freshness</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedNodes.map(node => {
                  const freshness = getFreshness(node.last_seen);
                  const risk = riskMap[node.node_id];
                  const riskBadge = getRiskBadge(risk);
                  const rate = risk?.features.waterDistanceRatePerMin;
                  const rainRate = risk?.features.rainTipRatePerMin;

                  return (
                    <tr key={node.node_id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/nodes/${node.node_id}`} className="font-semibold text-blue-600 hover:underline block">
                          {node.name}
                        </Link>
                        <span className="text-[10px] text-gray-400 font-mono">{node.location_name} • ID: {node.node_id}</span>
                      </td>
                      <td className="px-4 py-3 font-mono uppercase font-medium">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {node.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border font-mono font-medium ${riskBadge.color}`}>
                          {riskBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {rate !== null && rate !== undefined ? (
                          <span className={`flex items-center gap-1 font-semibold ${
                            rate < 0 ? 'text-blue-700' : rate > 0 ? 'text-amber-700' : 'text-gray-600'
                          }`}>
                            {rate < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : rate > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : null}
                            {rate > 0 ? `+${rate}` : rate} cm/min
                          </span>
                        ) : (
                          <span className="text-gray-400">Stable</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {rainRate !== null && rainRate !== undefined && rainRate > 0 ? (
                          <span className="text-purple-700 font-semibold">{rainRate} tips/min</span>
                        ) : (
                          <span className="text-gray-400">0 tips/min (Dry)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${freshness.color}`}>
                          {freshness.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          href={`/nodes/${node.node_id}`}
                          className="px-2.5 py-1 text-xs bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 rounded font-medium transition-colors"
                        >
                          Investigate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Latest Environmental Readings Grid */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Latest Ingested Telemetry Readings (RAW)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nodes.map(node => {
              const r = readings[node.node_id];
              if (!r) return null;
              return (
                <div key={node.node_id} className="border border-gray-200 bg-gray-50/70 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-xs truncate text-gray-900">{node.name}</h3>
                    <span className="text-[10px] font-mono text-gray-400">{node.node_id}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-600" /> Water Dist</span>
                      <span className="font-mono font-bold">{r.water_distance_cm} cm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><Activity className="h-3 w-3 text-indigo-600" /> Rain Sensor</span>
                      <span className="font-mono font-medium">{r.rain_sensor_raw}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><CloudRain className="h-3 w-3 text-purple-600" /> Rain Tips</span>
                      <span className="font-mono font-medium">{r.rain_gauge_tips}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><Activity className="h-3 w-3 text-green-600" /> Soil Moisture</span>
                      <span className="font-mono font-medium">{r.soil_moisture_raw}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><Thermometer className="h-3 w-3 text-red-500" /> Temp</span>
                      <span className="font-mono font-medium">{r.temperature_c}&deg;C</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1"><Droplets className="h-3 w-3 text-teal-600" /> Humidity</span>
                      <span className="font-mono font-medium">{r.humidity_pct}%</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-400">
                      <span>Updated</span>
                      <span className="font-mono text-gray-600">{new Date(r.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
