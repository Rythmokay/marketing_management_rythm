import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui/PageHeader';
import { useCrmStore } from '../store/crmStore';
import { apiErrorMessage, initialsOf, memberName, teamApi, type HistoryAction, type HistoryEntityType, type HistoryEntry, type TeamMember } from '../api/teamApi';
import { dayLabel, formatDateTime, formatTime } from '../utils/time';

const ACTIONS: Record<HistoryAction, { label: string; verb: string; className: string }> = {
  CREATED: { label: 'Added', verb: 'added', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  UPDATED: { label: 'Edited', verb: 'edited', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  DELETED: { label: 'Deleted', verb: 'deleted', className: 'bg-red-50 text-red-800 border-red-200' },
  IMPORTED: { label: 'Imported', verb: 'imported', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  PASSWORD_CHANGED: { label: 'Password', verb: 'changed a password', className: 'bg-violet-50 text-violet-800 border-violet-200' },
};

const TYPES: Record<HistoryEntityType, string> = {
  INFLUENCER: 'Influencers',
  TRACKING: 'Product tracking',
  PRODUCT: 'Products',
  TEAM_MEMBER: 'Marketing team',
};

const PAGE_SIZE = 60;
const CHANGES_SHOWN = 4;

const Value: React.FC<{ v: string; removed?: boolean }> = ({ v, removed = false }) =>
  v ? <span className={`break-words ${removed ? 'text-slate-500 line-through decoration-red-400' : 'text-slate-900'}`}>{v}</span>
    : <span className="text-slate-400 italic">empty</span>;

const Entry: React.FC<{ entry: HistoryEntry; link?: string }> = ({ entry, link }) => {
  const [expanded, setExpanded] = useState(false);
  const action = ACTIONS[entry.action] ?? ACTIONS.UPDATED;
  const changes = expanded ? entry.changes : entry.changes.slice(0, CHANGES_SHOWN);
  const initials = initialsOf(entry.actorName);

  return (
    <li className="px-5 py-4 flex gap-3">
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0" aria-hidden>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-slate-700 min-w-0">
            <strong className="text-slate-900">{entry.actorName}</strong>{' '}
            <span className="text-slate-500">· {entry.summary.charAt(0).toLowerCase() + entry.summary.slice(1)}</span>
          </p>
          <time dateTime={entry.timestamp} title={formatDateTime(entry.timestamp)} className="text-xs text-slate-500 whitespace-nowrap">
            {formatTime(entry.timestamp)}
          </time>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${action.className}`}>{action.label}</span>
          <span className="text-xs text-slate-500">{TYPES[entry.entityType] ?? entry.entityType}</span>
          {entry.entityLabel && (
            link
              ? <Link to={link} className="text-xs font-semibold text-blue-700 hover:underline truncate">{entry.entityLabel}</Link>
              : <span className="text-xs font-semibold text-slate-700 truncate">{entry.entityLabel}</span>
          )}
        </div>

        {entry.changes.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <caption className="sr-only">Fields changed</caption>
              <tbody className="divide-y divide-slate-100">
                {changes.map(c => (
                  <tr key={c.field} className="align-top">
                    <th scope="row" className="text-left font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 w-36 sm:w-44">{c.label}</th>
                    <td className="px-3 py-1.5">
                      {entry.action === 'CREATED' ? <Value v={c.to} />
                        : entry.action === 'DELETED' ? <Value v={c.from} removed />
                          : <><Value v={c.from} /> <span className="text-slate-400 mx-1" aria-label="changed to">→</span> <Value v={c.to} /></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entry.changes.length > CHANGES_SHOWN && (
              <button
                type="button"
                className="w-full text-xs font-semibold text-blue-700 bg-slate-50 hover:bg-slate-100 py-1.5 cursor-pointer border-t border-slate-200"
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? 'Show fewer' : `Show all ${entry.changes.length} fields`}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

export const HistoryPage: React.FC = () => {
  const { influencers, products, campaigns } = useCrmStore();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Filters live in the URL so a member's "N changes" link opens their history
  const [params, setParams] = useSearchParams();
  const person = params.get('person') ?? '';
  const action = params.get('action') ?? '';
  const type = params.get('type') ?? '';
  const search = params.get('q') ?? '';
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE_SIZE);
  };

  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => { setLoading(true); setReloadKey(k => k + 1); };

  useEffect(() => {
    let cancelled = false;
    Promise.all([teamApi.getHistory(), teamApi.getTeam()])
      .then(([log, members]) => {
        if (cancelled) return;
        setEntries(log);
        setTeam(members);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'Could not load the history. Please try again.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Everyone who appears in the log, including members who have since been removed
  const people = useMemo(() => {
    const names = new Map<string, string>();
    team.forEach(m => names.set(m.username, memberName(m)));
    entries.forEach(e => { if (!names.has(e.actor)) names.set(e.actor, `${e.actorName} (removed)`); });
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [team, entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e =>
      (!person || e.actor === person) &&
      (!action || e.action === action) &&
      (!type || e.entityType === type) &&
      (!q || [e.summary, e.entityLabel, e.actorName, ...e.changes.flatMap(c => [c.label, c.from, c.to])].some(v => (v || '').toLowerCase().includes(q))));
  }, [entries, person, action, type, search]);

  // Link each entry to the record it's about, while that record still exists
  const linkFor = (e: HistoryEntry): string | undefined => {
    if (!e.entityId || e.action === 'DELETED') return undefined;
    if (e.entityType === 'INFLUENCER') return influencers.some(i => i.id === e.entityId) ? `/influencers/${e.entityId}` : undefined;
    if (e.entityType === 'PRODUCT') return products.includes(e.entityId) ? `/products/${encodeURIComponent(e.entityId)}` : undefined;
    if (e.entityType === 'TRACKING') {
      const c = campaigns.find(x => x.id === e.entityId);
      return c ? `/influencers/${c.influencerId}` : undefined;
    }
    if (e.entityType === 'TEAM_MEMBER') return '/team';
    return undefined;
  };

  const visible = filtered.slice(0, shown);
  const groups: { day: string; items: HistoryEntry[] }[] = [];
  visible.forEach(e => {
    const day = dayLabel(e.timestamp);
    if (groups[groups.length - 1]?.day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(e);
  });

  const hasFilters = Boolean(person || action || type || search);

  return (
    <>
      <PageHeader
        title="History"
        description="Every change made in the portal: who made it, when, and exactly what changed."
        actions={
          <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />Refresh
          </button>
        }
      />

      <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
        <div>
          <label className="field-label" htmlFor="h-search">Search</label>
          <input id="h-search" type="search" className="field-input" placeholder="Name, product, field or value" value={search} onChange={e => setParam('q', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="h-person">Person</label>
          <select id="h-person" className="field-input" value={person} onChange={e => setParam('person', e.target.value)}>
            <option value="">Everyone</option>
            {people.map(([username, name]) => <option key={username} value={username}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="h-action">Action</label>
          <select id="h-action" className="field-input" value={action} onChange={e => setParam('action', e.target.value)}>
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([key, a]) => <option key={key} value={key}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="h-type">Area</label>
          <select id="h-type" className="field-input" value={type} onChange={e => setParam('type', e.target.value)}>
            <option value="">Everything</option>
            {Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 text-sm text-slate-600">
        <span>
          {loading && entries.length === 0 ? 'Loading…' : <>Showing <strong className="text-slate-900">{visible.length}</strong> of {filtered.length} change{filtered.length === 1 ? '' : 's'}</>}
        </span>
        {hasFilters && (
          <button type="button" className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer" onClick={() => { setParams({}, { replace: true }); setShown(PAGE_SIZE); }}>
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {!loading && filtered.length === 0 ? (
        <div className="card">
          {entries.length === 0
            ? <EmptyState title="No changes recorded yet">From now on, every add, edit and delete in the portal shows up here.</EmptyState>
            : <EmptyState title="No changes match">Try another person, action or search.</EmptyState>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(g => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{g.day}</h2>
              <ul className="card divide-y divide-slate-100 overflow-hidden">
                {g.items.map(e => <Entry key={e.id} entry={e} link={linkFor(e)} />)}
              </ul>
            </section>
          ))}
          {filtered.length > shown && (
            <button type="button" className="btn-secondary self-center" onClick={() => setShown(s => s + PAGE_SIZE)}>
              Show older changes
            </button>
          )}
        </div>
      )}
    </>
  );
};
