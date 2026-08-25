import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  apiRequest,
  clearAuthTokens,
  getBduiRole,
  saveAuthTokens,
  setBduiRole,
  BDUI_ROLES,
} from '../api/client';
import { fetchScreen } from '../api/schema';
import { SchemaRenderer } from '../components/SchemaRenderer';
import type { AuthResponse, BduiAction, BduiScreen, BduiVedRoleId } from '../types/bdui';

type ScreenPageProps = {
  page: string;
};

const PAGE_ROUTES: Record<string, (params?: Record<string, string>) => string> = {
  login: () => '/login',
  'users.list': () => '/users',
  'users.create': () => '/users/new',
  'users.detail': (params) => `/users/${params?.userId ?? ''}`,
  'directories.list': () => '/directories',
  'directories.detail': (params) => `/directories/${params?.orgId ?? ''}`,
  'forms.list': () => '/forms',
  'forms.create': () => '/forms/new',
  'forms.detail': (params) => `/forms/${params?.formId ?? ''}`,
};

const ROLE_LABELS: Record<BduiVedRoleId, string> = {
  user: 'User',
  internal_compliance_officer: 'Internal CO',
  compliance_officer: 'External CO',
  manager: 'Manager',
  provider: 'Provider',
  root: 'Root',
};

const DETAIL_PATHS: Record<BduiVedRoleId, string> = {
  user: '/form-payment/{formId}',
  internal_compliance_officer: '/admin/internal-compliance-officer/form-payment/{formId}',
  compliance_officer: '/admin/compliance-officer/form-payment/{formId}',
  manager: '/admin/manager/form-payment/{formId}',
  provider: '/admin/provider/form-payment/{formId}',
  root: '/admin/form-payment/{formId}',
};

const ROOT_NAV: Array<{ page: string; label: string }> = [
  { page: 'users.list', label: 'Пользователи' },
  { page: 'directories.list', label: 'Справочники' },
  { page: 'forms.list', label: 'Заявки' },
];

type FormOrganization = {
  _id?: string;
  refOrganizationId?: string;
  status?: string;
};

type FormPaymentDetail = {
  _id?: string;
  status?: string;
  organization?: FormOrganization | string;
};

function buildRequestBody(action: BduiAction, body?: Record<string, unknown>): Record<string, unknown> | undefined {
  let requestBody: Record<string, unknown> | undefined =
    action.bodyFrom === 'form'
      ? body
      : action.requiresTextReason ||
          action.requiresProviderId ||
          action.requiresTxHash ||
          action.requiresFileUpload ||
          action.requiresContractMeta
        ? body
        : undefined;
  if (action.staticBody) {
    requestBody = { ...action.staticBody, ...(requestBody ?? {}) };
  }
  if (action.id === 'root_create_user' && body?.roles !== undefined) {
    requestBody = { ...(requestBody ?? body ?? {}), roles: [String(body.roles)] };
  }
  if (action.injectSigningOrderDate) {
    requestBody = {
      ...(requestBody ?? {}),
      signingOrderCreateDate: new Date().toISOString(),
    };
  }
  return requestBody;
}

/**
 * Loads a BDUI schema for the active role and runs mapped REST actions.
 */
export function ScreenPage(props: ScreenPageProps): JSX.Element {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string; userId?: string; orgId?: string }>();
  const formId = routeParams.id;
  const [role, setRole] = useState<BduiVedRoleId>(() => getBduiRole());
  const [screen, setScreen] = useState<BduiScreen | null>(null);
  const [detailStatus, setDetailStatus] = useState<string | undefined>(undefined);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pathParams = useMemo((): Record<string, string> => {
    if (props.page === 'users.detail' && routeParams.userId) {
      return { userId: routeParams.userId };
    }
    if (props.page === 'directories.detail' && routeParams.orgId) {
      return { orgId: routeParams.orgId };
    }
    if (formId) {
      return { formId };
    }
    return {};
  }, [formId, props.page, routeParams.orgId, routeParams.userId]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial(): Promise<void> {
      setErrorMessage(null);
      setScreen(null);
      try {
        const loaded = await fetchScreen(props.page, undefined, role);
        if (!cancelled) {
          setScreen(loaded);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load schema';
        if (message.includes('Unauthorized') || message.includes('401')) {
          clearAuthTokens();
          navigate('/login');
          return;
        }
        setErrorMessage(message);
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [navigate, props.page, formId, routeParams.userId, routeParams.orgId, role]);

  const handleStatusLoaded = useCallback(
    async (nextStatus: string): Promise<void> => {
      if (props.page !== 'forms.detail' || nextStatus === detailStatus) {
        return;
      }
      setDetailStatus(nextStatus);
      const loaded = await fetchScreen(props.page, nextStatus, role);
      setScreen(loaded);
      setDataRefreshKey((previous) => previous + 1);
    },
    [detailStatus, props.page, role],
  );

  function handleNavigate(page: string, params?: Record<string, string>): void {
    const toRoute = PAGE_ROUTES[page];
    if (!toRoute) {
      return;
    }
    navigate(toRoute(params));
  }

  function handleRoleChange(nextRole: BduiVedRoleId): void {
    setBduiRole(nextRole);
    setRole(nextRole);
  }

  async function approveOrganizationIfNeeded(action: BduiAction): Promise<void> {
    if (!action.approveOrganizationFirst || !formId) {
      return;
    }
    const detailPath = DETAIL_PATHS.internal_compliance_officer.replace('{formId}', formId);
    const form = await apiRequest<FormPaymentDetail>(detailPath, { method: 'GET' });
    const organization = form.organization;
    if (!organization || typeof organization === 'string') {
      throw new Error('Organization missing on form — cannot approve');
    }
    const orgId = organization.refOrganizationId ?? organization._id;
    if (!orgId) {
      throw new Error('Organization id missing — cannot approve');
    }
    if (organization.status !== 'approved') {
      await apiRequest(`/admin/internal-compliance-officer/organization/${orgId}/approve`, {
        method: 'PUT',
      });
    }
  }

  async function refreshDetailAfterAction(action: BduiAction): Promise<void> {
    if (props.page === 'users.detail' && pathParams.userId) {
      setDataRefreshKey((previous) => previous + 1);
      return;
    }
    if (props.page === 'directories.detail' && pathParams.orgId) {
      setDataRefreshKey((previous) => previous + 1);
      return;
    }
    if (props.page === 'forms.detail' && formId) {
      const detailPath = DETAIL_PATHS[role].replace('{formId}', formId);
      const refreshed = await apiRequest<FormPaymentDetail>(detailPath, { method: 'GET' });
      if (refreshed.status && role !== 'root') {
        setDetailStatus(refreshed.status);
        const loaded = await fetchScreen(props.page, refreshed.status, role);
        setScreen(loaded);
      } else {
        setDataRefreshKey((previous) => previous + 1);
      }
      if (action.navigateTo === 'forms.list') {
        handleNavigate('forms.list');
      }
    }
  }

  async function handleRunAction(
    action: BduiAction,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const isLogin = action.id === 'login';
    if (action.approveOrganizationFirst) {
      await approveOrganizationIfNeeded(action);
    }
    const requestBody = buildRequestBody(action, body);
    const response = await apiRequest<unknown>(action.path, {
      method: action.method,
      body: requestBody,
      auth: !isLogin,
      pathParams,
    });
    if (isLogin) {
      saveAuthTokens(response as AuthResponse);
    }
    if (action.navigateTo === 'forms.detail') {
      const created = response as { _id?: string; status?: string };
      const nextFormId = created._id ?? formId;
      if (nextFormId) {
        if (created.status) {
          setDetailStatus(created.status);
        }
        navigate(`/forms/${nextFormId}`);
        return response;
      }
    }
    if (action.navigateTo === 'users.detail') {
      const created = response as { _id?: string };
      if (created._id) {
        navigate(`/users/${created._id}`);
        return response;
      }
    }
    if (
      props.page === 'forms.detail' ||
      props.page === 'users.detail' ||
      props.page === 'directories.detail'
    ) {
      await refreshDetailAfterAction(action);
      return response;
    }
    if (action.navigateTo) {
      handleNavigate(action.navigateTo, pathParams);
    }
    return response;
  }

  const showFormsBreadcrumb =
    props.page === 'forms.create' || (props.page === 'forms.detail' && role !== 'root');
  const showRootBreadcrumb =
    role === 'root' &&
    (props.page.startsWith('users.') ||
      props.page.startsWith('directories.') ||
      props.page.startsWith('forms.'));

  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }
  if (!screen) {
    return <p className="bdui-muted">Загрузка схемы…</p>;
  }

  return (
    <>
      {props.page === 'login' ? (
        <div className="bdui-role-picker" role="group" aria-label="Роль BDUI">
          {BDUI_ROLES.map((item) => (
            <button
              key={item}
              type="button"
              className={
                item === role ? 'bdui-role-picker__btn bdui-role-picker__btn--active' : 'bdui-role-picker__btn'
              }
              onClick={() => handleRoleChange(item)}
            >
              {ROLE_LABELS[item]}
            </button>
          ))}
        </div>
      ) : (
        <div className="bdui-role-picker" role="group" aria-label="Сессия BDUI">
          <span className="bdui-muted">Роль: {ROLE_LABELS[role]}</span>
          {role === 'root' ? (
            <nav className="bdui-root-nav" aria-label="Root разделы">
              {ROOT_NAV.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  className={
                    props.page.startsWith(item.page.split('.')[0])
                      ? 'bdui-role-picker__btn bdui-role-picker__btn--active'
                      : 'bdui-role-picker__btn'
                  }
                  onClick={() => handleNavigate(item.page)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}
          <button
            type="button"
            className="bdui-role-picker__btn"
            onClick={() => {
              clearAuthTokens();
              navigate('/login');
            }}
          >
            Выйти
          </button>
        </div>
      )}
      {showFormsBreadcrumb && (
        <nav className="bdui-breadcrumb" aria-label="Навигация по заявкам">
          <button
            type="button"
            className="bdui-breadcrumb__link"
            onClick={() => handleNavigate('forms.list')}
          >
            ← К списку
          </button>
          <span className="bdui-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="bdui-breadcrumb__current">
            {props.page === 'forms.create'
              ? 'Новая заявка'
              : formId
                ? `Заявка …${formId.slice(-6)}`
                : 'Заявка'}
          </span>
        </nav>
      )}
      {showRootBreadcrumb && props.page !== 'users.list' && props.page !== 'directories.list' && props.page !== 'forms.list' && (
        <nav className="bdui-breadcrumb" aria-label="Root навигация">
          <button
            type="button"
            className="bdui-breadcrumb__link"
            onClick={() => handleNavigate(`${props.page.split('.')[0]}.list`)}
          >
            ← К списку
          </button>
        </nav>
      )}
      <SchemaRenderer
        screen={screen}
        pathParams={pathParams}
        dataRefreshKey={`${formId ?? ''}:${pathParams.userId ?? ''}:${pathParams.orgId ?? ''}:${detailStatus ?? ''}:${dataRefreshKey}`}
        onNavigate={handleNavigate}
        onRunAction={handleRunAction}
        onDirectoryLinked={() => setDataRefreshKey((previous) => previous + 1)}
        onStatusLoaded={(nextStatus) => {
          void handleStatusLoaded(nextStatus);
        }}
      />
    </>
  );
}
