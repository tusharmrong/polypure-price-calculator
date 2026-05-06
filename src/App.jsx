import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Calculator from './pages/Calculator.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Invoice from './pages/Invoice.jsx'
import MoneyReceipt from './pages/MoneyReceipt.jsx'
import Quotation from './pages/Quotation.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="quotation" element={<Quotation />} />
        <Route path="invoice" element={<Invoice />} />
        <Route path="money-receipt" element={<MoneyReceipt />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
