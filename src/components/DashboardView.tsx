import React from 'react';
import { AppDatabase, ViewTab } from '../types';
import { 
  Package, 
  Boxes, 
  Wallet, 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  MinusCircle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: ViewTab) => void;
  onOpenModalStok: (tipe: 'MASUK' | 'KELUAR') => void;
  onOpenModalKeuangan: (tipe: 'MASUK' | 'KELUAR') => void;
  onOpenModalProduk: () => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  onNavigate,
  onOpenModalStok,
  onOpenModalKeuangan,
  onOpenModalProduk,
  onRefresh
}) => {
  // 1. Calculate Metrics
  const totalProduk = db.produk.length;

  let totalStok = 0;
  db.produk.forEach((p) => {
    const masuk = db.stok
      .filter((s) => s.idProduk === p.id && s.tipe === 'MASUK')
      .reduce((a, b) => a + b.jumlah, 0);
    const keluar = db.stok
      .filter((s) => s.idProduk === p.id && s.tipe === 'KELUAR')
      .reduce((a, b) => a + b.jumlah, 0);
    totalStok += masuk - keluar;
  });

  const saldoKas = db.keuangan.reduce(
    (acc, curr) => (curr.tipe === 'MASUK' ? acc + curr.nominal : acc - curr.nominal),
    0
  );

  const todayIso = new Date().toISOString().split('T')[0];
  const trxHariIni =
    db.keuangan.filter((k) => k.date.startsWith(todayIso)).length +
    db.stok.filter((s) => s.date.startsWith(todayIso)).length;

  // 2. Prepare Last 7 Days Cash Flow Chart Data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const cashflowData = last7Days.map((dateStr) => {
    const pemasukan = db.keuangan
      .filter((k) => k.date.startsWith(dateStr) && k.tipe === 'MASUK')
      .reduce((sum, k) => sum + k.nominal, 0);
    const pengeluaran = db.keuangan
      .filter((k) => k.date.startsWith(dateStr) && k.tipe === 'KELUAR')
      .reduce((sum, k) => sum + k.nominal, 0);

    const d = new Date(dateStr);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;

    return {
      date: label,
      Pemasukan: pemasukan,
      Pengeluaran: pengeluaran
    };
  });

  // 3. Category Breakdown Data
  const categoryCounts: Record<string, number> = {};
  db.produk.forEach((p) => {
    categoryCounts[p.kategori] = (categoryCounts[p.kategori] || 0) + 1;
  });

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#ec4899'];
  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    value: categoryCounts[cat]
  }));

  // 4. Recent Activities (combining cash and stock logs)
  const recentActivities = [
    ...db.keuangan.map((k) => ({
      id: k.id,
      date: k.date,
      tipe: k.tipe,
      cat: 'keuangan' as const,
      keterangan: k.keterangan,
      value: k.nominal
    })),
    ...db.stok.map((s) => {
      const prod = db.produk.find((p) => p.id === s.idProduk);
      return {
        id: s.id,
        date: s.date,
        tipe: s.tipe,
        cat: 'stok' as const,
        keterangan: `${s.tipe === 'MASUK' ? 'Restock' : 'Keluar'}: ${prod?.nama || 'Produk'} (${s.jumlah} Unit)`,
        value: s.jumlah
      };
    })
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass-panel">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Aksi Cepat
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenModalProduk}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80 border border-indigo-200/70 transition-all shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + Produk
          </button>
          <button
            onClick={() => onOpenModalStok('MASUK')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100/80 border border-sky-200/70 transition-all shadow-2xs"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Stok Masuk
          </button>
          <button
            onClick={() => onOpenModalStok('KELUAR')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-200/70 transition-all shadow-2xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Stok Keluar
          </button>
          <button
            onClick={() => onOpenModalKeuangan('MASUK')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/70 transition-all shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Uang Masuk
          </button>
          <button
            onClick={() => onOpenModalKeuangan('KELUAR')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/70 transition-all shadow-2xs"
          >
            <MinusCircle className="w-3.5 h-3.5" /> Uang Keluar
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produk */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Produk</p>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-2">{totalProduk}</h3>
          <div className="flex items-center text-xs font-bold text-sky-700 bg-sky-50 w-max px-2.5 py-1 rounded-full border border-sky-200/80">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Katalog Aktif
          </div>
        </div>

        {/* Total Stok */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Stok Keseluruhan</p>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-2">{totalStok}</h3>
          <div className="flex items-center text-xs font-bold text-purple-700 bg-purple-50 w-max px-2.5 py-1 rounded-full border border-purple-200/80">
            <Boxes className="w-3.5 h-3.5 mr-1.5" /> Unit Tersedia
          </div>
        </div>

        {/* Saldo Kas */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Saldo Kas Saat Ini</p>
          <h3 className="text-2xl lg:text-3xl font-display font-bold text-indigo-600 mb-2">
            {formatRupiah(saldoKas)}
          </h3>
          <div className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 w-max px-2.5 py-1 rounded-full border border-emerald-200/80">
            <Wallet className="w-3.5 h-3.5 mr-1.5" /> Kas Toko
          </div>
        </div>

        {/* Transaksi Hari Ini */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Transaksi Hari Ini</p>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-2">{trxHariIni}</h3>
          <div className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 w-max px-2.5 py-1 rounded-full border border-amber-200/80">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Mutasi & Cash
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash flow Chart */}
        <div className="glass-panel p-5 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800">Tren Arus Kas (7 Hari Terakhir)</h3>
              <p className="text-xs text-slate-500">Pemasukan vs Pengeluaran dalam Rupiah</p>
            </div>
            <button
              onClick={() => onNavigate('keuangan')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Detail Kas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: any) => [formatRupiah(Number(value) || 0)]}
                />
                <Area
                  type="monotone"
                  dataKey="Pemasukan"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMasuk)"
                />
                <Area
                  type="monotone"
                  dataKey="Pengeluaran"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorKeluar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="glass-panel p-5 flex flex-col">
          <h3 className="font-display font-bold text-slate-800 mb-0.5">Distribusi Kategori Produk</h3>
          <p className="text-xs text-slate-500 mb-4">Proporsi item per kategori</p>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-xs text-slate-400">Belum ada data kategori.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-display font-bold text-slate-800">Aktivitas & Mutasi Terakhir</h3>
          <button
            onClick={() => onNavigate('stok')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Lihat Semua Mutasi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Nilai
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                    Belum ada aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                recentActivities.map((act) => {
                  const isMasuk = act.tipe === 'MASUK';
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                          }`}
                        >
                          {act.cat === 'keuangan' ? (
                            <Wallet className="w-3 h-3" />
                          ) : (
                            <Package className="w-3 h-3" />
                          )}
                          {act.tipe}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-800 font-medium truncate max-w-xs">
                        {act.keterangan}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold ${
                          isMasuk ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isMasuk ? '+' : '-'}
                        {act.cat === 'keuangan'
                          ? formatRupiah(act.value)
                          : `${act.value} Unit`}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                        {formatDateShort(act.date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
