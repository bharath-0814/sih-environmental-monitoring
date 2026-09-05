export interface SensorPayload {
  node_id?: string;

  // camelCase (old format)
  waterDistance?: number;
  rainSensor?: number;
  rainGaugeTips?: number;
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;

  // snake_case (current ESP32 format)
  water_distance?: number;
  rain_sensor?: number;
  rain_tips?: number;
  soil_moisture?: number;
}

export interface CanonicalSensorData {
  waterDistanceCm: number;
  rainSensorRaw: number;
  rainGaugeTips: number;
  soilMoistureRaw: number;
  temperatureC: number;
  humidityPct: number;
}

export interface SensorNode {
  id: number;
  node_id: string;
  name: string;
  location_name: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'warning' | 'critical';
  last_seen: string;
  created_at: string;
}

export interface SensorReading {
  id: number;
  node_id: string;
  timestamp: string;
  water_distance_cm: number;
  rain_sensor_raw: number;
  rain_gauge_tips: number;
  soil_moisture_raw: number;
  temperature_c: number;
  humidity_pct: number;
  created_at: string;
}

export interface Alert {
  id: number;
  node_id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  created_at: string;
  resolved: boolean;
}
