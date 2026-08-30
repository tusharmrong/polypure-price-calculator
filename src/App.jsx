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
import Reports from './pages/Reports.jsx'
import Expenses from './pages/Expenses.jsx'
import FactoryCosting from './pages/FactoryCosting.jsx'
import Production from './pages/Production.jsx'
import Settings from './pages/Settings.jsx'
import Users from './pages/Users.jsx'
import { useOffline } from './utils/offlineMode.jsx'
import { PERMISSIONS } from './utils/permissions.js'

export default function App() {
  const { isOffline } = useOffline()

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
        <Route
          index
          element={
            isOffline ? (
              <Navigate replace to="/calculator" />
            ) : (
              <ProtectedRoute permission={PERMISSIONS.VIEW_DASHBOARD}>
                <Dashboard />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="calculator"
          element={(
            <ProtectedRoute permission={PERMISSIONS.USE_CALCULATOR}>
              <Calculator />
            </ProtectedRoute>
          )}
        />
        <Route
          path="quotation"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_QUOTATIONS}>
              <Quotation />
            </ProtectedRoute>
          )}
        />
        <Route
          path="invoice"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_INVOICES}>
              <Invoice />
            </ProtectedRoute>
          )}
        />
        <Route
          path="money-receipt"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_RECEIPTS}>
              <MoneyReceipt />
            </ProtectedRoute>
          )}
        />
        <Route
          path="expenses"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_EXPENSES}>
              <Expenses />
            </ProtectedRoute>
          )}
        />
        <Route
          path="clients"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_CLIENTS}>
              <Clients />
            </ProtectedRoute>
          )}
        />
        <Route
          path="reports"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_REPORTS}>
              <Reports />
            </ProtectedRoute>
          )}
        />
        <Route
          path="factory-costing"
          element={(
            <ProtectedRoute permission={PERMISSIONS.MANAGE_FACTORY_COST}>
              <FactoryCosting />
            </ProtectedRoute>
          )}
        />
        <Route
          path="production"
          element={(
            <ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTION}>
              <Production />
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
        <Route path="*" element={<Navigate to={isOffline ? '/calculator' : '/'} replace />} />
      </Route>
    </Routes>
  )
}
