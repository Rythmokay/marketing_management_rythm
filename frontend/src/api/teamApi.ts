import { api } from './axios';

export type TeamRole = 'ADMIN' | 'EMPLOYEE' | 'DEMO';

export interface TeamMember {
  id: number;
  username: string;
  fullName?: string | null;
  role: TeamRole;
  createdAt?: string | null;
}

export interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export type HistoryAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'IMPORTED' | 'PASSWORD_CHANGED';
export type HistoryEntityType = 'INFLUENCER' | 'PRODUCT' | 'TRACKING' | 'TEAM_MEMBER';

export interface HistoryEntry {
  id: number;
  timestamp: string;
  actor: string;
  actorName: string;
  action: HistoryAction;
  entityType: HistoryEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  changes: FieldChange[];
}

/** Error message the server sent back ({ message }), or a fallback. */
export const apiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || fallback;
};

/** Up to two initials from the words of a name, ignoring brackets and symbols ("Rythm (Admin)" -> "RA"). */
export const initialsOf = (name: string) =>
  (name.match(/\p{L}[\p{L}\p{N}]*/gu) || [name]).map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const memberName = (m: Pick<TeamMember, 'fullName' | 'username'>) => (m.fullName?.trim() ? m.fullName : m.username);

export const teamApi = {
  getTeam: async (): Promise<TeamMember[]> => (await api.get<TeamMember[]>('/team')).data,

  createMember: async (member: { username: string; fullName: string; password: string; role: TeamRole }): Promise<TeamMember> =>
    (await api.post<TeamMember>('/admin/team', member)).data,

  updateMember: async (id: number, changes: { fullName?: string; role?: TeamRole }): Promise<TeamMember> =>
    (await api.put<TeamMember>(`/admin/team/${id}`, changes)).data,

  changePassword: async (id: number, password: string): Promise<void> => {
    await api.put(`/admin/team/${id}/password`, { password });
  },

  deleteMember: async (id: number): Promise<void> => {
    await api.delete(`/admin/team/${id}`);
  },

  getHistory: async (): Promise<HistoryEntry[]> => {
    const res = await api.get<(Omit<HistoryEntry, 'changes'> & { changes: string | null })[]>('/history');
    return res.data.map(h => {
      let changes: FieldChange[] = [];
      try { changes = h.changes ? JSON.parse(h.changes) : []; } catch { /* keep empty */ }
      return { ...h, changes };
    });
  }
};
