import { recordOperationalEvent, evaluateOperationalEvents, getEvents } from './src/lib/events';
import { ensureDbInitialized, db } from './src/lib/db';
import { SensorReading, DerivedFeatures, DataQualityReport, RiskAssessment } from './src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL]: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS]: ${message}`);
  }
}

async function runAnalyticsTests() {
  console.log('\n=============================================');
  console.log('RUNNING SENTINEL ANALYTICS & EVENT TESTS');
  console.log('=============================================\n');

  await ensureDbInitialized();

  const testNodeId = 'test-node-analytics';
  
  // Ensure test node exists for foreign key constraint
  await db.execute({
    sql: `INSERT OR IGNORE INTO sensor_nodes (node_id, name, location_name, latitude, longitude, status)
          VALUES (?, 'Test Node Analytics', 'Test Lab', 28.5, 77.1, 'active')`,
    args: [testNodeId]
  });

  // Clean test events for isolation
  await db.execute({
    sql: "DELETE FROM events WHERE node_id = ?",
    args: [testNodeId]
  });

  const now = new Date();

  // ----------------------------------------------------
  // TEST 1: Record Operational Event & Deduplication
  // ----------------------------------------------------
  console.log('--- TEST 1: Event Recording & Deduplication ---');
  
  const recordedFirst = await recordOperationalEvent({
    node_id: testNodeId,
    event_type: 'WATER_TREND_CHANGE',
    severity: 'warning',
    title: 'Rapid Water Distance Decrease',
    description: 'Water distance decreasing rapidly',
    timestamp: now.toISOString(),
  });
  assert(recordedFirst === true, 'First event was recorded successfully');

  // Attempt duplicate record within 5-min window
  const recordedDuplicate = await recordOperationalEvent({
    node_id: testNodeId,
    event_type: 'WATER_TREND_CHANGE',
    severity: 'warning',
    title: 'Rapid Water Distance Decrease',
    description: 'Water distance decreasing rapidly (duplicate)',
    timestamp: new Date(now.getTime() + 10000).toISOString(),
  });
  assert(recordedDuplicate === false, 'Duplicate event within 5-min cooldown was deduplicated');

  // Record a different event type on same node
  const recordedDifferent = await recordOperationalEvent({
    node_id: testNodeId,
    event_type: 'RAIN_ACTIVITY_CHANGE',
    severity: 'info',
    title: 'Rain Gauge Activity Active',
    description: 'Tipping detected',
    timestamp: new Date(now.getTime() + 15000).toISOString(),
  });
  assert(recordedDifferent === true, 'Different event type was recorded successfully');

  // ----------------------------------------------------
  // TEST 2: evaluateOperationalEvents Triggers
  // ----------------------------------------------------
  console.log('\n--- TEST 2: evaluateOperationalEvents Triggers ---');

  const testReading: SensorReading = {
    id: 999,
    node_id: testNodeId,
    timestamp: new Date(now.getTime() + 20000).toISOString(),
    water_distance_cm: 35.0,
    rain_sensor_raw: 3500,
    rain_gauge_tips: 10,
    soil_moisture_raw: 2000,
    temperature_c: 29.0,
    humidity_pct: 75.0,
    created_at: new Date(now.getTime() + 20000).toISOString(),
  };

  const testFeatures: DerivedFeatures = {
    waterDistanceDelta: -5.0,
    waterDistanceRatePerMin: -2.5,
    rainTipDelta: 4,
    rainTipRatePerMin: 2.0,
    soilMoistureDelta: 0,
    temperatureDelta: 0,
    humidityDelta: 0,
    rollingAverages: {
      waterDistanceCm: 35.0,
      rainSensorRaw: 3500,
      soilMoistureRaw: 2000,
      temperatureC: 29.0,
      humidityPct: 75.0,
    },
    readingAgeSeconds: 20,
    samplesInWindow: 5,
  };

  const testDataQuality: DataQualityReport = {
    isValid: false,
    flags: ['SUSPICIOUS_JUMP'],
    details: ['Water distance delta exceeds reasonable physical bounds'],
    readingAgeSeconds: 20,
  };

  const testRisk: RiskAssessment = {
    nodeId: testNodeId,
    timestamp: testReading.timestamp,
    riskLevel: 'CRITICAL',
    riskScore: null,
    confidence: null,
    status: 'READY',
    contributors: ['Rapid water level rise detected', 'Heavy precipitation active'],
    model: {
      modelName: 'EdgeImpulse-Mock',
      modelVersion: 'v0',
      riskLevel: 'UNKNOWN',
      score: null,
      confidence: null,
      inferenceTimestamp: null,
      featuresUsed: [],
      status: 'MODEL_UNAVAILABLE',
    },
    dataQuality: testDataQuality,
    calibration: {
      nodeId: testNodeId,
      sensorMountHeightCm: null,
      referenceWaterDistanceCm: null,
      rainGaugeTipVolumeMm: null,
      soilDryAdc: null,
      soilWetAdc: null,
      isCalibrated: false,
    },
    calibratedValues: {
      waterLevelCm: null,
      rainfallMm: null,
      soilMoisturePct: null,
      status: 'CALIBRATION_REQUIRED',
    },
    features: testFeatures,
  };

  await evaluateOperationalEvents(testNodeId, testReading, testFeatures, testDataQuality, testRisk);

  // ----------------------------------------------------
  // TEST 3: Query & Filter Events
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Query & Filter Events ---');

  const allNodeEvents = await getEvents({ nodeId: testNodeId, limit: 10 });
  assert(allNodeEvents.length >= 3, `Retrieved ${allNodeEvents.length} events for test node (expected >= 3)`);

  const dataQualityEvents = await getEvents({ nodeId: testNodeId, eventType: 'DATA_QUALITY' });
  assert(dataQualityEvents.length >= 1, `Retrieved DATA_QUALITY events: count = ${dataQualityEvents.length}`);
  assert(dataQualityEvents[0].title.includes('SUSPICIOUS_JUMP'), 'DATA_QUALITY event title contains flag name');

  const riskEvents = await getEvents({ nodeId: testNodeId, eventType: 'RISK_STATE_CHANGE' });
  assert(riskEvents.length >= 1, `Retrieved RISK_STATE_CHANGE events: count = ${riskEvents.length}`);
  assert(riskEvents[0].severity === 'critical', 'RISK_STATE_CHANGE event severity is critical');

  // Clean up
  await db.execute({ sql: "DELETE FROM events WHERE node_id = ?", args: [testNodeId] });
  await db.execute({ sql: "DELETE FROM sensor_nodes WHERE node_id = ?", args: [testNodeId] });

  console.log('\n=============================================');
  console.log('ALL SENTINEL ANALYTICS TESTS PASSED!');
  console.log('=============================================\n');
}

runAnalyticsTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
