import { NodeCalibration, CalibratedValues, SensorReading } from '@/types';

/**
 * In-memory or database-backed calibration store for sensor nodes.
 * By default, all parameters are unset (null) indicating calibration is required.
 */
const nodeCalibrationRegistry: Record<string, Partial<NodeCalibration>> = {};

/**
 * Retrieves the calibration profile for a node.
 * Unconfigured fields explicitly return null.
 */
export function getNodeCalibration(nodeId: string): NodeCalibration {
  const profile = nodeCalibrationRegistry[nodeId] || {};
  
  const sensorMountHeightCm = profile.sensorMountHeightCm ?? null;
  const referenceWaterDistanceCm = profile.referenceWaterDistanceCm ?? null;
  const rainGaugeTipVolumeMm = profile.rainGaugeTipVolumeMm ?? null;
  const soilDryAdc = profile.soilDryAdc ?? null;
  const soilWetAdc = profile.soilWetAdc ?? null;

  // A node is considered calibrated only if key physical mounting geometry is supplied
  const isCalibrated = sensorMountHeightCm !== null;

  return {
    nodeId,
    sensorMountHeightCm,
    referenceWaterDistanceCm,
    rainGaugeTipVolumeMm,
    soilDryAdc,
    soilWetAdc,
    isCalibrated,
  };
}

/**
 * Updates or registers calibration parameters for a node.
 */
export function setNodeCalibration(nodeId: string, calibration: Partial<NodeCalibration>): NodeCalibration {
  nodeCalibrationRegistry[nodeId] = {
    ...nodeCalibrationRegistry[nodeId],
    ...calibration,
    nodeId,
  };
  return getNodeCalibration(nodeId);
}

/**
 * Translates raw sensor readings into calibrated physical engineering units
 * ONLY when valid calibration parameters exist.
 */
export function calculateCalibratedValues(
  reading: SensorReading | null,
  calibration: NodeCalibration
): CalibratedValues {
  if (!reading) {
    return {
      waterLevelCm: null,
      rainfallMm: null,
      soilMoisturePct: null,
      status: 'CALIBRATION_REQUIRED',
    };
  }

  // 1. Water Level (calculated as mount height - measured distance)
  let waterLevelCm: number | null = null;
  if (calibration.sensorMountHeightCm != null && reading.water_distance_cm != null) {
    waterLevelCm = Math.max(0, Number((calibration.sensorMountHeightCm - reading.water_distance_cm).toFixed(2)));
  }

  // 2. Rainfall in mm (tips * volume_per_tip_mm)
  let rainfallMm: number | null = null;
  if (calibration.rainGaugeTipVolumeMm != null && reading.rain_gauge_tips != null) {
    rainfallMm = Number((reading.rain_gauge_tips * calibration.rainGaugeTipVolumeMm).toFixed(2));
  }

  // 3. Soil Moisture % (calibrated against dry/wet ADC endpoints)
  let soilMoisturePct: number | null = null;
  if (
    calibration.soilDryAdc != null &&
    calibration.soilWetAdc != null &&
    calibration.soilDryAdc !== calibration.soilWetAdc &&
    reading.soil_moisture_raw != null
  ) {
    // Standard soil resistive/capacitive ADC where dry has high ADC and saturated wet has low ADC (or vice-versa)
    const span = calibration.soilDryAdc - calibration.soilWetAdc;
    const normalized = (calibration.soilDryAdc - reading.soil_moisture_raw) / span;
    soilMoisturePct = Math.max(0, Math.min(100, Number((normalized * 100).toFixed(1))));
  }

  const status = calibration.isCalibrated ? 'CALIBRATED' : 'CALIBRATION_REQUIRED';

  return {
    waterLevelCm,
    rainfallMm,
    soilMoisturePct,
    status,
  };
}