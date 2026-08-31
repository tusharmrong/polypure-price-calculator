import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useOffline } from './utils/offlineMode.jsx'
import { PERMISSIONS } from './utils/permissions.js'

// Dynamic lazy-loaded routes for instant initial startup
const Calculator = lazy(() => import('./pages/Calculator.jsx'))
const Clients = lazy(() => import('./pages/Clients.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const Invoice = lazy(() => import('./pages/Invoice.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const MoneyReceipt = lazy(() => import('./pages/MoneyReceipt.jsx'))
const Quotation = lazy(() => import('./pages/Quotation.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const Expenses = lazy(() => import('./pages/Expenses.jsx'))
const FactoryCosting = lazy(() => import('./pages/FactoryCosting.jsx'))
const Production = lazy(() => import('./pages/Production.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Users = lazy(() => import('./pages/Users.jsx'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

export default function App() {
  const { isOffline } = useOffline()

  return (
    <Suspense fallback={<PageFallback />}>
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
          <Route
            path="*"
            element={<Navigate replace to={isOffline ? '/calculator' : '/'} />}
          />
        </Route>
      </Routes>
    </Suspense>
  )
}
