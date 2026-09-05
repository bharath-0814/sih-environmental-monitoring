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

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: number;
  node_id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  created_at: string;
  resolved: boolean;
  status?: AlertStatus;
}

// ==========================================
// RISK & INTELLIGENCE FOUNDATION CONTRACTS
// ==========================================

export type RiskLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export type AssessmentStatus = 
  | 'READY' 
  | 'CALIBRATION_REQUIRED' 
  | 'INSUFFICIENT_DATA' 
  | 'MODEL_UNAVAILABLE' 
  | 'SENSOR_DATA_STALE';

export type DataQualityFlag = 
  | 'VALID' 
  | 'NON_FINITE_VALUE' 
  | 'STALE_READING' 
  | 'FUTURE_TIMESTAMP' 
  | 'SUSPICIOUS_JUMP' 
  | 'STUCK_SENSOR' 
  | 'MISSING_REQUIRED_FIELDS';

export interface DataQualityReport {
  isValid: boolean;
  flags: DataQualityFlag[];
  details: string[];
  readingAgeSeconds: number | null;
}

export interface DerivedFeatures {
  waterDistanceDelta: number | null;          // cm change from previous reading
  waterDistanceRatePerMin: number | null;     // cm / minute
  rainTipDelta: number | null;                // tip delta from previous reading
  rainTipRatePerMin: number | null;           // tips / minute
  soilMoistureDelta: number | null;           // raw ADC delta from previous reading
  temperatureDelta: number | null;            // °C delta from previous reading
  humidityDelta: number | null;               // % delta from previous reading
  rollingAverages: {
    waterDistanceCm: number | null;
    rainSensorRaw: number | null;
    soilMoistureRaw: number | null;
    temperatureC: number | null;
    humidityPct: number | null;
  };
  readingAgeSeconds: number;
  samplesInWindow: number;
}

export interface NodeCalibration {
  nodeId: string;
  sensorMountHeightCm: number | null;
  referenceWaterDistanceCm: number | null;
  rainGaugeTipVolumeMm: number | null;
  soilDryAdc: number | null;
  soilWetAdc: number | null;
  isCalibrated: boolean;
}

export interface CalibratedValues {
  waterLevelCm: number | null;          // only if sensorMountHeightCm is configured
  rainfallMm: number | null;            // only if rainGaugeTipVolumeMm is configured
  soilMoisturePct: number | null;       // only if soilDryAdc and soilWetAdc are configured
  status: 'CALIBRATED' | 'CALIBRATION_REQUIRED';
}

export interface HazardRule {
  id: string;
  name: string;
  hazardType: 'FLOOD' | 'DATA_QUALITY' | 'SENSOR_MALFUNCTION' | 'ENVIRONMENTAL';
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number | string;
  severity: AlertSeverity;
  enabled: boolean;
  description: string;
}

export interface RiskModelOutput {
  modelName: string;
  modelVersion: string;
  riskLevel: RiskLevel;
  score: number | null;               // Must remain null if no model output
  confidence: number | null;          // Must remain null if no model output
  inferenceTimestamp: string | null;
  featuresUsed: string[];
  status: 'READY' | 'MODEL_UNAVAILABLE' | 'INSUFFICIENT_DATA';
}

export interface AnomalyReport {
  isAnomaly: boolean;
  anomalyScore: number | null;
  detectedAt: string | null;
  description: string | null;
  status: 'UNAVAILABLE' | 'NORMAL' | 'ANOMALY_DETECTED';
}

export interface RiskAssessment {
  nodeId: string;
  timestamp: string;
  riskLevel: RiskLevel;
  riskScore: number | null;           // null unless a real model produces it
  confidence: number | null;          // null unless a real model produces it
  status: AssessmentStatus;
  contributors: string[];
  model: RiskModelOutput;
  dataQuality: DataQualityReport;
  calibration: NodeCalibration;
  calibratedValues: CalibratedValues;
  features: DerivedFeatures;
  anomaly?: AnomalyReport;
}
