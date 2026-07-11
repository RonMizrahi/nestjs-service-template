import { type ReactNode, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: T };

interface Profile {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface UserRow {
  id: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

function Panel({
  title,
  testid,
  children,
}: {
  title: string;
  testid: string;
  children: ReactNode;
}) {
  return (
    <section
      data-testid={testid}
      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-4 text-sm">{children}</div>
    </section>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
      aria-hidden
    />
  );
}

function ProfilePanel() {
  const [state, setState] = useState<Async<Profile>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void api
      .GET('/v1/auth/me')
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setState({ status: 'error', message: 'Could not load profile' });
        else setState({ status: 'ok', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'Could not load profile' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Panel title="Profile" testid="profile-panel">
      {state.status === 'loading' && <p className="text-slate-400">Loading…</p>}
      {state.status === 'error' && <p className="text-red-600">{state.message}</p>}
      {state.status === 'ok' && (
        <dl className="space-y-1">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Email</dt>
            <dd data-testid="profile-email" className="font-medium">
              {state.data.email}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Roles</dt>
            <dd className="font-medium">{state.data.roles.join(', ') || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Permissions</dt>
            <dd className="text-right font-medium">{state.data.permissions.join(', ') || '—'}</dd>
          </div>
        </dl>
      )}
    </Panel>
  );
}

function HealthPanel() {
  const [state, setState] = useState<Async<{ liveness: boolean; readiness: boolean }>>({
    status: 'loading',
  });

  useEffect(() => {
    let active = true;
    void Promise.all([api.GET('/health/liveness'), api.GET('/health/readiness')])
      .then(([liveness, readiness]) => {
        if (!active) return;
        setState({
          status: 'ok',
          data: { liveness: liveness.response.ok, readiness: readiness.response.ok },
        });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'Health check failed' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Panel title="Health" testid="health-panel">
      {state.status === 'loading' && <p className="text-slate-400">Loading…</p>}
      {state.status === 'error' && <p className="text-red-600">{state.message}</p>}
      {state.status === 'ok' && (
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <StatusDot ok={state.data.liveness} />
            <span>Liveness {state.data.liveness ? 'up' : 'down'}</span>
          </li>
          <li className="flex items-center gap-2">
            <StatusDot ok={state.data.readiness} />
            <span>Readiness {state.data.readiness ? 'up' : 'down'}</span>
          </li>
        </ul>
      )}
    </Panel>
  );
}

function UsersPanel() {
  const [state, setState] = useState<Async<UserRow[]> | { status: 'forbidden' }>({
    status: 'loading',
  });

  useEffect(() => {
    let active = true;
    void api
      .GET('/v1/users')
      .then(({ data, error, response }) => {
        if (!active) return;
        if (response.status === 403) setState({ status: 'forbidden' });
        else if (error || !data) setState({ status: 'error', message: 'Could not load users' });
        else setState({ status: 'ok', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'Could not load users' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Panel title="Users" testid="users-panel">
      {state.status === 'loading' && <p className="text-slate-400">Loading…</p>}
      {state.status === 'error' && <p className="text-red-600">{state.message}</p>}
      {state.status === 'forbidden' && (
        <p data-testid="users-forbidden" className="text-amber-600">
          Requires the admin role.
        </p>
      )}
      {state.status === 'ok' && (
        <ul data-testid="users-list" className="divide-y divide-slate-100">
          {state.data.map((user) => (
            <li key={user.id} className="flex items-center justify-between py-2">
              <span>{user.email}</span>
              <StatusDot ok={user.isActive} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DashboardRoute() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Service Console</h1>
        <button
          type="button"
          onClick={logout}
          data-testid="logout"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Sign out
        </button>
      </header>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProfilePanel />
        <HealthPanel />
        <UsersPanel />
      </div>
    </div>
  );
}
