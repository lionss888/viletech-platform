import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getAccessToken, getBduiRole } from './api/client';
import { InvoiceContractPage } from './pages/InvoiceContractPage';
import { ScreenPage } from './pages/ScreenPage';

function RequireAuth(props: { children: JSX.Element }): JSX.Element {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return props.children;
}

function DefaultHome(): JSX.Element {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  if (getBduiRole() === 'root') {
    return <Navigate to="/users" replace />;
  }
  return <Navigate to="/forms" replace />;
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
          path="/users"
          element={
            <RequireAuth>
              <ScreenPage page="users.list" />
            </RequireAuth>
          }
        />
        <Route
          path="/users/new"
          element={
            <RequireAuth>
              <ScreenPage page="users.create" />
            </RequireAuth>
          }
        />
        <Route
          path="/users/:userId"
          element={
            <RequireAuth>
              <ScreenPage page="users.detail" />
            </RequireAuth>
          }
        />
        <Route
          path="/directories"
          element={
            <RequireAuth>
              <ScreenPage page="directories.list" />
            </RequireAuth>
          }
        />
        <Route
          path="/directories/:orgId"
          element={
            <RequireAuth>
              <ScreenPage page="directories.detail" />
            </RequireAuth>
          }
        />
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
        <Route path="*" element={<DefaultHome />} />
      </Routes>
    </div>
  );
}
