import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 md:pb-10 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
