import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig, AppDatabase, AccountPermission } from '../types';
import { X, Sliders, RefreshCw, Database, FileSpreadsheet, Check, ExternalLink, Shield, Key, Trash2, UserPlus, Copy } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../lib/appScriptCode';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  db: AppDatabase;
  adminName?: string;
  onSaveConfig: (cfg: GoogleSheetsConfig) => void;
  onUpdateAccounts: (accounts: AccountPermission[]) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

const TARGET_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ/edit?gid=0#gid=0';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_Gge0e-AGGh1WcKJqXvu6cIH72eynlhajLmhFFfZu8JWt1nQjGyXUp0KgrnT41MIG/exec';

const ALL_TABS = [
  { id: 'dashboard', label: 'Dashboard Analitik' },
  { id: 'produk', label: 'Katalog Produk' },
  { id: 'stok', label: 'Mutasi Stok' },
  { id: 'keuangan', label: 'Kas & Keuangan' },
  { id: 'customer', label: 'Daftar Customer' },
  { id: 'pengiriman', label: 'Nota & Pengiriman' },
  { id: 'purchase_order', label: 'Penjualan' },
  { id: 'laporan', label: 'Laporan & Export' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  db,
  adminName,
  onSaveConfig,
  onUpdateAccounts,
  onSyncNow,
  isSyncing
}) => {
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl || DEFAULT_APPS_SCRIPT_URL);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl || TARGET_SPREADSHEET_URL);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Accounts & Permissions state from db
  const defaultAccounts: AccountPermission[] = [
    { username: 'SERVER', role: 'Super Admin (Full Access)', allowedTabs: ALL_TABS.map(t => t.id) },
    { username: 'admin', role: 'Administrator', allowedTabs: ALL_TABS.map(t => t.id) },
    { username: 'kasir', role: 'Kasir & Penjualan', allowedTabs: ['dashboard', 'produk', 'purchase_order', 'customer'] },
    { username: 'gudang', role: 'Staff Gudang & Stok', allowedTabs: ['dashboard', 'produk', 'stok'] }
  ];

  const [accounts, setAccounts] = useState<AccountPermission[]>(() => {
    return db.accounts && db.accounts.length > 0 ? db.accounts : defaultAccounts;
  });

  useEffect(() => {
    if (db.accounts && db.accounts.length > 0) {
      setAccounts(db.accounts);
    }
  }, [db.accounts]);

  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('Staff');
  const [selectedAccountForPerms, setSelectedAccountForPerms] = useState<string>('admin');

  const isServer = adminName?.toUpperCase() === 'SERVER';

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      webAppUrl: webAppUrl.trim(),
      spreadsheetUrl: spreadsheetUrl.trim() || TARGET_SPREADSHEET_URL,
      autoSync,
      lastSyncedAt: config.lastSyncedAt
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const usr = newUsername.trim();
    if (accounts.some(a => a.username.toLowerCase() === usr.toLowerCase())) {
      alert('Akun dengan username tersebut sudah ada.');
      return;
    }
    const updated = [
      ...accounts,
      { username: usr, role: newRole, allowedTabs: ['dashboard', 'produk'] }
    ];
    setAccounts(updated);
    onUpdateAccounts(updated);
    setNewUsername('');
    setNewRole('Staff');
  };

  const handleDeleteAccount = (username: string) => {
    if (username.toUpperCase() === 'SERVER') {
      alert('Akun SERVER tidak dapat dihapus.');
      return;
    }
    if (window.confirm(`Hapus akun ${username}?`)) {
      const updated = accounts.filter(a => a.username !== username);
      setAccounts(updated);
      onUpdateAccounts(updated);
    }
  };

  const handleToggleTab = (username: string, tabId: string) => {
    if (username.toUpperCase() === 'SERVER') return; // Server always has all permissions
    const updated = accounts.map(acc => {
      if (acc.username === username) {
        const hasTab = acc.allowedTabs.includes(tabId);
        const updatedTabs = hasTab
          ? acc.allowedTabs.filter(t => t !== tabId)
          : [...acc.allowedTabs, tabId];
        return { ...acc, allowedTabs: updatedTabs };
      }
      return acc;
    });
    setAccounts(updated);
    onUpdateAccounts(updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80 flex-shrink-0">
          <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" /> Pengaturan Sistem & Rekap Akses (Sheet ADMIN)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* SERVER Super Admin Permission Manager */}
          {isServer && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-amber-900 text-sm">Pusat Kontrol Akses & Rekap Sheet ADMIN (SERVER Mode)</h4>
              </div>
              <p className="text-xs text-amber-800">
                Sebagai akun SERVER, Anda menentukan hak akses menu untuk masing-masing user/admin. Perubahan akan otomatis direkap dan disinkronkan ke kolom AKSES pada sheet ADMIN di Google Spreadsheet.
              </p>

              {/* Add Account Form */}
              <form onSubmit={handleAddAccount} className="flex gap-2 items-end pt-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Username Baru
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: kasir2 / staff_gudang"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Role / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Kasir / Staff"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 h-8"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Akun
                </button>
              </form>

              {/* Account Tabs Selector */}
              <div className="space-y-3 pt-3 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" /> Pilih Akun untuk Diatur Aksesnya:
                  </span>
                  <select
                    value={selectedAccountForPerms}
                    onChange={(e) => setSelectedAccountForPerms(e.target.value)}
                    className="bg-white border border-amber-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {accounts.map(acc => (
                      <option key={acc.username} value={acc.username}>
                        {acc.username} ({acc.role}) {acc.username.toUpperCase() === 'SERVER' ? '[Full Access]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAccountForPerms.toUpperCase() === 'SERVER' ? (
                  <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-slate-600 italic">
                    Akun SERVER memiliki akses penuh ke seluruh menu secara otomatis dan tidak dapat dibatasi.
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Hak Akses Menu untuk Akun: <span className="text-indigo-600 font-mono">{selectedAccountForPerms}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_TABS.map(tab => {
                        const acc = accounts.find(a => a.username === selectedAccountForPerms);
                        const isAllowed = acc?.allowedTabs.includes(tab.id) || false;
                        return (
                          <label key={tab.id} className="flex items-center gap-2 p-2 rounded border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={() => handleToggleTab(selectedAccountForPerms, tab.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="font-medium text-slate-800">{tab.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(selectedAccountForPerms)}
                        className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Akun Ini
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Spreadsheet Input Form */}
          <form onSubmit={handleSave} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Spreadsheet Rekap Target
                </span>
                <a
                  href={spreadsheetUrl || TARGET_SPREADSHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <span>Buka Google Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                  URL atau ID Google Spreadsheet
                </label>
                <input
                  type="text"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ/edit"
                  className="input-futuristic text-xs font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                  URL Deployment Apps Script Web App
                </label>
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="input-futuristic text-xs font-mono bg-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white cursor-pointer"
                />
                <span className="text-xs font-medium text-indigo-900">
                  Otomatis rekap ke Google Sheets setiap kali ada transaksi / mutasi baru
                </span>
              </label>

              <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Kode Google Apps Script Auto-Penjualan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode Apps Script</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pasang kode ini pada Google Spreadsheet (<strong className="text-slate-200 font-mono">1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ</strong>) via menu <strong className="text-slate-200">Ekstensi &gt; Apps Script</strong> untuk merekap otomatis input penjualan ke sheet <strong className="text-emerald-400 font-mono">PENJUALAN</strong> &amp; memperbarui <strong className="text-sky-400 font-mono">STOCK LIST</strong>.
                </p>
                <details className="pt-1">
                  <summary className="text-[11px] font-semibold text-indigo-400 cursor-pointer hover:underline">
                    Lihat Pratinjau Kode Google Apps Script
                  </summary>
                  <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </details>
              </div>

              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div>
                  <p className="font-bold flex items-center gap-1">
                    <span>📦 INFORMASI STOCK LIST (`1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ`):</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Data produk & stok ditarik dari sheet <strong className="font-mono">STOCK LIST</strong> dengan pembagian Posisi Stock: <strong>TOKO</strong> (kolom QTY TOKO), <strong>GUDANG</strong> (kolom QTY GUDANG), dan <strong>PIRANHA</strong> (kolom QTY PIRANHA).
                  </p>
                </div>
                <div className="pt-1.5 border-t border-amber-200/60">
                  <p className="font-bold flex items-center gap-1">
                    <span>ℹ️ Catatan Sinkronisasi Sheet CUSTOMER &amp; PENJUALAN:</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Script Apps Script otomatis memproses sheet <strong className="font-mono">PENJUALAN</strong> (12 kolom) dan sheet <strong className="font-mono">CUSTOMER</strong> secara otomatis saat input disimpan.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Sync Trigger Action */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500">
                Status Last Sync:{' '}
                <span className="text-slate-800 font-bold font-mono">
                  {config.lastSyncedAt
                    ? new Date(config.lastSyncedAt).toLocaleString('id-ID')
                    : 'Belum pernah'}
                </span>
              </div>
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Mengirim Data...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" /> Pengaturan berhasil disimpan!
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="btn-neon px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4" /> Simpan Pengaturan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
