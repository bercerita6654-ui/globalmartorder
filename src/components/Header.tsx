import React from 'react';
import { ViewTab, GoogleSheetsConfig } from '../types';
import { Menu, RefreshCw, Calendar, Trash2, Sliders, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: ViewTab;
  onToggleSidebar: () => void;
  sheetsConfig: GoogleSheetsConfig;
  user?: User | null;
  onSync: () => void;
  isSyncing: boolean;
  onReset: () => void;
  onOpenSettings: () => void;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  sheetsConfig,
  user,
  onSync,
  isSyncing,
  onReset,
  onOpenSettings,
  onLoginGoogle,
  onLogoutGoogle
}) => {
  const pageTitles: Record<ViewTab, string> = {
    dashboard: 'Dashboard Analitik',
    produk: 'Katalog Produk Toko',
    stok: 'Mutasi & Riwayat Stok',
    keuangan: 'Buku Kas & Keuangan',
    customer: 'Daftar Nama Customer',
    pengiriman: 'Nota & Pengiriman Barang',
    purchase_order: 'Data Penjualan',
    laporan: 'Laporan & Export Data'
  };

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header 
      className="bg-white border-b border-slate-200/80 h-[41.9844px] flex items-center justify-between px-4 md:px-8 z-20 flex-shrink-0 shadow-xs"
      style={{ height: '41.9844px' }}
    >
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg focus:outline-none"
          onClick={onToggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-display font-bold text-slate-800 tracking-tight">
          {pageTitles[activeTab]}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Refresh Data from Spreadsheet Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl border transition-all bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 font-semibold shadow-xs"
          title="Refresh & Tarik Data Terbaru dari Google Spreadsheet"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="hidden sm:inline flex items-center gap-1">
            {isSyncing ? 'Memuat Data...' : 'Refresh Data'}
          </span>
        </button>

        {/* Date Display */}
        <div className="hidden md:flex items-center text-xs font-medium text-slate-500 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/70">
          <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-500" />
          <span>{currentDateFormatted}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="text-xs p-2 rounded-xl border border-slate-200/80 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors shadow-xs"
          title="Pengaturan Integrasi Google Sheet"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* User Account / Google Auth Status Badge */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-indigo-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {user.displayName?.charAt(0) || 'G'}
              </div>
            )}
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-bold text-slate-800 truncate max-w-[120px]">{user.displayName || 'Akun Google'}</p>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Google Connected
              </p>
            </div>
            {onLogoutGoogle && (
              <button
                onClick={onLogoutGoogle}
                className="text-xs p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Logout dari Akun Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          onLoginGoogle && (
            <button
              onClick={onLoginGoogle}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              title="Login dengan Google Account"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Login Google</span>
            </button>
          )
        )}
      </div>
    </header>
  );
};

