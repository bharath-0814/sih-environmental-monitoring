import { DerivedFeatures, SensorReading, RiskModelOutput, AnomalyReport } from '@/types';

/**
 * Interface for Edge AI / ML model providers (e.g. Edge Impulse trained models).
 */
export interface RiskModelProvider {
  name: string;
  version: string;
  infer(features: DerivedFeatures, readings: SensorReading[]): Promise<RiskModelOutput>;
}

/**
 * Default Edge Impulse Model Provider.
 * Currently returns MODEL_UNAVAILABLE with null score and confidence
 * to guarantee honest reporting until model training is provided.
 */
export class EdgeImpulseProvider implements RiskModelProvider {
  name = 'EdgeImpulse-FloodSentinel-v0';
  version = 'unassigned';

  async infer(features: DerivedFeatures, readings: SensorReading[]): Promise<RiskModelOutput> {
    // Model inference integration point for Edge Impulse WebAssembly / C++ port
    return {
      modelName: this.name,
      modelVersion: this.version,
      riskLevel: 'UNKNOWN',
      score: null,
      confidence: null,
      inferenceTimestamp: null,
      featuresUsed: [
        'water_distance_rate_per_min',
        'rain_tip_rate_per_min',
        'soil_moisture_raw',
        'temperature_c',
      ],
      status: 'MODEL_UNAVAILABLE',
    };
  }
}

/**
 * Interface for software-side statistical / ML anomaly detection.
 */
export interface AnomalyDetector {
  name: string;
  detect(features: DerivedFeatures, readings: SensorReading[]): Promise<AnomalyReport>;
}

/**
 * Baseline Anomaly Detector stub.
 */
export class BaselineAnomalyDetector implements AnomalyDetector {
  name = 'Statistical-ZScore-Detector';

  async detect(features: DerivedFeatures, readings: SensorReading[]): Promise<AnomalyReport> {
    return {
      isAnomaly: false,
      anomalyScore: null,
      detectedAt: null,
      description: null,
      status: 'UNAVAILABLE',
    };
  }
}

export const defaultModelProvider = new EdgeImpulseProvider();
export const defaultAnomalyDetector = new BaselineAnomalyDetector();
