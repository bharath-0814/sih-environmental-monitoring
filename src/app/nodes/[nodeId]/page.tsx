"use client";

import { useEffect, useState, use } from 'react';
import { getNodeDetails, getNodeRiskAssessment, getNodeEvents } from '@/services/api';
import { SensorNode, SensorReading, RiskAssessment, OperationalEvent, TimeRangeOption } from '@/types';
import { 
  ArrowLeft, 
  Activity, 
  Droplets, 
  Thermometer, 
  CloudRain, 
  Cpu, 
  ShieldAlert, 
  Sliders, 
  Radio, 
  Clock, 
  MapPin, 
  Gauge 
} from 'lucide-react';
import Link from 'next/link';
import TelemetryCharts from '@/components/TelemetryCharts';
import EventTimeline from '@/components/EventTimeline';
import { CONFIG } from '@/lib/config';

export default function NodeDetails({ params }: { params: Promise<{ nodeId: string }> }) {
  const resolvedParams = use(params);
  const nodeId = resolvedParams.nodeId;

  const [node, setNode] = useState<SensorNode | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('1h');
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const [details, riskData, eventData] = await Promise.all([
        getNodeDetails(nodeId, timeRange),
        getNodeRiskAssessment(nodeId).catch(() => null),
        getNodeEvents(nodeId, 25).catch(() => [])
      ]);
      setNode(details.node);
      setReadings(details.readings);
      setRisk(riskData);
      setEvents(eventData);
      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to load node details", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [nodeId, timeRange]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Node Investigation Screen...</div>;
  if (!node) return <div className="p-10 text-center text-red-500">Node not found</div>;

  // Newest reading is either readings[0] (if DESC) or readings[readings.length - 1] (if ASC)
  const latestReading = readings.length > 0 
    ? [...readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] 
    : null;

  const getFreshness = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 30000) return { label: 'LIVE', color: 'bg-green-100 text-green-700' };
    if (diff < 300000) return { label: 'STALE', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OFFLINE', color: 'bg-gray-100 text-gray-700' };
  };

  const freshness = getFreshness(node.last_seen);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Command Center
          </Link>
          <div className="text-xs text-gray-500 font-mono">
            Auto-refresh active (5s) • Last sync: {lastSync.toLocaleTimeString()}
          </div>
        </div>

        {/* 1. TOP INVESTIGATION & OPERATIONAL STATUS HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900">{node.name}</h1>
                <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded border border-gray-200">
                  ID: {node.node_id}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                {node.location_name} • Coordinates: {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
              </p>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 text-xs rounded-full font-semibold ${freshness.color}`}>
                {freshness.label}
              </span>
              <span className={`px-3 py-1 text-xs rounded-full font-semibold border ${
                risk?.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' :
                risk?.riskLevel === 'WARNING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                risk?.riskLevel === 'WATCH' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                risk?.riskLevel === 'NORMAL' ? 'bg-green-100 text-green-800 border-green-300' :
                'bg-gray-100 text-gray-700 border-gray-300'
              }`}>
                RISK: {risk ? risk.riskLevel : 'UNKNOWN'}
              </span>
              <span className="px-3 py-1 text-xs rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                {risk?.calibration.isCalibrated ? 'CALIBRATED' : 'CALIBRATION REQUIRED'}
              </span>
            </div>
          </div>

          {/* Operational Metadata Bar */}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-400 uppercase tracking-wider block mb-1">Operational State</span>
              <span className="font-semibold text-gray-800 uppercase">{node.status}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider block mb-1">Last Seen</span>
              <span className="font-mono text-gray-700">{new Date(node.last_seen).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider block mb-1">Model Engine</span>
              <span className="font-mono text-gray-700">{risk?.model.modelName || 'EdgeImpulse'} ({risk?.model.status || 'UNAVAILABLE'})</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider block mb-1">Station Deployed</span>
              <span className="font-mono text-gray-700">{new Date(node.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* 2. CURRENT RAW TELEMETRY GAUGES */}
        {latestReading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Droplets className="h-3.5 w-3.5 text-blue-600" /> Water Distance</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.water_distance_cm} <span className="text-xs font-normal text-gray-500">cm</span></p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">RAW TRANSDUCER</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Activity className="h-3.5 w-3.5 text-green-600" /> Soil Moisture</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.soil_moisture_raw} <span className="text-xs font-normal text-gray-500">ADC</span></p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">RAW [0-4095]</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><CloudRain className="h-3.5 w-3.5 text-purple-600" /> Rain Tips</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.rain_gauge_tips} <span className="text-xs font-normal text-gray-500">tips</span></p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">BUCKET COUNTER</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><CloudRain className="h-3.5 w-3.5 text-indigo-600" /> Rain Sensor</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.rain_sensor_raw} <span className="text-xs font-normal text-gray-500">ADC</span></p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">ANALOG RAW</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Thermometer className="h-3.5 w-3.5 text-red-500" /> Temperature</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.temperature_c}&deg;C</p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">CALIBRATED IC</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Droplets className="h-3.5 w-3.5 text-teal-600" /> Humidity</span>
              <p className="text-lg font-bold font-mono text-gray-900">{latestReading.humidity_pct}%</p>
              <span className="text-[10px] text-gray-400 uppercase font-mono mt-1 block">RELATIVE %</span>
            </div>
          </div>
        )}

        {/* 3. TIME RANGE SELECTOR BAR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Historical Analytics Window</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            {(['15m', '1h', '6h', '24h'] as TimeRangeOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === r 
                    ? 'bg-white text-blue-700 shadow-xs font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === '15m' ? 'Last 15m' : r === '1h' ? 'Last 1h' : r === '6h' ? 'Last 6h' : 'Last 24h'}
              </button>
            ))}
          </div>
        </div>

        {/* 4. INTERACTIVE RECHARTS TIME-SERIES CHARTS */}
        <TelemetryCharts readings={readings} />

        {/* 5. DERIVED FEATURES & RISK INTELLIGENCE PANEL */}
        {risk && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Assessment & Model State */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  Operational Risk Intelligence
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-mono uppercase rounded border ${
                  risk.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' :
                  risk.riskLevel === 'WARNING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  risk.riskLevel === 'WATCH' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  risk.riskLevel === 'NORMAL' ? 'bg-green-100 text-green-800 border-green-300' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {risk.riskLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs mb-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-400 block mb-1 uppercase">Assessment State</span>
                  <span className="font-semibold text-gray-800 font-mono">{risk.status}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-400 block mb-1 uppercase">AI Risk Score</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {risk.riskScore !== null ? `${(risk.riskScore * 100).toFixed(0)}%` : 'N/A (No model loaded)'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-400 block mb-1 uppercase">Model Confidence</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {risk.confidence !== null ? `${(risk.confidence * 100).toFixed(0)}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-400 block mb-1 uppercase">Data Quality Flags</span>
                  <span className="font-semibold text-blue-700 font-mono">{risk.dataQuality.flags.join(', ')}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contributing Factors & Quality Events
                </h3>
                {risk.contributors.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No adverse risk triggers or sensor anomalies detected.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {risk.contributors.map((c, i) => (
                      <li key={i} className="p-2 bg-amber-50 text-amber-900 rounded border border-amber-200">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Derived Features (Calculated without Conversion Assumptions) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Derived Rate & Time-Series Features
                </h2>
                <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                  DERIVED
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Water Distance Delta (Δ)</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {risk.features.waterDistanceDelta !== null ? `${risk.features.waterDistanceDelta} cm` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Water Distance Rate / Minute</span>
                  <span className="font-mono font-semibold text-blue-700">
                    {risk.features.waterDistanceRatePerMin !== null ? `${risk.features.waterDistanceRatePerMin} cm/min` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Rain Gauge Tip Rate / Minute</span>
                  <span className="font-mono font-semibold text-purple-700">
                    {risk.features.rainTipRatePerMin !== null ? `${risk.features.rainTipRatePerMin} tips/min` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Soil Moisture Raw Delta (Δ)</span>
                  <span className="font-mono font-semibold text-green-700">
                    {risk.features.soilMoistureDelta !== null ? `${risk.features.soilMoistureDelta} ADC` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Temperature Delta (Δ)</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {risk.features.temperatureDelta !== null ? `${risk.features.temperatureDelta}°C` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Sample Window Count</span>
                  <span className="font-mono font-semibold text-gray-700">
                    {risk.features.samplesInWindow} samples (Age: {risk.features.readingAgeSeconds}s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. OPERATIONAL EVENT TIMELINE */}
        <EventTimeline events={events} title={`Operational Event Timeline (${node.name})`} />

        {/* 7. RAW READINGS LOG (INSPECTION TABLE) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">Raw Telemetry Packet Log</h2>
            <span className="text-xs text-gray-400 font-mono">Showing recent samples in window</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-mono">
                <tr>
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Water Dist (cm)</th>
                  <th className="px-3.5 py-2.5">Rain Raw</th>
                  <th className="px-3.5 py-2.5">Rain Tips</th>
                  <th className="px-3.5 py-2.5">Soil (Raw ADC)</th>
                  <th className="px-3.5 py-2.5">Temp (°C)</th>
                  <th className="px-3.5 py-2.5">Humidity (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {readings.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-3.5 py-2.5 text-gray-600">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-3.5 py-2.5 font-bold text-blue-700">{r.water_distance_cm}</td>
                    <td className="px-3.5 py-2.5 text-gray-700">{r.rain_sensor_raw}</td>
                    <td className="px-3.5 py-2.5 text-purple-700 font-medium">{r.rain_gauge_tips}</td>
                    <td className="px-3.5 py-2.5 text-green-700">{r.soil_moisture_raw}</td>
                    <td className="px-3.5 py-2.5 text-gray-700">{r.temperature_c}</td>
                    <td className="px-3.5 py-2.5 text-gray-700">{r.humidity_pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
