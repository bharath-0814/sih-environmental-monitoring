'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { SensorReading } from '@/types';
import { Droplets, CloudRain, Activity, Thermometer } from 'lucide-react';

interface TelemetryChartsProps {
  readings: SensorReading[];
}

export default function TelemetryCharts({ readings }: TelemetryChartsProps) {
  if (!readings || readings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <Activity className="h-10 w-10 mx-auto text-gray-300 mb-2" />
        <p className="font-medium text-sm">No historical readings in selected range</p>
        <p className="text-xs text-gray-400 mt-1">Awaiting new telemetry packets from sensor node.</p>
      </div>
    );
  }

  // Format data chronological for time axis (ASC)
  const chartData = [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(r => ({
      timestamp: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rawTime: r.timestamp,
      water_distance_cm: r.water_distance_cm,
      rain_sensor_raw: r.rain_sensor_raw,
      rain_gauge_tips: r.rain_gauge_tips,
      soil_moisture_raw: r.soil_moisture_raw,
      temperature_c: r.temperature_c,
      humidity_pct: r.humidity_pct,
    }));

  return (
    <div className="space-y-6">
      {/* 1. Water Distance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-600" />
            Water Distance Time-Series (RAW)
          </h3>
          <span className="text-xs text-gray-500 font-mono">Distance to Surface (cm)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit=" cm" />
              <Tooltip 
                formatter={(val: any) => [`${val} cm`, 'Water Distance']} 
                labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
              />
              <Area 
                type="monotone" 
                dataKey="water_distance_cm" 
                stroke="#2563eb" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#waterGrad)" 
                dot={{ r: 3, fill: '#2563eb' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Dual Grid: Rain & Soil Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rain Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-purple-600" />
              Rain Gauge Tips & Analog Rain Sensor
            </h3>
            <span className="text-xs text-gray-500 font-mono">Tips (cnt) / Sensor (ADC)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 4095]} />
                <Tooltip 
                  labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line yAxisId="left" type="stepAfter" dataKey="rain_gauge_tips" name="Gauge Tips (cnt)" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="rain_sensor_raw" name="Rain Raw (ADC)" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              Soil Moisture Raw (ADC)
            </h3>
            <span className="text-xs text-gray-500 font-mono">Raw ADC [0-4095]</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 4095]} />
                <Tooltip 
                  formatter={(val: any) => [`${val} ADC`, 'Soil Moisture Raw']} 
                  labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="soil_moisture_raw" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#soilGrad)" dot={{ r: 3, fill: '#16a34a' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Temperature & Humidity Multi-Line */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            Ambient Atmosphere (Temperature & Humidity)
          </h3>
          <span className="text-xs text-gray-500 font-mono">°C & % RH</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="temp" tick={{ fontSize: 11 }} unit="°C" domain={['auto', 'auto']} />
              <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip 
                labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Line yAxisId="temp" type="monotone" dataKey="temperature_c" name="Temperature (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="hum" type="monotone" dataKey="humidity_pct" name="Humidity (% RH)" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
