import {
  Alert,
  AlertLifecycleStatus,
  Attack,
  AttackEvent,
  DashboardStats,
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let detail = `Request failed with status ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) {
        detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse<DashboardStats>(res);
}

export async function fetchAlerts(statusFilter?: string, limit: number = 100): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  params.append('limit', limit.toString());
  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
  return handleResponse<Alert[]>(res);
}

export async function fetchAlert(alertId: number): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`);
  return handleResponse<Alert>(res);
}

export async function fetchAttack(attackId: number): Promise<Attack> {
  const res = await fetch(`${API_BASE}/attacks/${attackId}`);
  return handleResponse<Attack>(res);
}

export async function fetchAttackEvents(
  attackId: number,
  skip: number = 0,
  limit: number = 50
): Promise<AttackEvent[]> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const res = await fetch(`${API_BASE}/attacks/${attackId}/events?${params.toString()}`);
  return handleResponse<AttackEvent[]>(res);
}

export async function updateAlertStatus(
  alertId: number,
  status: AlertLifecycleStatus
): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse<Alert>(res);
}
