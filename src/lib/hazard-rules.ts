import { HazardRule, SensorReading, DerivedFeatures, DataQualityReport, CalibratedValues } from '@/types';

/**
 * Configurable hazard rules registry.
 * Physical flood thresholds remain explicitly disabled until sensor mounting
 * geometry and riverbed survey calibration are configured.
 */
export const hazardRulesRegistry: HazardRule[] = [
  // 1. Data-Quality & Hardware Malfunction Rules (ACTIVE)
  {
    id: 'rule-sensor-error-water',
    name: 'Invalid Water Distance',
    hazardType: 'SENSOR_MALFUNCTION',
    field: 'waterDistanceCm',
    operator: '<',
    threshold: 0,
    severity: 'warning',
    enabled: true,
    description: 'Anomalous water distance reading below 0cm indicates transducer failure or acoustic echo loss.',
  },
  {
    id: 'rule-extreme-temp',
    name: 'Extreme Operating Temperature',
    hazardType: 'ENVIRONMENTAL',
    field: 'temperatureC',
    operator: '>',
    threshold: 60,
    severity: 'warning',
    enabled: true,
    description: 'Ambient node temperature exceeded 60°C.',
  },
  {
    id: 'rule-rapid-rate-of-rise',
    name: 'Rapid Water Rise Rate',
    hazardType: 'FLOOD',
    field: 'waterDistanceRatePerMin',
    operator: '<',
    threshold: -10, // distance decreasing rapidly by > 10 cm/min
    severity: 'warning',
    enabled: true,
    description: 'Rate of distance decrease exceeds 10 cm/min, indicating rapid surge.',
  },

  // 2. Physical Flood Hazard Rules (CONFIGURATION REQUIRED / DISABLED BY DEFAULT)
  {
    id: 'rule-flood-critical-stage',
    name: 'Critical Flood Inundation Threshold',
    hazardType: 'FLOOD',
    field: 'waterLevelCm',
    operator: '>=',
    threshold: 0, // Unconfigured
    severity: 'critical',
    enabled: false, // Disabled: Awaiting hardware calibration
    description: 'CONFIGURATION REQUIRED: River water level reached critical embankment crest elevation.',
  },
  {
    id: 'rule-flood-warning-stage',
    name: 'Warning Flood Stage',
    hazardType: 'FLOOD',
    field: 'waterLevelCm',
    operator: '>=',
    threshold: 0, // Unconfigured
    severity: 'warning',
    enabled: false, // Disabled: Awaiting hardware calibration
    description: 'CONFIGURATION REQUIRED: River water level reached warning stage threshold.',
  },
];

export interface TriggeredRule {
  rule: HazardRule;
  message: string;
  actualValue: any;
}

/**
 * Evaluates enabled hazard rules against latest reading, derived features, and calibrated values.
 */
export function evaluateHazardRules(
  reading: SensorReading | null,
  features: DerivedFeatures,
  dataQuality: DataQualityReport,
  calibrated: CalibratedValues
): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];
  if (!reading) return triggered;

  for (const rule of hazardRulesRegistry) {
    if (!rule.enabled) continue;

    let valueToTest: any = null;

    if (rule.field === 'waterDistanceCm') valueToTest = reading.water_distance_cm;
    else if (rule.field === 'temperatureC') valueToTest = reading.temperature_c;
    else if (rule.field === 'waterDistanceRatePerMin') valueToTest = features.waterDistanceRatePerMin;
    else if (rule.field === 'waterLevelCm') valueToTest = calibrated.waterLevelCm;
    else if (rule.field === 'rainfallMm') valueToTest = calibrated.rainfallMm;

    if (valueToTest === null || valueToTest === undefined) continue;

    let matched = false;
    const thresh = Number(rule.threshold);

    switch (rule.operator) {
      case '>':
        matched = valueToTest > thresh;
        break;
      case '<':
        matched = valueToTest < thresh;
        break;
      case '>=':
        matched = valueToTest >= thresh;
        break;
      case '<=':
        matched = valueToTest <= thresh;
        break;
      case '==':
        matched = valueToTest === thresh;
        break;
      case '!=':
        matched = valueToTest !== thresh;
        break;
    }

    if (matched) {
      triggered.push({
        rule,
        message: `${rule.name}: current ${rule.field} = ${valueToTest} (${rule.operator} ${rule.threshold})`,
        actualValue: valueToTest,
      });
    }
  }

  return triggered;
}