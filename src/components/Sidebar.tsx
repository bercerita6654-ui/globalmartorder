import React from 'react';
import { ViewTab } from '../types';
import { User } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Wallet, 
  FileText, 
  X, 
  Layers, 
  Sliders,
  LogOut,
  UserCheck,
  Users,
  Truck,
  ShoppingCart
} from 'lucide-react';

interface SidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenSettings: () => void;
  user?: User | null;
  onLogoutGoogle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
  onOpenSettings,
  user,
  onLogoutGoogle
}) => {
  const menuItems: { id: ViewTab; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard Analitik', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'produk', label: 'Katalog Produk', icon: <Package className="w-5 h-5" /> },
    { id: 'stok', label: 'Mutasi Stok', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'keuangan', label: 'Kas & Keuangan', icon: <Wallet className="w-5 h-5" />, hidden: true },
    { id: 'customer', label: 'Daftar Customer', icon: <Users className="w-5 h-5" /> },
    { id: 'pengiriman', label: 'Nota & Pengiriman', icon: <Truck className="w-5 h-5" />, hidden: true },
    { id: 'purchase_order', label: 'Penjualan', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'laporan', label: 'Laporan & Export', icon: <FileText className="w-5 h-5" />, hidden: true },
  ];


  const currentAdmin = sessionStorage.getItem('globalMartAdmin') || 'Admin';
  const isSuper = currentAdmin.toUpperCase().includes('SERVER') || currentAdmin.toUpperCase() === 'ADMIN';

  let allowedTabs = menuItems.map(m => m.id);
  if (!isSuper) {
    try {
      const savedPerms = localStorage.getItem('globalMartAccountsPermissions');
      if (savedPerms) {
        const parsed = JSON.parse(savedPerms);
        const acc = parsed.find((a: any) => a.username.toLowerCase() === currentAdmin.toLowerCase());
        if (acc && Array.isArray(acc.allowedTabs)) {
          allowedTabs = acc.allowedTabs;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const filteredMenuItems = menuItems.filter(item => !item.hidden && (isSuper || allowedTabs.includes(item.id)));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col transition-transform duration-300 fixed md:relative z-50 h-full ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-wide flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-400 shrink-0" /> GLOBAL MART
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-widest mt-1 uppercase font-semibold">
              Login: {currentAdmin}
            </p>
          </div>
          <button
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            onClick={() => setIsOpenMobile(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto hide-scroll">
          {filteredMenuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpenMobile(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white bg-slate-800 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Admin Status & Settings button */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Pengaturan & Sync</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-800">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-indigo-500/50" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.displayName || 'Akun Google'}</p>
                <p className="text-[10px] text-indigo-400 font-mono truncate">{user.email}</p>
              </div>
              {onLogoutGoogle && (
                <button
                  onClick={onLogoutGoogle}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Keluar dari Google Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow-sm">
                <UserCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-300 truncate">Mode Akses</p>
                <p className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{' '}
                  Belum Otorisasi
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
