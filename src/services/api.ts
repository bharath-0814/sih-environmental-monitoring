import { SensorNode, SensorReading, Alert, RiskAssessment } from '@/types';
import { mockNodes, mockReadings, mockAlerts, mockRiskAssessments } from '@/lib/mock-data';

// Toggle this to use the real backend once Turso is set up
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_DATA_MODE === 'mock';

export async function getNodes(): Promise<SensorNode[]> {
  if (USE_MOCK_DATA) {
    return mockNodes;
  }
  const res = await fetch('/api/sensors/latest');
  if (!res.ok) throw new Error('Failed to fetch nodes');
  const data = await res.json();
  // Transform response to match SensorNode array
  return data.data;
}

export async function getLatestReadings(): Promise<Record<string, SensorReading>> {
  if (USE_MOCK_DATA) {
    return mockReadings;
  }
  const res = await fetch('/api/sensors/latest');
  if (!res.ok) throw new Error('Failed to fetch latest readings');
  const json = await res.json();
  const readings: Record<string, SensorReading> = {};
  json.data.forEach((r: any) => {
    readings[r.node_id] = r;
  });
  return readings;
}

export async function getNodeDetails(nodeId: string): Promise<{ node: SensorNode, readings: SensorReading[] }> {
  if (USE_MOCK_DATA) {
    const node = mockNodes.find(n => n.node_id === nodeId);
    if (!node) throw new Error('Node not found');
    const reading = mockReadings[nodeId];
    return { node, readings: reading ? [reading] : [] };
  }
  const res = await fetch(`/api/sensors/${nodeId}?limit=20`);
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
