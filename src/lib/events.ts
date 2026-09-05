import { db, ensureDbInitialized } from './db';
import { 
  OperationalEvent, 
  EventType, 
  AlertSeverity, 
  SensorReading, 
  DerivedFeatures, 
  DataQualityReport, 
  RiskAssessment 
} from '@/types';

/**
 * Records an operational event with deduplication for state-based observations.
 */
export async function recordOperationalEvent(event: {
  node_id: string;
  event_type: EventType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp?: string;
  metadata?: string | null;
}): Promise<boolean> {
  await ensureDbInitialized();

  const timestamp = event.timestamp || new Date().toISOString();

  // Deduplication: Check if an identical event occurred recently (< 5 minutes) for this node
  // to avoid spamming the operational timeline on continuous identical states.
  if (event.event_type !== 'READING_RECEIVED') {
    const recentDuplicate = await db.execute({
      sql: `SELECT id FROM events 
            WHERE node_id = ? AND event_type = ? AND title = ? 
            AND datetime(timestamp) >= datetime(?, '-5 minutes')
            LIMIT 1`,
      args: [event.node_id, event.event_type, event.title, timestamp]
    });

    if (recentDuplicate.rows.length > 0) {
      return false; // Deduplicated
    }
  }

  await db.execute({
    sql: `INSERT INTO events (node_id, event_type, severity, title, description, timestamp, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      event.node_id,
      event.event_type,
      event.severity,
      event.title,
      event.description,
      timestamp,
      event.metadata || null
    ]
  });

  return true;
}

/**
 * Evaluates operational state transitions, trend shifts, and data quality triggers
 * to generate meaningful timeline events.
 */
export async function evaluateOperationalEvents(
  nodeId: string,
  currentReading: SensorReading,
  features: DerivedFeatures,
  dataQuality: DataQualityReport,
  riskAssessment: RiskAssessment
): Promise<void> {
  // 1. Water Distance Trend Event
  if (features.waterDistanceRatePerMin !== null) {
    if (features.waterDistanceRatePerMin <= -2.0) {
      await recordOperationalEvent({
        node_id: nodeId,
        event_type: 'WATER_TREND_CHANGE',
        severity: 'warning',
        title: 'Rapid Water Distance Decrease',
        description: `Water distance decreasing at rate of ${features.waterDistanceRatePerMin} cm/min (Δ${features.waterDistanceDelta} cm)`,
        timestamp: currentReading.timestamp,
      });
    } else if (features.waterDistanceRatePerMin >= 2.0) {
      await recordOperationalEvent({
        node_id: nodeId,
        event_type: 'WATER_TREND_CHANGE',
        severity: 'info',
        title: 'Rapid Water Distance Increase',
        description: `Water distance increasing at rate of ${features.waterDistanceRatePerMin} cm/min (Δ${features.waterDistanceDelta} cm)`,
        timestamp: currentReading.timestamp,
      });
    }
  }

  // 2. Rain Activity Event
  if (features.rainTipRatePerMin !== null && features.rainTipRatePerMin > 0) {
    await recordOperationalEvent({
      node_id: nodeId,
      event_type: 'RAIN_ACTIVITY_CHANGE',
      severity: 'info',
      title: 'Rain Gauge Activity Active',
      description: `Rain gauge tipping rate observed at ${features.rainTipRatePerMin} tips/min`,
      timestamp: currentReading.timestamp,
    });
  }

  // 3. Data Quality Event
  if (!dataQuality.isValid) {
    await recordOperationalEvent({
      node_id: nodeId,
      event_type: 'DATA_QUALITY',
      severity: 'warning',
      title: `Data Quality Flag: ${dataQuality.flags.join(', ')}`,
      description: dataQuality.details.join('; '),
      timestamp: currentReading.timestamp,
    });
  }

  // 4. Risk State Level Observation
  if (riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'WARNING') {
    await recordOperationalEvent({
      node_id: nodeId,
      event_type: 'RISK_STATE_CHANGE',
      severity: riskAssessment.riskLevel === 'CRITICAL' ? 'critical' : 'warning',
      title: `Elevated Risk State: ${riskAssessment.riskLevel}`,
      description: riskAssessment.contributors.join(', ') || `Risk assessment elevated to ${riskAssessment.riskLevel}`,
      timestamp: currentReading.timestamp,
    });
  }
}

/**
 * Retrieves events with flexible filtering.
 */
export async function getEvents(options?: {
  nodeId?: string;
  eventType?: EventType;
  limit?: number;
  from?: string;
  to?: string;
}): Promise<OperationalEvent[]> {
  await ensureDbInitialized();

  let sql = 'SELECT * FROM events';
  const conditions: string[] = [];
  const args: any[] = [];

  if (options?.nodeId) {
    conditions.push('node_id = ?');
    args.push(options.nodeId);
  }

  if (options?.eventType) {
    conditions.push('event_type = ?');
    args.push(options.eventType);
  }

  if (options?.from) {
    conditions.push('timestamp >= ?');
    args.push(options.from);
  }

  if (options?.to) {
    conditions.push('timestamp <= ?');
    args.push(options.to);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  args.push(options?.limit || 50);

  const result = await db.execute({ sql, args });
  return (result.rows as unknown) as OperationalEvent[];
}
