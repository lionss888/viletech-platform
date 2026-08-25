import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, clearAuthTokens, saveAuthTokens } from '../api/client';
import { fetchUserScreen } from '../api/schema';
import { SchemaRenderer } from '../components/SchemaRenderer';
import type { AuthResponse, BduiAction, BduiScreen } from '../types/bdui';

type ScreenPageProps = {
  page: string;
};

const PAGE_ROUTES: Record<string, (params?: Record<string, string>) => string> = {
  login: () => '/login',
  'forms.list': () => '/forms',
  'forms.create': () => '/forms/new',
  'forms.detail': (params) => `/forms/${params?.formId ?? ''}`,
};

/**
 * Loads a BDUI schema for the given page and runs mapped REST actions.
 */
export function ScreenPage(props: ScreenPageProps): JSX.Element {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string }>();
  const formId = routeParams.id;
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
        const loaded = await fetchUserScreen(props.page);
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
  }, [navigate, props.page, formId]);

  const handleStatusLoaded = useCallback(
    async (nextStatus: string): Promise<void> => {
      if (props.page !== 'forms.detail' || nextStatus === detailStatus) {
        return;
      }
      setDetailStatus(nextStatus);
      const loaded = await fetchUserScreen(props.page, nextStatus);
      setScreen(loaded);
    },
    [detailStatus, props.page],
  );

  function handleNavigate(page: string, params?: Record<string, string>): void {
    const toRoute = PAGE_ROUTES[page];
    if (!toRoute) {
      return;
    }
    navigate(toRoute(params));
  }

  async function handleRunAction(action: BduiAction, body?: Record<string, string>): Promise<unknown> {
    const isLogin = action.id === 'login';
    const response = await apiRequest<unknown>(action.path, {
      method: action.method,
      body: action.bodyFrom === 'form' ? body : undefined,
      auth: !isLogin,
      pathParams,
    });
    if (isLogin) {
      saveAuthTokens(response as AuthResponse);
    }
    if (action.navigateTo === 'forms.detail') {
      const created = response as { _id?: string };
      const nextFormId = created._id ?? formId;
      if (nextFormId) {
        navigate(`/forms/${nextFormId}`);
        return response;
      }
    }
    if (action.navigateTo === props.page && props.page === 'forms.detail' && detailStatus) {
      const loaded = await fetchUserScreen(props.page, detailStatus);
      setScreen(loaded);
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
    <SchemaRenderer
      screen={screen}
      pathParams={pathParams}
      onNavigate={handleNavigate}
      onRunAction={handleRunAction}
      onStatusLoaded={(nextStatus) => {
        void handleStatusLoaded(nextStatus);
      }}
    />
  );
}
