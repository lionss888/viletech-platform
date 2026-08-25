import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getAccessToken } from './api/client';
import { InvoiceContractPage } from './pages/InvoiceContractPage';
import { ScreenPage } from './pages/ScreenPage';

function RequireAuth(props: { children: JSX.Element }): JSX.Element {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return props.children;
}

export function App(): JSX.Element {
  const location = useLocation();
  const isInvoiceRoute = location.pathname === '/invoice';

  return (
    <div className={isInvoiceRoute ? 'bdui-app bdui-app--invoice' : 'bdui-app'}>
      <Routes>
        <Route path="/invoice" element={<InvoiceContractPage />} />
        <Route path="/login" element={<ScreenPage page="login" />} />
        <Route
          path="/forms"
          element={
            <RequireAuth>
              <ScreenPage page="forms.list" />
            </RequireAuth>
          }
        />
        <Route
          path="/forms/new"
          element={
            <RequireAuth>
              <ScreenPage page="forms.create" />
            </RequireAuth>
          }
        />
        <Route
          path="/forms/:id"
          element={
            <RequireAuth>
              <ScreenPage page="forms.detail" />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={getAccessToken() ? '/forms' : '/login'} replace />} />
      </Routes>
    </div>
  );
}
