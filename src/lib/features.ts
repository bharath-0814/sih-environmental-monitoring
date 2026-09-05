import { SensorReading, DerivedFeatures } from '@/types';

/**
 * Calculates derived mathematical features from a chronological time-series
 * of sensor readings for a single node.
 * 
 * @param readings Array of SensorReading ordered DESC by timestamp (readings[0] is newest)
 * @param now Optional timestamp for reference (defaults to Date.now())
 */
export function calculateFeatures(readings: SensorReading[], now: number = Date.now()): DerivedFeatures {
  if (!readings || readings.length === 0) {
    return {
      waterDistanceDelta: null,
      waterDistanceRatePerMin: null,
      rainTipDelta: null,
      rainTipRatePerMin: null,
      soilMoistureDelta: null,
      temperatureDelta: null,
      humidityDelta: null,
      rollingAverages: {
        waterDistanceCm: null,
        rainSensorRaw: null,
        soilMoistureRaw: null,
        temperatureC: null,
        humidityPct: null,
      },
      readingAgeSeconds: 0,
      samplesInWindow: 0,
    };
  }

  const current = readings[0];
  const readingTime = new Date(current.timestamp).getTime();
  const readingAgeSeconds = Math.max(0, Math.round((now - readingTime) / 1000));

  let waterDistanceDelta: number | null = null;
  let waterDistanceRatePerMin: number | null = null;
  let rainTipDelta: number | null = null;
  let rainTipRatePerMin: number | null = null;
  let soilMoistureDelta: number | null = null;
  let temperatureDelta: number | null = null;
  let humidityDelta: number | null = null;

  if (readings.length >= 2) {
    const prev = readings[1];
    const prevTime = new Date(prev.timestamp).getTime();
    const dtSeconds = Math.max(1, (readingTime - prevTime) / 1000);
    const dtMinutes = dtSeconds / 60;

    if (current.water_distance_cm != null && prev.water_distance_cm != null) {
      waterDistanceDelta = Number((current.water_distance_cm - prev.water_distance_cm).toFixed(2));
      waterDistanceRatePerMin = Number((waterDistanceDelta / dtMinutes).toFixed(2));
    }

    if (current.rain_gauge_tips != null && prev.rain_gauge_tips != null) {
      rainTipDelta = current.rain_gauge_tips - prev.rain_gauge_tips;
      rainTipRatePerMin = Number((rainTipDelta / dtMinutes).toFixed(2));
    }

    if (current.soil_moisture_raw != null && prev.soil_moisture_raw != null) {
      soilMoistureDelta = current.soil_moisture_raw - prev.soil_moisture_raw;
    }

    if (current.temperature_c != null && prev.temperature_c != null) {
      temperatureDelta = Number((current.temperature_c - prev.temperature_c).toFixed(2));
    }

    if (current.humidity_pct != null && prev.humidity_pct != null) {
      humidityDelta = Number((current.humidity_pct - prev.humidity_pct).toFixed(2));
    }
  }

  // Calculate rolling averages across the sample window
  const count = readings.length;
  let sumWater = 0;
  let sumRain = 0;
  let sumSoil = 0;
  let sumTemp = 0;
  let sumHum = 0;

  for (const r of readings) {
    sumWater += r.water_distance_cm ?? 0;
    sumRain += r.rain_sensor_raw ?? 0;
    sumSoil += r.soil_moisture_raw ?? 0;
    sumTemp += r.temperature_c ?? 0;
    sumHum += r.humidity_pct ?? 0;
  }

  return {
    waterDistanceDelta,
    waterDistanceRatePerMin,
    rainTipDelta,
    rainTipRatePerMin,
    soilMoistureDelta,
    temperatureDelta,
    humidityDelta,
    rollingAverages: {
      waterDistanceCm: Number((sumWater / count).toFixed(2)),
      rainSensorRaw: Number((sumRain / count).toFixed(1)),
      soilMoistureRaw: Number((sumSoil / count).toFixed(1)),
      temperatureC: Number((sumTemp / count).toFixed(2)),
      humidityPct: Number((sumHum / count).toFixed(2)),
    },
    readingAgeSeconds,
    samplesInWindow: count,
  };
}