import { calculateFeatures } from './src/lib/features';
import { evaluateDataQuality } from './src/lib/data-quality';
import { getNodeCalibration, setNodeCalibration, calculateCalibratedValues } from './src/lib/calibration';
import { evaluateHazardRules, hazardRulesRegistry } from './src/lib/hazard-rules';
import { assessNodeRisk } from './src/lib/risk-engine';
import { SensorReading } from './src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('RUNNING SENTINEL INTELLIGENCE UNIT TESTS');
  console.log('=============================================\n');

  const baseTime = Date.now();

  // ----------------------------------------------------
  // TEST 1: Feature Calculations with 50 -> 49 -> 47 sequence
  // ----------------------------------------------------
  console.log('--- TEST 1: Sequence 50 -> 49 -> 47 ---');
  // Order DESC by timestamp: newest is 47, then 49, then 50 (1 min apart)
  const readingsSequence: SensorReading[] = [
    {
      id: 3,
      node_id: 'test-node',
      timestamp: new Date(baseTime).toISOString(),
      water_distance_cm: 47,
      rain_sensor_raw: 4000,
      rain_gauge_tips: 5,
      soil_moisture_raw: 2000,
      temperature_c: 28.0,
      humidity_pct: 70.0,
      created_at: new Date(baseTime).toISOString(),
    },
    {
      id: 2,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 60000).toISOString(), // 1 min ago
      water_distance_cm: 49,
      rain_sensor_raw: 4000,
      rain_gauge_tips: 2,
      soil_moisture_raw: 2000,
      temperature_c: 28.0,
      humidity_pct: 70.0,
      created_at: new Date(baseTime - 60000).toISOString(),
    },
    {
      id: 1,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 120000).toISOString(), // 2 min ago
      water_distance_cm: 50,
      rain_sensor_raw: 4000,
      rain_gauge_tips: 0,
      soil_moisture_raw: 2000,
      temperature_c: 28.0,
      humidity_pct: 70.0,
      created_at: new Date(baseTime - 120000).toISOString(),
    },
  ];

  const features1 = calculateFeatures(readingsSequence, baseTime);
  assert(features1.waterDistanceDelta === -2.0, `Water distance delta between 47 and 49 is -2.0cm (got ${features1.waterDistanceDelta})`);
  assert(features1.waterDistanceRatePerMin === -2.0, `Water distance rate per min is -2.0 cm/min (got ${features1.waterDistanceRatePerMin})`);
  assert(features1.rainTipDelta === 3, `Rain tip delta is 3 tips (got ${features1.rainTipDelta})`);
  assert(features1.rainTipRatePerMin === 3.0, `Rain tip rate is 3.0 tips/min (got ${features1.rainTipRatePerMin})`);
  assert(features1.rollingAverages.waterDistanceCm === Number(((47 + 49 + 50) / 3).toFixed(2)), `Rolling average water distance is 48.67 (got ${features1.rollingAverages.waterDistanceCm})`);
  assert(features1.samplesInWindow === 3, `Samples in window is 3`);

  // ----------------------------------------------------
  // TEST 2: Repeated Readings (50 -> 50 -> 50 -> 50) & Stuck Sensor Detection
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Repeated Readings 50 -> 50 -> 50 -> 50 ---');
  const stuckReadings: SensorReading[] = [
    {
      id: 4,
      node_id: 'test-node',
      timestamp: new Date(baseTime).toISOString(),
      water_distance_cm: 50.0,
      rain_sensor_raw: 4095,
      rain_gauge_tips: 0,
      soil_moisture_raw: 1500,
      temperature_c: 25.0,
      humidity_pct: 50.0,
      created_at: new Date(baseTime).toISOString(),
    },
    {
      id: 3,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 5000).toISOString(),
      water_distance_cm: 50.0,
      rain_sensor_raw: 4095,
      rain_gauge_tips: 0,
      soil_moisture_raw: 1500,
      temperature_c: 25.0,
      humidity_pct: 50.0,
      created_at: new Date(baseTime - 5000).toISOString(),
    },
    {
      id: 2,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 10000).toISOString(),
      water_distance_cm: 50.0,
      rain_sensor_raw: 4095,
      rain_gauge_tips: 0,
      soil_moisture_raw: 1500,
      temperature_c: 25.0,
      humidity_pct: 50.0,
      created_at: new Date(baseTime - 10000).toISOString(),
    },
    {
      id: 1,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 15000).toISOString(),
      water_distance_cm: 50.0,
      rain_sensor_raw: 4095,
      rain_gauge_tips: 0,
      soil_moisture_raw: 1500,
      temperature_c: 25.0,
      humidity_pct: 50.0,
      created_at: new Date(baseTime - 15000).toISOString(),
    },
  ];

  const dqStuck = evaluateDataQuality(stuckReadings, baseTime);
  assert(dqStuck.flags.includes('STUCK_SENSOR'), 'Stuck sensor flag identified across 4 frozen samples');

  // ----------------------------------------------------
  // TEST 3: Stale Data & Out-of-Bounds Detection
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Stale Data & Out-of-Bounds Detection ---');
  const staleReadings: SensorReading[] = [
    {
      id: 1,
      node_id: 'test-node',
      timestamp: new Date(baseTime - 400000).toISOString(), // ~6.6 minutes old (> 300s)
      water_distance_cm: -5.0, // negative / out-of-bounds
      rain_sensor_raw: 5000,   // ADC > 4095 out of bounds
      rain_gauge_tips: 0,
      soil_moisture_raw: 2000,
      temperature_c: 95.0,    // extreme temperature
      humidity_pct: 120.0,    // humidity > 100%
      created_at: new Date(baseTime - 400000).toISOString(),
    }
  ];

  const dqStale = evaluateDataQuality(staleReadings, baseTime);
  assert(dqStale.flags.includes('STALE_READING'), 'Stale reading (>300s) detected');
  assert(dqStale.flags.includes('NON_FINITE_VALUE'), 'Out-of-bounds physical values detected');
  assert(!dqStale.isValid, 'Data quality marked as invalid due to out-of-bounds values');

  // ----------------------------------------------------
  // TEST 4: Calibration Calculations (Uncalibrated vs Calibrated)
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Calibration Calculations ---');
  const uncalibratedProfile = getNodeCalibration('uncalibrated-node');
  const uncalibratedResult = calculateCalibratedValues(readingsSequence[0], uncalibratedProfile);
  assert(uncalibratedResult.status === 'CALIBRATION_REQUIRED', 'Uncalibrated node reports CALIBRATION_REQUIRED');
  assert(uncalibratedResult.waterLevelCm === null, 'Uncalibrated waterLevelCm is strictly null');
  assert(uncalibratedResult.rainfallMm === null, 'Uncalibrated rainfallMm is strictly null');

  // Set calibration: mount height = 200cm, tip volume = 0.2mm/tip, soil dry=4000, wet=1000
  setNodeCalibration('calibrated-node', {
    sensorMountHeightCm: 200,
    rainGaugeTipVolumeMm: 0.2,
    soilDryAdc: 4000,
    soilWetAdc: 1000,
  });
  const calibratedProfile = getNodeCalibration('calibrated-node');
  const calibratedResult = calculateCalibratedValues(readingsSequence[0], calibratedProfile);
  assert(calibratedResult.status === 'CALIBRATED', 'Configured node reports CALIBRATED');
  assert(calibratedResult.waterLevelCm === 153.0, `Water level calculated as 200 - 47 = 153.0cm (got ${calibratedResult.waterLevelCm})`);
  assert(calibratedResult.rainfallMm === 1.0, `Rainfall calculated as 5 tips * 0.2mm = 1.0mm (got ${calibratedResult.rainfallMm})`);
  assert(calibratedResult.soilMoisturePct === 66.7, `Soil moisture calibrated correctly (got ${calibratedResult.soilMoisturePct}%)`);

  // ----------------------------------------------------
  // TEST 5: Risk Fusion Engine & No-Model State
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Risk Fusion Engine ---');
  const assessment = await assessNodeRisk('node-01', readingsSequence, baseTime);
  assert(assessment.model.status === 'MODEL_UNAVAILABLE', 'Model status reports MODEL_UNAVAILABLE');
  assert(assessment.riskScore === null, 'Risk score is strictly null when no ML model is available');
  assert(assessment.confidence === null, 'Model confidence is strictly null when no ML model is available');
  assert(assessment.status === 'CALIBRATION_REQUIRED', 'Assessment status reflects CALIBRATION_REQUIRED');

  console.log('\n=============================================');
  console.log('ALL UNIT & INTELLIGENCE TESTS PASSED! 🎉');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
