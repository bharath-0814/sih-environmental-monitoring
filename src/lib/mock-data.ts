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

import { RiskAssessment } from '@/types';

export const mockRiskAssessments: Record<string, RiskAssessment> = {
  'node-01': {
    nodeId: 'node-01',
    timestamp: new Date().toISOString(),
    riskLevel: 'UNKNOWN',
    riskScore: null,
    confidence: null,
    status: 'CALIBRATION_REQUIRED',
    contributors: ['Awaiting physical mounting height and reference survey'],
    model: {
      modelName: 'EdgeImpulse-FloodSentinel-v0',
      modelVersion: 'unassigned',
      riskLevel: 'UNKNOWN',
      score: null,
      confidence: null,
      inferenceTimestamp: null,
      featuresUsed: [],
      status: 'MODEL_UNAVAILABLE'
    },
    dataQuality: {
      isValid: true,
      flags: ['VALID'],
      details: [],
      readingAgeSeconds: 12
    },
    calibration: {
      nodeId: 'node-01',
      sensorMountHeightCm: null,
      referenceWaterDistanceCm: null,
      rainGaugeTipVolumeMm: null,
      soilDryAdc: null,
      soilWetAdc: null,
      isCalibrated: false
    },
    calibratedValues: {
      waterLevelCm: null,
      rainfallMm: null,
      soilMoisturePct: null,
      status: 'CALIBRATION_REQUIRED'
    },
    features: {
      waterDistanceDelta: -0.2,
      waterDistanceRatePerMin: -1.2,
      rainTipDelta: 0,
      rainTipRatePerMin: 0,
      soilMoistureDelta: 0,
      temperatureDelta: 0.1,
      humidityDelta: -0.5,
      rollingAverages: {
        waterDistanceCm: 15.2,
        rainSensorRaw: 4095,
        soilMoistureRaw: 2048,
        temperatureC: 28.5,
        humidityPct: 65
      },
      readingAgeSeconds: 12,
      samplesInWindow: 5
    }
  },
  'node-02': {
    nodeId: 'node-02',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    riskLevel: 'UNKNOWN',
    riskScore: null,
    confidence: null,
    status: 'SENSOR_DATA_STALE',
    contributors: ['Reading is stale (3600s old > 300s limit)'],
    model: {
      modelName: 'EdgeImpulse-FloodSentinel-v0',
      modelVersion: 'unassigned',
      riskLevel: 'UNKNOWN',
      score: null,
      confidence: null,
      inferenceTimestamp: null,
      featuresUsed: [],
      status: 'MODEL_UNAVAILABLE'
    },
    dataQuality: {
      isValid: true,
      flags: ['STALE_READING'],
      details: ['Reading is stale (3600s old)'],
      readingAgeSeconds: 3600
    },
    calibration: {
      nodeId: 'node-02',
      sensorMountHeightCm: null,
      referenceWaterDistanceCm: null,
      rainGaugeTipVolumeMm: null,
      soilDryAdc: null,
      soilWetAdc: null,
      isCalibrated: false
    },
    calibratedValues: {
      waterLevelCm: null,
      rainfallMm: null,
      soilMoisturePct: null,
      status: 'CALIBRATION_REQUIRED'
    },
    features: {
      waterDistanceDelta: null,
      waterDistanceRatePerMin: null,
      rainTipDelta: null,
      rainTipRatePerMin: null,
      soilMoistureDelta: null,
      temperatureDelta: null,
      humidityDelta: null,
      rollingAverages: {
        waterDistanceCm: 120.0,
        rainSensorRaw: 4095,
        soilMoistureRaw: 800,
        temperatureC: 32.1,
        humidityPct: 40
      },
      readingAgeSeconds: 3600,
      samplesInWindow: 1
    }
  },
  'node-03': {
    nodeId: 'node-03',
    timestamp: new Date().toISOString(),
    riskLevel: 'UNKNOWN',
    riskScore: null,
    confidence: null,
    status: 'CALIBRATION_REQUIRED',
    contributors: [],
    model: {
      modelName: 'EdgeImpulse-FloodSentinel-v0',
      modelVersion: 'unassigned',
      riskLevel: 'UNKNOWN',
      score: null,
      confidence: null,
      inferenceTimestamp: null,
      featuresUsed: [],
      status: 'MODEL_UNAVAILABLE'
    },
    dataQuality: {
      isValid: true,
      flags: ['VALID'],
      details: [],
      readingAgeSeconds: 5
    },
    calibration: {
      nodeId: 'node-03',
      sensorMountHeightCm: null,
      referenceWaterDistanceCm: null,
      rainGaugeTipVolumeMm: null,
      soilDryAdc: null,
      soilWetAdc: null,
      isCalibrated: false
    },
    calibratedValues: {
      waterLevelCm: null,
      rainfallMm: null,
      soilMoisturePct: null,
      status: 'CALIBRATION_REQUIRED'
    },
    features: {
      waterDistanceDelta: -1.5,
      waterDistanceRatePerMin: -6.0,
      rainTipDelta: 10,
      rainTipRatePerMin: 40,
      soilMoistureDelta: 200,
      temperatureDelta: -0.5,
      humidityDelta: 3,
      rollingAverages: {
        waterDistanceCm: 2.5,
        rainSensorRaw: 500,
        soilMoistureRaw: 3800,
        temperatureC: 24.0,
        humidityPct: 95
      },
      readingAgeSeconds: 5,
      samplesInWindow: 8
    }
  }
};

import { OperationalEvent } from '@/types';

export const mockEvents: OperationalEvent[] = [
  {
    id: 1,
    node_id: 'node-01',
    event_type: 'WATER_TREND_CHANGE',
    severity: 'info',
    title: 'Water Distance Trend Stable',
    description: 'Minor water distance fluctuation within ±0.2 cm/min normal variance.',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    created_at: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: 2,
    node_id: 'node-03',
    event_type: 'RAIN_ACTIVITY_CHANGE',
    severity: 'warning',
    title: 'High Rain Gauge Activity Active',
    description: 'Rain gauge tipping rate observed at 40 tips/min during active storm event.',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 3,
    node_id: 'node-02',
    event_type: 'NODE_BECAME_STALE',
    severity: 'warning',
    title: 'Node Telemetry Stale',
    description: 'No telemetry packets received for over 3600 seconds.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 4,
    node_id: 'node-01',
    event_type: 'READING_RECEIVED',
    severity: 'info',
    title: 'Telemetry Packet Ingested',
    description: 'Standard 6-channel sensor packet processed and verified.',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    created_at: new Date(Date.now() - 10000).toISOString()
  }
];

export function getMockTimeSeriesReadings(nodeId: string, count: number = 15): SensorReading[] {
  const base = mockReadings[nodeId] || mockReadings['node-01'];
  const results: SensorReading[] = [];
  const now = Date.now();
  const stepMs = 60000; // 1 min apart

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * stepMs).toISOString();
    // deterministic small drift for realistic charts
    const offset = Math.sin(i / 2) * 0.5;
    results.push({
      id: 1000 + i,
      node_id: nodeId,
      timestamp: t,
      water_distance_cm: Number((base.water_distance_cm + offset).toFixed(2)),
      rain_sensor_raw: base.rain_sensor_raw,
      rain_gauge_tips: Math.max(0, base.rain_gauge_tips + (count - 1 - i)),
      soil_moisture_raw: base.soil_moisture_raw,
      temperature_c: Number((base.temperature_c + (i % 3) * 0.1).toFixed(2)),
      humidity_pct: Number((base.humidity_pct + (i % 2) * 0.5).toFixed(2)),
      created_at: t
    });
  }

  return results;
}

