import { 
  SensorReading, 
  RiskAssessment, 
  RiskLevel, 
  AssessmentStatus, 
} from '@/types';
import { calculateFeatures } from './features';
import { evaluateDataQuality } from './data-quality';
import { getNodeCalibration, calculateCalibratedValues } from './calibration';
import { evaluateHazardRules } from './hazard-rules';
import { defaultModelProvider, defaultAnomalyDetector } from './ai-provider';
import { db, ensureDbInitialized } from './db';

/**
 * Computes a comprehensive, multi-layer risk assessment for a given node.
 * Fuses Data Quality, Configured Deterministic Rules, Edge AI Model outputs, and Anomaly Detection.
 * 
 * Strict Constraint: If no legitimate ML model or calibration exists,
 * riskScore and confidence remain NULL and status indicates CALIBRATION_REQUIRED or MODEL_UNAVAILABLE.
 */
export async function assessNodeRisk(
  nodeId: string, 
  providedReadings?: SensorReading[], 
  now: number = Date.now()
): Promise<RiskAssessment> {
  await ensureDbInitialized();

  let readings = providedReadings;

  // If readings not provided in-memory, fetch from Turso/libSQL
  if (!readings) {
    const result = await db.execute({
      sql: `SELECT * FROM sensor_readings WHERE node_id = ? ORDER BY timestamp DESC LIMIT 20`,
      args: [nodeId]
    });
    readings = (result.rows as unknown) as SensorReading[];
  }

  const latestReading = readings.length > 0 ? readings[0] : null;
  const timestamp = latestReading ? latestReading.timestamp : new Date(now).toISOString();

  // 1. Layer 1: Feature Engineering
  const features = calculateFeatures(readings, now);

  // 2. Layer 2: Deterministic Data Quality & Sensor Health
  const dataQuality = evaluateDataQuality(readings, now);

  // 3. Layer 3: Calibration & Geometry Mapping
  const calibration = getNodeCalibration(nodeId);
  const calibratedValues = calculateCalibratedValues(latestReading, calibration);

  // 4. Layer 4: Configurable Safety / Hazard Rules
  const triggeredRules = evaluateHazardRules(latestReading, features, dataQuality, calibratedValues);

  // 5. Layer 5: Edge AI Model Inference
  const modelOutput = await defaultModelProvider.infer(features, readings);

  // 6. Layer 6: Statistical / ML Anomaly Detection
  const anomalyReport = await defaultAnomalyDetector.detect(features, readings);

  // 7. Multi-Layer Risk Fusion & Precedence Logic
  const contributors: string[] = [];

  // Track data quality issues
  if (!dataQuality.isValid) {
    contributors.push(...dataQuality.details);
  }

  // Track triggered safety rules
  for (const tr of triggeredRules) {
    contributors.push(`[${tr.rule.severity.toUpperCase()}] ${tr.message}`);
  }

  // Determine Assessment Status
  let status: AssessmentStatus = 'READY';

  if (readings.length === 0) {
    status = 'INSUFFICIENT_DATA';
  } else if (dataQuality.flags.includes('STALE_READING')) {
    status = 'SENSOR_DATA_STALE';
  } else if (!dataQuality.isValid) {
    status = 'INSUFFICIENT_DATA';
  } else if (!calibration.isCalibrated) {
    status = 'CALIBRATION_REQUIRED';
  } else if (modelOutput.status === 'MODEL_UNAVAILABLE') {
    status = 'MODEL_UNAVAILABLE';
  }

  // Determine Risk Level according to explicit precedence:
  // Precedence 1: Critical triggered safety rule
  // Precedence 2: Warning triggered safety rule
  // Precedence 3: Edge AI Model result (if model is READY)
  // Precedence 4: Fallback to UNKNOWN if uncalibrated or data quality failed, else NORMAL
  let riskLevel: RiskLevel = 'UNKNOWN';
  let riskScore: number | null = null;
  let confidence: number | null = null;

  const hasCriticalRule = triggeredRules.some(r => r.rule.severity === 'critical');
  const hasWarningRule = triggeredRules.some(r => r.rule.severity === 'warning');

  if (hasCriticalRule) {
    riskLevel = 'CRITICAL';
    riskScore = 1.0;
    confidence = 1.0;
  } else if (hasWarningRule) {
    riskLevel = 'WARNING';
    riskScore = 0.7;
    confidence = 0.9;
  } else if (modelOutput.status === 'READY' && modelOutput.riskLevel !== 'UNKNOWN') {
    riskLevel = modelOutput.riskLevel;
    riskScore = modelOutput.score;
    confidence = modelOutput.confidence;
  } else {
    // Honest baseline state when no model and no rules trigger
    if (readings.length === 0 || !dataQuality.isValid || !calibration.isCalibrated) {
      riskLevel = 'UNKNOWN';
      riskScore = null;
      confidence = null;
    } else {
      riskLevel = 'NORMAL';
      riskScore = null;
      confidence = null;
    }
  }

  return {
    nodeId,
    timestamp,
    riskLevel,
    riskScore,
    confidence,
    status,
    contributors,
    model: modelOutput,
    dataQuality,
    calibration,
    calibratedValues,
    features,
    anomaly: anomalyReport,
  };
}
