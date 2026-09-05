import { SensorNode, SensorReading, Alert, RiskAssessment, OperationalEvent, TimeRangeOption } from '@/types';
import { mockNodes, mockReadings, mockAlerts, mockRiskAssessments, mockEvents, getMockTimeSeriesReadings } from '@/lib/mock-data';

// Toggle this to use the real backend once Turso is set up
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_DATA_MODE === 'mock';

export interface LatestTelemetryState {
  nodes: SensorNode[];
  readings: Record<string, SensorReading>;
}

export async function getLatestTelemetry(): Promise<LatestTelemetryState> {
  if (USE_MOCK_DATA) {
    return {
      nodes: mockNodes,
      readings: mockReadings,
    };
  }
  const res = await fetch('/api/sensors/latest');
  if (!res.ok) throw new Error('Failed to fetch latest telemetry');
  const json = await res.json();
  const rawData: any[] = json.data || [];

  const nodes: SensorNode[] = rawData.map((r: any) => ({
    id: r.id,
    node_id: r.node_id,
    name: r.name,
    location_name: r.location_name,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
    last_seen: r.last_seen,
    created_at: r.created_at,
  }));

  const readings: Record<string, SensorReading> = {};
  rawData.forEach((r: any) => {
    readings[r.node_id] = r;
  });

  return { nodes, readings };
}

export async function getNodes(): Promise<SensorNode[]> {
  const { nodes } = await getLatestTelemetry();
  return nodes;
}

export async function getLatestReadings(): Promise<Record<string, SensorReading>> {
  const { readings } = await getLatestTelemetry();
  return readings;
}

export async function getNodeDetails(nodeId: string, range?: TimeRangeOption): Promise<{ node: SensorNode, readings: SensorReading[] }> {
  if (USE_MOCK_DATA) {
    const node = mockNodes.find(n => n.node_id === nodeId);
    if (!node) throw new Error('Node not found');
    const count = range === '15m' ? 15 : range === '1h' ? 30 : range === '6h' ? 60 : 100;
    const readings = getMockTimeSeriesReadings(nodeId, count);
    return { node, readings };
  }
  const queryParam = range ? `range=${range}` : 'limit=50';
  const res = await fetch(`/api/sensors/${nodeId}?${queryParam}`);
  if (!res.ok) throw new Error('Failed to fetch node details');
  return res.json();
}

export async function getAlerts(): Promise<Alert[]> {
  if (USE_MOCK_DATA) {
    return mockAlerts.filter(a => !a.resolved);
  }
  const res = await fetch('/api/alerts?resolved=false');
  if (!res.ok) throw new Error('Failed to fetch alerts');
  const json = await res.json();
  return json.data;
}

export async function resolveAlert(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  await fetch(`/api/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolved: true })
  });
}

export async function getRiskAssessments(): Promise<Record<string, RiskAssessment>> {
  if (USE_MOCK_DATA) {
    return mockRiskAssessments;
  }
  const res = await fetch('/api/risk');
  if (!res.ok) throw new Error('Failed to fetch risk assessments');
  const json = await res.json();
  const map: Record<string, RiskAssessment> = {};
  (json.data || []).forEach((assessment: RiskAssessment) => {
    map[assessment.nodeId] = assessment;
  });
  return map;
}

export async function getNodeRiskAssessment(nodeId: string): Promise<RiskAssessment> {
  if (USE_MOCK_DATA) {
    const assessment = mockRiskAssessments[nodeId];
    if (assessment) return assessment;
    throw new Error('Node risk assessment not found');
  }
  const res = await fetch(`/api/risk/${nodeId}`);
  if (!res.ok) throw new Error('Failed to fetch node risk assessment');
  const json = await res.json();
  return json.assessment;
}

export async function getEvents(limit: number = 20): Promise<OperationalEvent[]> {
  if (USE_MOCK_DATA) {
    return mockEvents.slice(0, limit);
  }
  const res = await fetch(`/api/events?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch operational events');
  const json = await res.json();
  return json.data;
}

export async function getNodeEvents(nodeId: string, limit: number = 20): Promise<OperationalEvent[]> {
  if (USE_MOCK_DATA) {
    return mockEvents.filter(e => e.node_id === nodeId).slice(0, limit);
  }
  const res = await fetch(`/api/events/${nodeId}?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch node operational events');
  const json = await res.json();
  return json.data;
}
