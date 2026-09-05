import { SensorReading, DataQualityReport, DataQualityFlag } from '@/types';

/**
 * Evaluates the data quality and physical plausibility of sensor readings
 * independently of ML models or threshold assumptions.
 */
export function evaluateDataQuality(readings: SensorReading[], now: number = Date.now()): DataQualityReport {
  const flags: DataQualityFlag[] = [];
  const details: string[] = [];

  if (!readings || readings.length === 0) {
    return {
      isValid: false,
      flags: ['MISSING_REQUIRED_FIELDS'],
      details: ['No readings available for node'],
      readingAgeSeconds: null,
    };
  }

  const latest = readings[0];
  const readingTime = new Date(latest.timestamp).getTime();
  const readingAgeSeconds = Math.max(0, Math.round((now - readingTime) / 1000));

  // 1. Check for Future Timestamp (> 60s ahead)
  if (readingTime - now > 60000) {
    flags.push('FUTURE_TIMESTAMP');
    details.push(`Timestamp is ${Math.round((readingTime - now) / 1000)}s in the future`);
  }

  // 2. Check for Stale Readings (> 300s / 5m)
  if (readingAgeSeconds > 300) {
    flags.push('STALE_READING');
    details.push(`Reading is stale (${readingAgeSeconds}s old > 300s limit)`);
  }

  // 3. Check for Non-Finite / Out-of-Bounds Physical Values
  const numericFields: Array<{ name: string; val: number; min: number; max: number }> = [
    { name: 'water_distance_cm', val: latest.water_distance_cm, min: 0, max: 2000 },
    { name: 'rain_sensor_raw', val: latest.rain_sensor_raw, min: 0, max: 4095 },
    { name: 'soil_moisture_raw', val: latest.soil_moisture_raw, min: 0, max: 4095 },
    { name: 'temperature_c', val: latest.temperature_c, min: -40, max: 85 },
    { name: 'humidity_pct', val: latest.humidity_pct, min: 0, max: 100 },
  ];

  for (const f of numericFields) {
    if (f.val === undefined || f.val === null || isNaN(f.val) || !isFinite(f.val)) {
      if (!flags.includes('NON_FINITE_VALUE')) flags.push('NON_FINITE_VALUE');
      details.push(`Field '${f.name}' has non-finite value: ${f.val}`);
    } else if (f.val < f.min || f.val > f.max) {
      if (!flags.includes('NON_FINITE_VALUE')) flags.push('NON_FINITE_VALUE');
      details.push(`Field '${f.name}' out of physical sensor range (${f.val} outside [${f.min}, ${f.max}])`);
    }
  }

  // 4. Check for Suspicious Impossible Jumps (>= 2 readings)
  if (readings.length >= 2) {
    const prev = readings[1];
    const prevTime = new Date(prev.timestamp).getTime();
    const dtSeconds = Math.max(1, (readingTime - prevTime) / 1000);

    // Water distance jump > 200cm in less than 60s
    if (dtSeconds <= 60 && Math.abs(latest.water_distance_cm - prev.water_distance_cm) > 200) {
      flags.push('SUSPICIOUS_JUMP');
      details.push(`Impossible rapid jump in water distance: Δ${Math.abs(latest.water_distance_cm - prev.water_distance_cm)}cm in ${dtSeconds}s`);
    }
  }

  // 5. Check for Stuck Sensor (>= 4 consecutive identical readings across all analog channels)
  if (readings.length >= 4) {
    const window = readings.slice(0, 4);
    const allSameWater = window.every(r => r.water_distance_cm === latest.water_distance_cm);
    const allSameSoil = window.every(r => r.soil_moisture_raw === latest.soil_moisture_raw);
    const allSameTemp = window.every(r => r.temperature_c === latest.temperature_c);

    // If timestamps are distinct but ADC and distance values are completely frozen
    const distinctTimestamps = new Set(window.map(r => r.timestamp)).size >= 2;
    if (distinctTimestamps && allSameWater && allSameSoil && allSameTemp) {
      flags.push('STUCK_SENSOR');
      details.push(`Suspicious frozen sensor readings detected across 4 consecutive samples (${latest.water_distance_cm}cm, ${latest.soil_moisture_raw} ADC, ${latest.temperature_c}°C)`);
    }
  }

  const isValid = flags.length === 0 || (flags.length === 1 && flags[0] === 'STALE_READING');

  if (flags.length === 0) {
    flags.push('VALID');
  }

  return {
    isValid,
    flags,
    details,
    readingAgeSeconds,
  };
}