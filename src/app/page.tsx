"use client";

import { useEffect, useState } from 'react';
import { getNodes, getLatestReadings, getAlerts, getRiskAssessments, resolveAlert } from '@/services/api';
import { SensorNode, SensorReading, Alert, RiskAssessment } from '@/types';
import { Activity, AlertTriangle, CloudRain, Droplets, MapPin, Thermometer, Wifi, CheckCircle2, Cpu, ShieldAlert, Sliders } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

import { CONFIG } from '@/lib/config';

export default function CommandCenter() {
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [riskMap, setRiskMap] = useState<Record<string, RiskAssessment>>({});
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [fetchedNodes, fetchedReadings, fetchedAlerts, fetchedRisk] = await Promise.all([
        getNodes(),
        getLatestReadings(),
        getAlerts(),
        getRiskAssessments()
      ]);
      setNodes(fetchedNodes);
      setReadings(fetchedReadings);
      setAlerts(fetchedAlerts);
      setRiskMap(fetchedRisk);
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
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

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Alerts & Status */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Active System & Hazard Alerts ({alerts.length})
            </h2>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No active alerts.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <span className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/60">
                      <span className="text-xs text-gray-500">Node: {alert.node_id}</span>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="text-xs bg-white hover:bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-300 flex items-center gap-1 transition-colors"
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

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              Node Health & Intelligence Status
            </h2>
            <div className="space-y-3">
              {nodes.map(node => {
                const freshness = getFreshness(node.last_seen);
                const risk = riskMap[node.node_id];
                const riskBadge = getRiskBadge(risk);
                
                return (
                  <Link href={`/nodes/${node.node_id}`} key={node.id}>
                    <div className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-100 hover:border-gray-200 mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-sm text-blue-600">{node.name}</h3>
                          <p className="text-xs text-gray-500">{node.location_name} • ID: {node.node_id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${freshness.color}`}>
                            {freshness.label}
                          </span>
                        </div>
                      </div>

                      {/* Intelligence & Calibration Indicators */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5 text-xs">
                        <span className={`px-2 py-0.5 rounded border font-medium ${riskBadge.color}`}>
                          {riskBadge.label}
                        </span>

                        {risk?.status === 'CALIBRATION_REQUIRED' && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Sliders className="h-3 w-3" />
                            CALIBRATION REQ.
                          </span>
                        )}

                        {risk?.model.status === 'MODEL_UNAVAILABLE' && (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                            <Cpu className="h-3 w-3 text-gray-400" />
                            MODEL UNAVAILABLE
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column - Map & Data */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-[400px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Live Deployment Map</h2>
            <div className="bg-blue-50 flex-1 rounded-lg border border-blue-100 relative overflow-hidden">
               <Map nodes={nodes} getFreshness={getFreshness} />
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Latest Environmental Readings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {nodes.map(node => {
                const r = readings[node.node_id];
                if (!r) return null;
                return (
                  <div key={node.node_id} className="border border-gray-100 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-sm mb-3 truncate">{node.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><Droplets className="h-3 w-3" /> Water Dist</span>
                        <span className="font-medium">{r.water_distance_cm} cm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><Activity className="h-3 w-3" /> Rain Sensor</span>
                        <span className="font-medium">{r.rain_sensor_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><CloudRain className="h-3 w-3" /> Rain Tips</span>
                        <span className="font-medium">{r.rain_gauge_tips}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><Activity className="h-3 w-3" /> Soil Moisture</span>
                        <span className="font-medium">{r.soil_moisture_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temp</span>
                        <span className="font-medium">{r.temperature_c}&deg;C</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1"><Droplets className="h-3 w-3" /> Humidity</span>
                        <span className="font-medium">{r.humidity_pct}%</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-400">Last Updated</span>
                        <span className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
