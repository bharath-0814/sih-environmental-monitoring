import { db } from './db';
import { CanonicalSensorData } from '@/types';

// Alert Rule Abstraction
export interface AlertRule {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  evaluate: (data: CanonicalSensorData) => boolean;
  message: (data: CanonicalSensorData) => string;
}

// CONFIGURATION REQUIRED: Flood thresholds and actual physics calibration 
// should be provided by the hardware/science team.
export const rules: AlertRule[] = [
  {
    id: 'rule-sensor-error-water',
    name: 'Invalid Water Distance',
    severity: 'warning',
    evaluate: (data) => data.waterDistanceCm < 0 || data.waterDistanceCm > 1000,
    message: (data) => `Anomalous water distance reading detected (${data.waterDistanceCm} cm). Possible sensor malfunction.`,
  },
  {
    id: 'rule-extreme-temp',
    name: 'Extreme Temperature',
    severity: 'warning',
    evaluate: (data) => data.temperatureC < -10 || data.temperatureC > 60,
    message: (data) => `Temperature is outside normal operating range (${data.temperatureC}°C).`,
  }
];

export async function evaluateAndTriggerAlerts(nodeId: string, data: CanonicalSensorData) {
  for (const rule of rules) {
    if (rule.evaluate(data)) {
      // Deduplication: Check if there's already an unresolved alert of this type for this node
      const existing = await db.execute({
        sql: 'SELECT id FROM alerts WHERE node_id = ? AND title = ? AND resolved = 0 LIMIT 1',
        args: [nodeId, rule.name]
      });

      if (existing.rows.length === 0) {
        await db.execute({
          sql: 'INSERT INTO alerts (node_id, severity, title, message) VALUES (?, ?, ?, ?)',
          args: [nodeId, rule.severity, rule.name, rule.message(data)]
        });
      }
    }
  }
}
