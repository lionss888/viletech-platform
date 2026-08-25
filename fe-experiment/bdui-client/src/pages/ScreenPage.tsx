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
};

const DETAIL_PATHS: Record<BduiVedRoleId, string> = {
  user: '/form-payment/{formId}',
  internal_compliance_officer: '/admin/internal-compliance-officer/form-payment/{formId}',
  compliance_officer: '/admin/compliance-officer/form-payment/{formId}',
  manager: '/admin/manager/form-payment/{formId}',
  provider: '/admin/provider/form-payment/{formId}',
};

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

/**
 * Loads a BDUI schema for the active role and runs mapped REST actions.
 */
export function ScreenPage(props: ScreenPageProps): JSX.Element {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string }>();
  const formId = routeParams.id;
  const [role, setRole] = useState<BduiVedRoleId>(() => getBduiRole());
  const [screen, setScreen] = useState<BduiScreen | null>(null);
  const [detailStatus, setDetailStatus] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pathParams = useMemo((): Record<string, string> => {
    if (!formId) {
      return {};
    }
    return { formId };
  }, [formId]);

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
  }, [navigate, props.page, formId, role]);

  const handleStatusLoaded = useCallback(
    async (nextStatus: string): Promise<void> => {
      if (props.page !== 'forms.detail' || nextStatus === detailStatus) {
        return;
      }
      setDetailStatus(nextStatus);
      const loaded = await fetchScreen(props.page, nextStatus, role);
      setScreen(loaded);
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

  async function handleRunAction(
    action: BduiAction,
    body?: Record<string, string>,
  ): Promise<unknown> {
    const isLogin = action.id === 'login';
    if (action.approveOrganizationFirst) {
      await approveOrganizationIfNeeded(action);
    }
    const requestBody =
      action.bodyFrom === 'form'
        ? body
        : action.requiresTextReason
          ? body
          : undefined;
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
    if (props.page === 'forms.detail' && formId) {
      const detailPath = DETAIL_PATHS[role].replace('{formId}', formId);
      const refreshed = await apiRequest<FormPaymentDetail>(detailPath, { method: 'GET' });
      if (refreshed.status) {
        setDetailStatus(refreshed.status);
        const loaded = await fetchScreen(props.page, refreshed.status, role);
        setScreen(loaded);
      }
      if (action.navigateTo === 'forms.list') {
        handleNavigate('forms.list');
      }
      return response;
    }
    if (action.navigateTo) {
      handleNavigate(action.navigateTo, pathParams);
    }
    return response;
  }

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
      ) : null}
      <SchemaRenderer
        screen={screen}
        pathParams={pathParams}
        onNavigate={handleNavigate}
        onRunAction={handleRunAction}
        onStatusLoaded={(nextStatus) => {
          void handleStatusLoaded(nextStatus);
        }}
      />
    </>
  );
}
