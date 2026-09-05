"use client";

import { useEffect, useState, use } from 'react';
import { getNodeDetails } from '@/services/api';
import { SensorNode, SensorReading } from '@/types';
import { ArrowLeft, Activity, Droplets, Thermometer, CloudRain } from 'lucide-react';
import Link from 'next/link';

import { CONFIG } from '@/lib/config';

export default function NodeDetails({ params }: { params: Promise<{ nodeId: string }> }) {
  const resolvedParams = use(params);
  const nodeId = resolvedParams.nodeId;
  const [node, setNode] = useState<SensorNode | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getNodeDetails(nodeId);
        setNode(data.node);
        setReadings(data.readings);
      } catch (error) {
        console.error("Failed to load node details", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [nodeId]);

  if (loading) return <div className="p-10 text-center">Loading Node Details...</div>;
  if (!node) return <div className="p-10 text-center text-red-500">Node not found</div>;

  const latestReading = readings[0];

  const getFreshness = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 30000) return { label: 'LIVE', color: 'bg-green-100 text-green-700' };
    if (diff < 300000) return { label: 'STALE', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OFFLINE', color: 'bg-gray-100 text-gray-700' };
  };

  const freshness = getFreshness(node.last_seen);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Command Center
        </Link>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{node.name}</h1>
              <p className="text-gray-500">{node.location_name} • ID: {node.node_id}</p>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${freshness.color}`}>
              {freshness.label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Latitude</span>
              <span className="font-medium">{node.latitude}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Longitude</span>
              <span className="font-medium">{node.longitude}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Last Seen</span>
              <span className="font-medium">{new Date(node.last_seen).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Installed</span>
              <span className="font-medium">{new Date(node.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {latestReading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Droplets className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Water Distance</p>
                <p className="text-xl font-bold">{latestReading.water_distance_cm} cm</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Soil Moisture (Raw)</p>
                <p className="text-xl font-bold">{latestReading.soil_moisture_raw}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <CloudRain className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Rain Gauge Tips</p>
                <p className="text-xl font-bold">{latestReading.rain_gauge_tips}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <Thermometer className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Temperature</p>
                <p className="text-xl font-bold">{latestReading.temperature_c}&deg;C</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <CloudRain className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Rain Sensor (Raw)</p>
                <p className="text-xl font-bold">{latestReading.rain_sensor_raw}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-teal-100 text-teal-600 rounded-lg">
                <Droplets className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Humidity</p>
                <p className="text-xl font-bold">{latestReading.humidity_pct}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Historical Readings (Recent)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Water Dist. (cm)</th>
                  <th className="px-4 py-3">Rain (Raw/Tips)</th>
                  <th className="px-4 py-3">Soil (Raw)</th>
                  <th className="px-4 py-3">Temp/Humidity</th>
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-3">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{r.water_distance_cm}</td>
                    <td className="px-4 py-3">{r.rain_sensor_raw} / {r.rain_gauge_tips}</td>
                    <td className="px-4 py-3">{r.soil_moisture_raw}</td>
                    <td className="px-4 py-3">{r.temperature_c}&deg;C / {r.humidity_pct}%</td>
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
