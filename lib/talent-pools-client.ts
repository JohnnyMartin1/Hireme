export type TalentPool = {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  memberCount?: number;
};

export type TalentPoolMember = {
  id: string;
  poolId: string;
  companyId: string;
  candidateId: string;
  addedByUserId: string;
  addedAt?: unknown;
  notes?: string;
  tags?: string[];
};

type ApiOk<T> = { ok: true; data: T; error: null };
type ApiErr = { ok: false; data: null; error: string };

async function authed<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<ApiOk<T> | ApiErr> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { ok: false, data: null, error: String(payload?.error || "Request failed") };
  }
  return { ok: true, data: payload as T, error: null };
}

export async function fetchTalentPools(token: string) {
  return authed<{ pools: TalentPool[] }>("/api/talent-pools", token);
}

export async function createTalentPool(token: string, body: { name: string; description?: string }) {
  return authed<{ pool: TalentPool }>("/api/talent-pools", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchTalentPool(poolId: string, token: string) {
  return authed<{ pool: TalentPool; members: TalentPoolMember[] }>(
    `/api/talent-pools/${encodeURIComponent(poolId)}`,
    token
  );
}

export async function updateTalentPool(
  poolId: string,
  token: string,
  body: { name?: string; description?: string | null }
) {
  return authed<{ pool: TalentPool }>(`/api/talent-pools/${encodeURIComponent(poolId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTalentPool(poolId: string, token: string) {
  return authed<{ success: boolean }>(`/api/talent-pools/${encodeURIComponent(poolId)}`, token, {
    method: "DELETE",
  });
}

export async function addTalentPoolMember(
  poolId: string,
  token: string,
  body: { candidateId: string; notes?: string; tags?: string[] }
) {
  return authed<{ member: TalentPoolMember }>(
    `/api/talent-pools/${encodeURIComponent(poolId)}/members`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function updateTalentPoolMember(
  poolId: string,
  memberId: string,
  token: string,
  body: { notes?: string | null; tags?: string[] | null }
) {
  return authed<{ member: TalentPoolMember }>(
    `/api/talent-pools/${encodeURIComponent(poolId)}/members/${encodeURIComponent(memberId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function removeTalentPoolMember(poolId: string, memberId: string, token: string) {
  return authed<{ success: boolean }>(
    `/api/talent-pools/${encodeURIComponent(poolId)}/members/${encodeURIComponent(memberId)}`,
    token,
    { method: "DELETE" }
  );
}

export async function fetchCandidatePoolMemberships(candidateId: string, token: string) {
  return authed<{ memberships: Array<TalentPoolMember & { poolName: string }> }>(
    `/api/talent-pools/candidates/${encodeURIComponent(candidateId)}`,
    token
  );
}

export async function fetchTalentPoolActivity(token: string) {
  return authed<{ recent: TalentPoolMember[]; pools: TalentPool[] }>("/api/talent-pools/activity", token);
}

export type TalentPoolMembershipBadge = { poolId: string; poolName: string; tags?: string[] };

export async function fetchTalentPoolMembershipLookup(token: string, candidateIds: string[]) {
  return authed<{ byCandidate: Record<string, TalentPoolMembershipBadge[]> }>(
    "/api/talent-pools/membership-lookup",
    token,
    {
      method: "POST",
      body: JSON.stringify({ candidateIds }),
    }
  );
}
