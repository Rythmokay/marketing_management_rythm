import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { PasswordInput } from '../components/ui/PasswordInput';
import { useAuthStore, useIsAdmin } from '../store/authStore';
import { apiErrorMessage, initialsOf, memberName, teamApi, type HistoryEntry, type TeamMember, type TeamRole } from '../api/teamApi';
import { formatDate, timeAgo } from '../utils/time';

const MIN_PASSWORD = 6;

const initials = (m: TeamMember) => initialsOf(memberName(m));

const RoleBadge: React.FC<{ role: TeamRole }> = ({ role }) =>
  role === 'ADMIN'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-violet-50 text-violet-800 border-violet-200"><ShieldCheck className="w-3 h-3" aria-hidden />Admin</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">Team member</span>;

const RoleChoice: React.FC<{ value: TeamRole; onChange: (r: TeamRole) => void }> = ({ value, onChange }) => (
  <fieldset>
    <legend className="field-label">Role</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {([
        ['EMPLOYEE', 'Team member', 'Views and edits everything in the portal.'],
        ['ADMIN', 'Admin', 'Also adds/removes members and sets passwords.'],
      ] as const).map(([role, label, hint]) => (
        <label key={role} className={`flex gap-2.5 items-start rounded-lg border p-3 cursor-pointer ${value === role ? 'border-blue-600 bg-blue-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
          <input type="radio" name="role" className="mt-0.5" checked={value === role} onChange={() => onChange(role)} />
          <span>
            <span className="block text-sm font-semibold text-slate-900">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

const ErrorNote: React.FC<{ message: string | null }> = ({ message }) =>
  message ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{message}</p> : null;

const PasswordFields: React.FC<{ password: string; confirm: string; setPassword: (v: string) => void; setConfirm: (v: string) => void; label?: string }> = ({ password, confirm, setPassword, setConfirm, label = 'Password' }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className="field-label" htmlFor="pw">{label}</label>
      <PasswordInput id="pw" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
      <p className="text-[11px] text-slate-500 mt-1">At least {MIN_PASSWORD} characters.</p>
    </div>
    <div>
      <label className="field-label" htmlFor="pw2">Confirm password</label>
      <PasswordInput id="pw2" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
    </div>
  </div>
);

const passwordProblem = (password: string, confirm: string) =>
  password.length < MIN_PASSWORD ? `Password must be at least ${MIN_PASSWORD} characters.`
    : password !== confirm ? "The two passwords don't match." : null;

const AddMemberModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<TeamRole>('EMPLOYEE');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = !username.trim() ? 'Enter a username they will sign in with.' : passwordProblem(password, confirm);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      await teamApi.createMember({ username: username.trim(), fullName: fullName.trim(), password, role });
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the member. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add team member"
      subtitle="They sign in with this username and password. Share the password with them privately."
      onClose={onClose}
      size="lg"
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="add-member" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add member'}</button>
      </>}
    >
      <form id="add-member" onSubmit={submit} className="flex flex-col gap-4">
        <ErrorNote message={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="field-input" autoFocus value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Priya Sharma" />
          </div>
          <div>
            <label className="field-label" htmlFor="username">Username</label>
            <input id="username" className="field-input" autoComplete="off" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="e.g. priya" />
          </div>
        </div>
        <PasswordFields password={password} confirm={confirm} setPassword={setPassword} setConfirm={setConfirm} />
        <RoleChoice value={role} onChange={setRole} />
      </form>
    </Modal>
  );
};

const EditMemberModal: React.FC<{ member: TeamMember; onClose: () => void; onSaved: () => void }> = ({ member, onClose, onSaved }) => {
  const [fullName, setFullName] = useState(member.fullName || '');
  const [role, setRole] = useState<TeamRole>(member.role);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await teamApi.updateMember(member.id, { fullName: fullName.trim(), role });
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Edit ${memberName(member)}`}
      subtitle={`Username: ${member.username} (can't be changed)`}
      onClose={onClose}
      size="lg"
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="edit-member" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </>}
    >
      <form id="edit-member" onSubmit={submit} className="flex flex-col gap-4">
        <ErrorNote message={error} />
        <div>
          <label className="field-label" htmlFor="editName">Full name</label>
          <input id="editName" className="field-input" autoFocus value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <RoleChoice value={role} onChange={setRole} />
      </form>
    </Modal>
  );
};

const PasswordModal: React.FC<{ member: TeamMember; isSelf: boolean; onClose: () => void; onSaved: () => void }> = ({ member, isSelf, onClose, onSaved }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      await teamApi.changePassword(member.id, password);
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the password. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Change password for ${memberName(member)}`}
      subtitle={isSelf
        ? "You'll be signed out and need to sign in again with the new password."
        : 'They will be signed out everywhere and must sign in with the new password.'}
      onClose={onClose}
      size="lg"
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="change-pw" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
      </>}
    >
      <form id="change-pw" onSubmit={submit} className="flex flex-col gap-4">
        <ErrorNote message={error} />
        <PasswordFields password={password} confirm={confirm} setPassword={setPassword} setConfirm={setConfirm} label="New password" />
      </form>
    </Modal>
  );
};

export const TeamPage: React.FC = () => {
  const isAdmin = useIsAdmin();
  const me = useAuthStore(s => s.user?.username);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [password, setPassword] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  // Bumped after every change to reload the team and its activity
  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([teamApi.getTeam(), teamApi.getHistory()])
      .then(([members, log]) => {
        if (cancelled) return;
        setTeam(members);
        setHistory(log);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'Could not load the team. Please try again.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Each member's latest change and how many they've made (history is newest first)
  const activity = useMemo(() => {
    const map: Record<string, { last: HistoryEntry; count: number }> = {};
    history.forEach(h => {
      if (!map[h.actor]) map[h.actor] = { last: h, count: 0 };
      map[h.actor].count++;
    });
    return map;
  }, [history]);

  const admins = team.filter(m => m.role === 'ADMIN').length;

  const handleRemove = async (member: TeamMember) => {
    try {
      await teamApi.deleteMember(member.id);
      setNotice(`${memberName(member)} was removed and can no longer sign in.`);
      load();
    } catch (err) {
      setNotice(null);
      setError(apiErrorMessage(err, 'Could not remove the member.'));
    }
  };

  const memberActions = (m: TeamMember) => {
    if (!isAdmin) return null;
    const isSelf = m.username === me;
    const lastAdmin = m.role === 'ADMIN' && admins <= 1;
    const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
    return (
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        <button type="button" className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => setEditing(m)}><Pencil className="w-3.5 h-3.5" aria-hidden />Edit</button>
        <button type="button" className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => setPassword(m)}><KeyRound className="w-3.5 h-3.5" aria-hidden />Password</button>
        <button
          type="button"
          className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
          disabled={isSelf || lastAdmin}
          title={isSelf ? "You can't remove yourself" : lastAdmin ? 'The portal needs at least one admin' : undefined}
          onClick={() => setRemoving(m)}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden />Remove
        </button>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Marketing Team"
        description="Everyone who can sign in to the portal. All members can view and edit everything, and every change is recorded in History."
        actions={isAdmin && <button type="button" className="btn-primary" onClick={() => setAdding(true)}><UserPlus className="w-4 h-4" aria-hidden />Add member</button>}
      />

      {!isAdmin && (
        <p className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 mb-4">
          Only admins can add or remove members and change passwords.
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-4 flex justify-between gap-3">
          {notice}
          <button type="button" className="font-semibold cursor-pointer" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </p>
      )}
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading team…</div>
        ) : team.length === 0 ? (
          <EmptyState title="No team members yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {team.map(m => {
              const act = activity[m.username];
              return (
                <li key={m.id} className="px-5 py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_auto] gap-3 md:gap-6 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0" aria-hidden>
                      {initials(m)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">{memberName(m)}</span>
                        {m.username === me && <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">You</span>}
                        <RoleBadge role={m.role} />
                      </div>
                      <div className="text-xs text-slate-500">
                        @{m.username}{m.createdAt && <> · joined {formatDate(m.createdAt)}</>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 min-w-0">
                    {act ? (
                      <>
                        <div className="truncate" title={act.last.summary}>Last: {act.last.summary}</div>
                        <div className="text-slate-500">
                          {timeAgo(act.last.timestamp)} ·{' '}
                          <Link to={`/history?person=${encodeURIComponent(m.username)}`} className="text-blue-700 font-semibold hover:underline">
                            {act.count} change{act.count === 1 ? '' : 's'}
                          </Link>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">No changes yet</span>
                    )}
                  </div>
                  {memberActions(m)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {adding && <AddMemberModal onClose={() => setAdding(false)} onSaved={() => { setNotice('Member added. Share their username and password with them.'); load(); }} />}
      {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setNotice(`${memberName(editing)} was updated.`); load(); }} />}
      {password && (
        <PasswordModal
          member={password}
          isSelf={password.username === me}
          onClose={() => setPassword(null)}
          onSaved={() => { setNotice(`Password changed for ${memberName(password)}. They've been signed out.`); load(); }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={`Remove ${memberName(removing)}?`}
          message={<>They will be signed out and can no longer sign in. Their past changes stay in History.</>}
          confirmLabel="Remove member"
          onConfirm={() => handleRemove(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
};
