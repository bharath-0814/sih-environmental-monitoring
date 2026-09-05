import { SensorNode, SensorReading, Alert } from '@/types';

export const mockNodes: SensorNode[] = [
  {
    id: 1,
    node_id: 'node-01',
    name: 'River Station Alpha',
    location_name: 'Main Bridge',
    latitude: 28.6139,
    longitude: 77.2090,
    status: 'active',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    node_id: 'node-02',
    name: 'Farm Soil Monitor',
    location_name: 'Sector 5 Agriculture',
    latitude: 28.6200,
    longitude: 77.2150,
    status: 'warning',
    last_seen: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 3,
    node_id: 'node-03',
    name: 'Lowland Flood Sensor',
    location_name: 'Valley Base',
    latitude: 28.6100,
    longitude: 77.2000,
    status: 'critical',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export const mockReadings: Record<string, SensorReading> = {
  'node-01': {
    id: 1,
    node_id: 'node-01',
    timestamp: new Date().toISOString(),
    water_distance_cm: 15.2,
    rain_sensor_raw: 4095,
    rain_gauge_tips: 0,
    soil_moisture_raw: 2048,
    temperature_c: 28.5,
    humidity_pct: 65,
    created_at: new Date().toISOString()
  },
  'node-02': {
    id: 2,
    node_id: 'node-02',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    water_distance_cm: 120.0,
    rain_sensor_raw: 4095,
    rain_gauge_tips: 0,
    soil_moisture_raw: 800, // Dry
    temperature_c: 32.1,
    humidity_pct: 40,
    created_at: new Date().toISOString()
  },
  'node-03': {
    id: 3,
    node_id: 'node-03',
    timestamp: new Date().toISOString(),
    water_distance_cm: 2.5, // Dangerously high water level
    rain_sensor_raw: 500, // Heavy rain
    rain_gauge_tips: 150,
    soil_moisture_raw: 3800, // Very wet
    temperature_c: 24.0,
    humidity_pct: 95,
    created_at: new Date().toISOString()
  }
};

export const mockAlerts: Alert[] = [
  {
    id: 1,
    node_id: 'node-03',
    severity: 'critical',
    title: 'High Water Level',
    message: 'Water distance has reached a critically low threshold (2.5cm). Flood risk is imminent.',
    created_at: new Date().toISOString(),
    resolved: false
  },
  {
    id: 2,
    node_id: 'node-02',
    severity: 'warning',
    title: 'Low Soil Moisture',
    message: 'Soil moisture is extremely low, indicating drought stress conditions.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    resolved: false
  }
];
