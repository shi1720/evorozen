import { useState, type FormEvent } from 'react';
import './SettingsPage.css';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Leaf,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';
import { api, date, errorMessage, money, patch, post, useApi } from './api';
import {
  Button,
  Empty,
  ErrorBanner,
  Loading,
  Logo,
  Modal,
  PageHeading,
  Status,
  Success,
} from './ui';
import { useUser } from './App';
import type { Activity, Dashboard, RecoveryCase, Supplier, User } from '../shared/types';

export function NewCase({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const result = await post<{ case: RecoveryCase }>('/cases', data);
      onClose();
      navigate(`/app/cases/${result.case.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Give this paper trail a home."
      description="Start with a supplier. You’ll add the documents next."
      onClose={onClose}
    >
      <form onSubmit={submit} className="stack-form">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <label>
          Case name
          <input
            name="title"
            required
            maxLength={160}
            placeholder="e.g. Monday’s short delivery"
            autoFocus
          />
        </label>
        <label>
          Supplier name
          <input name="supplierName" required maxLength={120} placeholder="e.g. Northstar Foods" />
        </label>
        <div className="form-row">
          <label>
            Invoice reference <span>optional</span>
            <input name="invoiceReference" maxLength={100} placeholder="e.g. NF-1042" />
          </label>
          <label>
            Follow-up date <span>optional</span>
            <input type="date" name="dueDate" />
          </label>
        </div>
        <div className="form-actions">
          <Button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Create case <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function CaseTable({ cases, currency }: { cases: RecoveryCase[]; currency: string }) {
  return (
    <div className="table-scroll">
      <table className="case-table">
        <thead>
          <tr>
            <th>Case / supplier</th>
            <th>Status</th>
            <th>Claim amount</th>
            <th>Still open</th>
            <th>Updated</th>
            <th>
              <span className="sr-only">View case</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const identified =
              c.analysis?.findings
                .filter((f) => !f.needsReview)
                .reduce((s, f) => s + f.amountCents, 0) || 0;
            return (
              <tr key={c.id}>
                <td>
                  <Link className="case-title-link" to={`/app/cases/${c.id}`}>
                    <div
                      className={`supplier-icon ${c.status === 'resolved' ? 'is-resolved' : ''}`}
                    >
                      <Leaf size={18} />
                    </div>
                    <span>
                      <strong>{c.title}</strong>
                      <small>
                        {c.supplierName} <i>·</i> {c.invoiceReference || 'No reference yet'}
                      </small>
                    </span>
                  </Link>
                </td>
                <td>
                  <Status status={c.status} />
                </td>
                <td className="table-money">
                  {money(c.claimedCents || identified, currency)}
                  {!c.claimedCents && identified > 0 && <small>Identified · not claimed</small>}
                </td>
                <td className="table-money">
                  {c.claimedCents ? money(c.remainingCents, currency) : '—'}
                </td>
                <td className="muted">{date(c.updatedAt)}</td>
                <td>
                  <Link
                    to={`/app/cases/${c.id}`}
                    className="icon-button"
                    aria-label={`Open ${c.title}`}
                  >
                    <ChevronRight size={17} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function ActivityList({ items, compact = false }: { items: Activity[]; compact?: boolean }) {
  return (
    <div className={`activity-list ${compact ? 'compact' : ''}`}>
      {items.length ? (
        items.map((a) => (
          <div className="activity-item" key={a.id}>
            <span className="activity-dot">
              <ActivityIcon size={13} />
            </span>
            <div>
              <strong>{a.action.replace(/[_\.]/g, ' ')}</strong>
              <p>{a.detail}</p>
              {!compact && a.caseId && (
                <Link to={`/app/cases/${a.caseId}`}>
                  View case <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
            <time title={new Date(a.createdAt).toLocaleString()}>{date(a.createdAt)}</time>
          </div>
        ))
      ) : (
        <p className="muted padded">Your activity will appear here as you work.</p>
      )}
    </div>
  );
}
export function DashboardPage() {
  const { user } = useUser();
  const { data, error, loading, reload } = useApi<Dashboard>('/dashboard');
  const [create, setCreate] = useState(false);
  if (loading && !data) return <Loading />;
  if (error)
    return (
      <ErrorBanner>
        {error} <button onClick={reload}>Try again</button>
      </ErrorBanner>
    );
  if (!data) return null;
  const m = data.metrics;
  const open = data.cases.filter((c) => !['resolved', 'dismissed'].includes(c.status));
  const next = open.find((c) => c.status === 'review') || open[0];
  const pct = m.claimedCents
    ? Math.min(100, Math.round((m.creditedCents / m.claimedCents) * 100))
    : 0;
  return (
    <>
      <PageHeading
        eyebrow="YOUR RECOVERY DESK"
        title="A clearer picture. A little less chasing."
        subtitle={`Here’s what’s happening at ${user.workspaceName}.`}
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            New recovery case
          </Button>
        }
      />
      <div className="metric-grid">
        <article className="metric-card">
          <div>
            <span>Identified discrepancies</span>
            <span className="metric-icon">
              <Search size={17} />
            </span>
          </div>
          <strong>{money(m.identifiedCents, user.currency)}</strong>
          <p>Evidence-backed amounts to review</p>
        </article>
        <article className="metric-card">
          <div>
            <span>Claims prepared</span>
            <span className="metric-icon">
              <FileText size={17} />
            </span>
          </div>
          <strong>{money(m.claimedCents, user.currency)}</strong>
          <p>Reviewed and ready for your supplier</p>
        </article>
        <article className="metric-card green">
          <div>
            <span>Verified credits</span>
            <span className="metric-icon">
              <CheckCheck size={17} />
            </span>
          </div>
          <strong>{money(m.creditedCents, user.currency)}</strong>
          <p>Confirmed against a credit note</p>
        </article>
        <article className="metric-card">
          <div>
            <span>Still outstanding</span>
            <span className="metric-icon amber">
              <Clock3 size={17} />
            </span>
          </div>
          <strong>{money(m.remainingCents, user.currency)}</strong>
          <p>
            {m.openCases} {m.openCases === 1 ? 'open case' : 'open cases'} to keep in sight
          </p>
        </article>
      </div>
      <div className="dashboard-middle">
        <section className="next-step-card">
          <div className="next-step-heading">
            <span className="eyebrow">
              <span className="live-dot" />
              YOUR NEXT BEST STEP
            </span>
            <Sparkles size={18} />
          </div>
          {next ? (
            <>
              <h2>
                {next.status === 'review'
                  ? 'A missing delivery. A clear next step.'
                  : next.status === 'partial'
                    ? 'Part credited. Keep the rest in sight.'
                    : 'A little follow-through goes a long way.'}
              </h2>
              <p>
                {next.title} <span>·</span> {next.supplierName}
              </p>
              <div className="next-step-bottom">
                <span>
                  {next.analysis
                    ? `${next.analysis.findings.length} findings with linked evidence`
                    : `${next.documents.length} documents in this paper trail`}
                </span>
                <Link className="button" to={`/app/cases/${next.id}`}>
                  {next.status === 'review' ? 'Review findings' : 'Open case'}{' '}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>Let’s put your first credit in sight.</h2>
              <p>Bring an invoice and a delivery note. We’ll help connect the dots.</p>
              <div className="next-step-bottom">
                <span>A few documents. One clear picture.</span>
                <Button onClick={() => setCreate(true)}>
                  Start a case <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </section>
        <section className="progress-card">
          <div className="section-card-heading">
            <h3>The recovery loop</h3>
            <span className="muted">All time</span>
          </div>
          <div className="loop-visual">
            <div
              className="progress-ring"
              style={{ '--progress': `${pct}%` } as React.CSSProperties}
            >
              <div>
                <strong>
                  {pct}
                  <span>%</span>
                </strong>
                <small>credit verified</small>
              </div>
            </div>
            <div className="loop-legend">
              <span>
                <i className="legend-green" />
                Verified credit notes <b>{money(m.creditedCents, user.currency)}</b>
              </span>
              <span>
                <i className="legend-light" />
                Awaiting credit <b>{money(m.remainingCents, user.currency)}</b>
              </span>
            </div>
          </div>
          <p>Credit notes confirm an issued credit, not a bank payment.</p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Cases that need a little attention <span className="count-pill">{open.length}</span>
            </h2>
            <p>Keep the conversation moving, one case at a time.</p>
          </div>
          <Link className="text-link" to="/app/cases">
            All cases <ArrowRight size={16} />
          </Link>
        </div>
        {open.length ? (
          <CaseTable cases={open.slice(0, 5)} currency={user.currency} />
        ) : (
          <Empty
            title="No loose ends here."
            action={
              <Button className="button-secondary" onClick={() => setCreate(true)}>
                Add a recovery case
              </Button>
            }
          >
            Your open supplier cases will appear here.
          </Empty>
        )}
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <Link className="text-link" to="/app/activity">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <ActivityList items={data.activities.slice(0, 4)} compact />
        </section>
        <section className="small-principle">
          <div className="principle-icon">
            <ShieldCheck size={24} />
          </div>
          <div className="eyebrow">A NOTE ON YOUR NUMBERS</div>
          <h3>
            Found is good.
            <br />
            Verified is better.
          </h3>
          <p>
            We keep identified discrepancies, prepared claims, and verified credit notes separate. A
            promised credit never counts as a resolved case.
          </p>
          <Link to="/app/settings" className="text-link">
            How your workspace works <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      {create && <NewCase onClose={() => setCreate(false)} />}
    </>
  );
}
export function CasesPage() {
  const { user } = useUser();
  const { data, error, loading } = useApi<{ cases: RecoveryCase[] }>('/cases');
  const [create, setCreate] = useState(false),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const cases = data?.cases || [];
  const visible = cases.filter(
    (c) =>
      (filter === 'all' ||
        (filter === 'open'
          ? !['resolved', 'dismissed'].includes(c.status)
          : c.status === filter)) &&
      `${c.title} ${c.supplierName} ${c.invoiceReference}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="ONE PLACE FOR EVERY LOOSE END"
        title="Recovery cases"
        subtitle="From the first discrepancy to the last credit note."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            New recovery case
          </Button>
        }
      />
      <div className="panel">
        <div className="list-toolbar">
          <div className="filter-tabs" role="group" aria-label="Filter cases">
            {[
              ['all', 'All cases'],
              ['open', 'Open'],
              ['review', 'To review'],
              ['resolved', 'Resolved'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={filter === value ? 'selected' : ''}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Search size={17} />
            <input
              placeholder="Search cases or suppliers…"
              aria-label="Search cases"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <ErrorBanner>{error}</ErrorBanner>
        ) : loading ? (
          <Loading />
        ) : visible.length ? (
          <CaseTable cases={visible} currency={user.currency} />
        ) : (
          <Empty
            title={
              cases.length ? 'No matching cases.' : 'Every recovery starts with a paper trail.'
            }
            action={
              !cases.length && (
                <Button onClick={() => setCreate(true)}>
                  Create your first case <Plus size={16} />
                </Button>
              )
            }
          >
            {cases.length
              ? 'Try a different search or filter.'
              : 'Create a case, add your documents, and find out what needs a closer look.'}
          </Empty>
        )}
      </div>
      {create && <NewCase onClose={() => setCreate(false)} />}
    </>
  );
}
export function DocumentsPage() {
  const { data, error, loading } = useApi<{ cases: RecoveryCase[] }>('/cases');
  const [search, setSearch] = useState('');
  const docs = (data?.cases || [])
    .flatMap((c) =>
      c.documents.map((d) => ({ ...d, caseTitle: c.title, supplierName: c.supplierName })),
    )
    .filter((d) => `${d.name} ${d.supplierName}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeading
        eyebrow="THE SOURCE OF EVERY ANSWER"
        title="Document library"
        subtitle="Your invoices, delivery notes, and credit notes—connected to their cases."
      />
      <div className="panel">
        <div className="list-toolbar">
          <span className="muted">{docs.length} documents</span>
          <div className="search-field">
            <Search size={17} />
            <input
              placeholder="Find a document…"
              aria-label="Search documents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <ErrorBanner>{error}</ErrorBanner>
        ) : loading ? (
          <Loading />
        ) : docs.length ? (
          <div className="documents-grid">
            {docs.map((d) => (
              <Link
                className="document-card"
                key={d.id}
                to={`/app/cases/${d.caseId}?tab=documents&doc=${d.id}`}
              >
                <div className={`doc-symbol ${d.kind}`}>
                  <FileText size={24} />
                </div>
                <span className="doc-kind">{d.kind.replaceAll('_', ' ')}</span>
                <h3>{d.name}</h3>
                <p>{d.supplierName}</p>
                <div>
                  <span>{date(d.createdAt)}</span>
                  <ArrowUpRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="Your evidence belongs here."
            action={
              <Link className="button" to="/app/cases">
                Open recovery cases <ArrowRight size={16} />
              </Link>
            }
          >
            Add documents inside a recovery case to keep the complete paper trail together.
          </Empty>
        )}
      </div>
    </>
  );
}
export function SuppliersPage() {
  const { data, error, loading, reload } = useApi<{ suppliers: Supplier[] }>('/suppliers');
  const [edit, setEdit] = useState<Supplier | 'new' | null>(null),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const body = {
      ...f,
      aliases: String(f.aliases)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (edit === 'new') await post('/suppliers', body);
      else await patch(`/suppliers/${edit!.id}`, body);
      setEdit(null);
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A MEMORY FOR THE DETAILS"
        title="Your suppliers"
        subtitle="Keep names, aliases, and the details worth remembering in one place."
        action={
          <Button
            onClick={() => {
              setFormError('');
              setEdit('new');
            }}
          >
            <Plus size={16} />
            Add supplier
          </Button>
        }
      />
      {error ? (
        <ErrorBanner>{error}</ErrorBanner>
      ) : loading ? (
        <Loading />
      ) : data?.suppliers.length ? (
        <div className="suppliers-grid">
          {data.suppliers.map((s) => (
            <article className="supplier-card" key={s.id}>
              <div className="supplier-card-header">
                <span className="supplier-icon">
                  <Building2 size={23} />
                </span>
                <button
                  className="button button-small button-ghost"
                  onClick={() => {
                    setFormError('');
                    setEdit(s);
                  }}
                >
                  Edit details <ArrowUpRight size={14} />
                </button>
              </div>
              <h2>{s.name}</h2>
              <p>{s.email || 'No contact email added'}</p>
              <div className="supplier-aliases">
                {s.aliases.length ? (
                  s.aliases.map((a) => <span key={a}>{a}</span>)
                ) : (
                  <span>No aliases saved</span>
                )}
              </div>
              <div className="supplier-notes">
                <Sparkles size={15} />
                <p>
                  {s.notes || 'Add notes about item names, pack sizes, or how to request a credit.'}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="Good relationships start with the details."
            action={<Button onClick={() => setEdit('new')}>Add your first supplier</Button>}
          >
            Save a supplier’s details, then connect their paperwork in recovery cases.
          </Empty>
        </div>
      )}
      {edit && (
        <Modal
          title={edit === 'new' ? 'Add a supplier.' : 'The details worth remembering.'}
          description="These notes help interpret documents in your workspace. Save only information you have confirmed."
          onClose={() => setEdit(null)}
        >
          <form onSubmit={submit} className="stack-form">
            {formError && <ErrorBanner>{formError}</ErrorBanner>}
            <label>
              Supplier name
              <input
                name="name"
                defaultValue={edit === 'new' ? '' : edit.name}
                required
                maxLength={120}
              />
            </label>
            <label>
              Contact email <span>optional</span>
              <input
                name="email"
                type="email"
                defaultValue={edit === 'new' ? '' : edit.email}
                maxLength={254}
              />
            </label>
            <label>
              Known aliases <span>comma separated</span>
              <input
                name="aliases"
                defaultValue={edit === 'new' ? '' : edit.aliases.join(', ')}
                placeholder="Northstar, NS Foods"
                maxLength={1000}
              />
            </label>
            <label>
              Supplier memory
              <textarea
                name="notes"
                defaultValue={edit === 'new' ? '' : edit.notes}
                rows={4}
                maxLength={4000}
                placeholder="Confirmed item names, pack sizes, or credit process…"
              />
            </label>
            <div className="form-actions">
              <Button className="button-secondary" type="button" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button busy={saving}>
                Save supplier <Check size={16} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function ActivityPage() {
  const { data, error, loading } = useApi<{ activities: Activity[] }>('/activity');
  return (
    <>
      <PageHeading
        eyebrow="THE STORY BEHIND THE NUMBERS"
        title="Workspace activity"
        subtitle="A timestamped record of documents, decisions, and credits."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>Audit trail</h2>
          <span className="quiet-badge">
            <ShieldCheck size={14} /> Recorded by the server
          </span>
        </div>
        {error ? (
          <ErrorBanner>{error}</ErrorBanner>
        ) : loading ? (
          <Loading />
        ) : (
          <ActivityList items={data?.activities || []} />
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { user, setUser } = useUser();
  const { data } = useApi<{
    user: User;
    engine: { provider: string; configured: boolean; memoryEnabled: boolean };
  }>('/settings');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false),
    [deleting, setDeleting] = useState(false),
    [deleteError, setDeleteError] = useState(''),
    [deleteConfirmed, setDeleteConfirmed] = useState(false);
  async function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deleteConfirmed || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const password = String(new FormData(e.currentTarget).get('password') || '');
      await api('/account', { method: 'DELETE', body: JSON.stringify({ password }) });
      window.location.replace('/');
    } catch (error) {
      setDeleteError(errorMessage(error));
      setDeleting(false);
    }
  }
  function closeDeletion() {
    if (!deleting) {
      setDeleteOpen(false);
      setDeleteError('');
      setDeleteConfirmed(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await patch<{ user: User }>(
        '/settings',
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setUser(r.user);
      setSuccess('Your workspace details are saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Workspace settings"
        subtitle="Your details, your data, and how Remainder works."
      />
      <div className="settings-grid">
        <section className="panel padded">
          <h2>Workspace details</h2>
          <p className="muted">A little context for your claims and exports.</p>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {success && <Success>{success}</Success>}
          <form className="stack-form" onSubmit={submit}>
            <label>
              Your name
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={100} />
            </label>
            <label>
              Business name
              <input
                name="workspaceName"
                defaultValue={user.workspaceName}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <div className="form-row">
              <label>
                Email address
                <input value={user.email} disabled />
              </label>
              <label>
                Currency
                <input value={user.currency} disabled />
              </label>
            </div>
            <span className="field-hint">
              Currency is fixed so unrelated balances are never mixed.
            </span>
            <Button busy={busy}>
              Save changes <Check size={16} />
            </Button>
          </form>
        </section>
        <div className="settings-side">
          <section className="panel padded">
            <div className="section-card-heading">
              <h2>Intelligence layer</h2>
              <Sparkles size={19} />
            </div>
            <span className={`engine-pill ${data?.engine.configured ? 'connected' : ''}`}>
              <i />
              {user.isDemo
                ? 'Demo replay'
                : data?.engine.configured
                  ? `${data.engine.provider} configured`
                  : 'Provider not configured'}
            </span>
            <p>
              {user.isDemo
                ? 'Sample documents use a reproducible, labeled replay. Real workspaces call the configured AI provider.'
                : 'AI interprets documents and connects item names. Remainder validates quotations and calculates all amounts in code.'}
            </p>
            <div className="mini-facts">
              <span>
                Secret keys <b>Server-side only</b>
              </span>
              <span>
                Decisions <b>Reviewed by you</b>
              </span>
              <span>
                Supplier memory <b>Workspace scoped</b>
              </span>
            </div>
          </section>
          <section className="panel padded">
            <h2>Your data belongs to you.</h2>
            <p>
              Download your cases, supplier details, documents, and activity as a portable JSON
              file.
            </p>
            <div className="settings-data-actions">
              <a href="/api/export" className="button button-secondary">
                <Download size={16} />
                Export workspace
              </a>
              {!user.isDemo && (
                <Button
                  className="button-secondary settings-delete-button"
                  onClick={() => {
                    setDeleteError('');
                    setDeleteConfirmed(false);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 size={16} />
                  Delete account
                </Button>
              )}
            </div>
            {user.isDemo && (
              <p className="settings-data-note">
                Sample workspaces are removed automatically after seven days. Sign out to leave this
                demo.
              </p>
            )}
          </section>
        </div>
      </div>
      <section className="panel padded faq-panel">
        <h2>A few useful things to know</h2>
        <details>
          <summary>What does “verified credit” mean?</summary>
          <p>
            You have reviewed a credit note that matches an approved claim. It does not prove that a
            credit was applied to a bill or that money reached your bank. Confirm those steps in
            your accounting system.
          </p>
        </details>
        <details>
          <summary>Does Remainder send emails or change my accounts?</summary>
          <p>
            No. Prepare and download a claim email and evidence PDF, review them, then send through
            your own email. Mark the case as sent after you send it. Remainder does not access your
            bank or accounting system.
          </p>
        </details>
        <details>
          <summary>How do I add documents?</summary>
          <p>
            Add text directly, a text PDF, a TXT or CSV file, or a PNG/JPEG image. Text extraction
            happens in your browser. Review extracted text before you save it. For poor-quality
            scans, paste a corrected transcription. The stored evidence is the text you confirm, not
            a forensic original.
          </p>
        </details>
        <details>
          <summary>What if AI is unavailable or gets something wrong?</summary>
          <p>
            Your documents stay saved. Retry later when the provider is available. Every finding
            links to exact evidence. Exclude a finding that is wrong, or correct the source
            documents before preparing a claim. AI suggestions are never sent automatically.
          </p>
        </details>
        <details>
          <summary>How do I recover my account?</summary>
          <p>
            Use the recovery key saved during signup on the account recovery page. This pilot does
            not send password-reset emails. Keep your key in a password manager.
          </p>
        </details>
      </section>
      {deleteOpen && (
        <Modal
          title="Delete your account?"
          description={`This permanently removes ${user.workspaceName} and signs you out. Export a copy of your records before continuing.`}
          onClose={closeDeletion}
        >
          <form className="stack-form" onSubmit={deleteAccount}>
            {deleteError && <ErrorBanner>{deleteError}</ErrorBanner>}
            <label>
              Current password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                disabled={deleting}
              />
            </label>
            <label className="deletion-confirmation">
              <input
                type="checkbox"
                required
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                disabled={deleting}
              />
              <span>
                I understand this permanently deletes my account, cases, documents, suppliers, and
                activity. This cannot be undone.
              </span>
            </label>
            <div className="form-actions">
              <Button
                type="button"
                className="button-secondary"
                onClick={closeDeletion}
                disabled={deleting}
              >
                Keep my account
              </Button>
              <Button
                type="submit"
                className="settings-delete-confirm"
                busy={deleting}
                disabled={deleting || !deleteConfirmed}
              >
                Delete account permanently
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  return (
    <div className="legal-page">
      <header>
        <Logo />
        <Link to="/">
          Back home <ArrowRight size={16} />
        </Link>
      </header>
      <main>
        <div className="eyebrow">LAST UPDATED · SEPTEMBER 23, 2026</div>
        <h1>{type === 'privacy' ? 'Your paperwork. Your privacy.' : 'Clear expectations.'}</h1>
        {type === 'privacy' ? (
          <>
            <p>
              Remainder is a pilot supplier-credit recovery application built by Shivam Gupta for
              Evorozen Apex. This notice describes the implemented workflow, rather than promising
              certifications we do not hold.
            </p>
            <h2>What is stored</h2>
            <p>
              Your name, email, workspace name, password hash, documents’ confirmed extracted text,
              supplier details, case analyses, claim drafts, and activity records are stored to
              provide your workspace. Session tokens are kept in HTTP-only cookies; the database
              stores their hashes. Recovery keys are also hashed.
            </p>
            <h2>How AI processes documents</h2>
            <p>
              When you choose to analyze a case, the extracted text and relevant supplier notes are
              sent to the configured AI provider: Evorozen Neural Pulse, OpenAI, or Gemini,
              according to the deployment settings. The provider is identified on each analysis. Do
              not upload material you are not permitted to share with that provider. Demo replay
              uses fictional sample data. If optional Evorozen supplier memory is enabled, confirmed
              product-name aliases may also be stored with Evorozen in an isolated, signed record.
              That memory does not include the original document text, invoice references, or
              financial amounts.
            </p>
            <h2>Files and evidence</h2>
            <p>
              PDF and image text extraction occurs in your browser. The application stores the
              extracted text you review, not the original image/PDF binary. Evidence hashes apply to
              that stored text. Keep original documents in your own records.
            </p>
            <h2>Your controls</h2>
            <p>
              You can export your workspace in Settings. Documents can be removed before claim
              approval. Account deletion is available in Settings with your current password and an
              explicit confirmation. It removes associated workspace records and, when enabled,
              remote supplier memory; a failed remote cleanup is reported before local records are
              deleted. For assistance, use the repository’s issue tracker without posting personal
              or supplier data.
            </p>
            <h2>Analytics and retention</h2>
            <p>
              Workspace events support your activity trail. We do not use advertising trackers. Demo
              activity is separate from real account activity and is never represented as customer
              traction. Hosting providers may retain operational request logs. Data remains until
              deletion or the end of the pilot; hosting limitations and backup arrangements are
              documented in the repository.
            </p>
          </>
        ) : (
          <>
            <p>
              Remainder is an early pilot for organizing supplier-credit evidence. It helps you
              review discrepancies, prepare correspondence, and reconcile issued credit notes. It is
              not accounting, tax, or legal advice.
            </p>
            <h2>You stay in control</h2>
            <p>
              AI can make mistakes. Check all source text, quantities, prices, invoice references,
              and supplier identities before approving or sending a claim. A “verified credit” means
              a matching credit note was reviewed; it does not prove cash receipt or allocation in
              an accounting ledger.
            </p>
            <h2>Acceptable use</h2>
            <p>
              Upload only documents you have permission to process. Do not submit fraudulent claims,
              unlawful content, or another person’s credentials. You are responsible for
              correspondence you export and send.
            </p>
            <h2>Pilot availability</h2>
            <p>
              No payment is collected in this pilot. Provider quotas and hosting availability can
              interrupt analysis. No recovery amount, uptime, or AI accuracy is guaranteed. Export
              your work and retain your original documents.
            </p>
            <h2>Ownership</h2>
            <p>
              You retain ownership of your uploaded information. Use of the service permits
              processing that information only to provide the requested workflow. Product source
              licensing is described in the repository.
            </p>
          </>
        )}
        <p className="legal-contact">
          <a href="https://github.com/shi1720/evorozen" target="_blank" rel="noreferrer">
            Project documentation and support <ArrowUpRight size={14} />
          </a>
        </p>
      </main>
    </div>
  );
}
