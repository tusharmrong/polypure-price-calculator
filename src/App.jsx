import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Calculator from './pages/Calculator.jsx'
import Clients from './pages/Clients.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Invoice from './pages/Invoice.jsx'
import Login from './pages/Login.jsx'
import MoneyReceipt from './pages/MoneyReceipt.jsx'
import Quotation from './pages/Quotation.jsx'
import Settings from './pages/Settings.jsx'
import Users from './pages/Users.jsx'
import { PERMISSIONS } from './utils/permissions.js'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route
        element={(
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Dashboard />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="quotation" element={<Quotation />} />
        <Route path="invoice" element={<Invoice />} />
        <Route path="money-receipt" element={<MoneyReceipt />} />
        <Route
          path="clients"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_CLIENTS}>
              <Clients />
            </ProtectedRoute>
          )}
        />
        <Route
          path="users"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_USERS}>
              <Users />
            </ProtectedRoute>
          )}
        />
        <Route
          path="history"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_HISTORY}>
              <History />
            </ProtectedRoute>
          )}
        />
        <Route
          path="settings"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_SETTINGS}>
              <Settings />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
