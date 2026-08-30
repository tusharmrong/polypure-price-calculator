import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Static Fixed Sidebar on Desktop */}
      <Sidebar />

      {/* Main Application Column */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Static Fixed Top Header */}
        <Header />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-5 sm:px-6 md:pb-8 lg:px-8">
          <div className="mx-auto w-full max-w-[1760px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Static Fixed Bottom Navigation on Mobile */}
      <BottomNav />
    </div>
  )
}
