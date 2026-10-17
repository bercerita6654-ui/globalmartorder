import React, { useState } from 'react';
import { AppDatabase } from '../types';
import { ArrowDownLeft, ArrowUpRight, Search, ArrowLeftRight, Trash2, Building2, Warehouse, Store, Boxes, ChevronDown, ChevronUp } from 'lucide-react';
import { getProductStockInfo, formatStockNum } from '../lib/stockHelper';

interface StokViewProps {
  db: AppDatabase;
  onOpenModalStok: (tipe: 'MASUK' | 'KELUAR') => void;
  onDeleteStok?: (id: string) => void;
}

export const StokView: React.FC<StokViewProps> = ({ db, onOpenModalStok, onDeleteStok }) => {
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');

  const currentAdmin = sessionStorage.getItem('globalMartAdmin') || 'Admin';
  const isServer = currentAdmin.toUpperCase().includes('SERVER');

  const handleDeleteStokLog = (id: string) => {
    if (!isServer) {
      alert(`Akses Ditolak!\n\nFitur delete mutasi stok hanya bisa dilakukan oleh akun SERVER.\nAkun aktif saat ini: "${currentAdmin}".`);
      return;
    }
    if (window.confirm('Hapus entri mutasi stok ini?')) {
      onDeleteStok?.(id);
    }
  };

  const filteredLogs = db.stok
    .filter((s) => {
      const prod = db.produk.find((p) => p.id === s.idProduk);
      const prodName = prod?.nama || '';
      const prodSku = prod?.sku || '';

      const matchSearch =
        prodName.toLowerCase().includes(search.toLowerCase()) ||
        prodSku.toLowerCase().includes(search.toLowerCase()) ||
        s.keterangan.toLowerCase().includes(search.toLowerCase());

      const matchTipe = filterTipe === 'ALL' || s.tipe === filterTipe;

      return matchSearch && matchTipe;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [showStockBreakdown, setShowStockBreakdown] = useState(true);

  const stockSummary = db.produk.map((p) => ({
    produk: p,
    ...getProductStockInfo(p, db.stok)
  }));

  const totalToko = stockSummary.reduce((acc, curr) => acc + curr.toko, 0);
  const totalGudang = stockSummary.reduce((acc, curr) => acc + curr.gudang, 0);
  const totalPiranha = stockSummary.reduce((acc, curr) => acc + curr.piranha, 0);
  const grandTotal = totalToko + totalGudang + totalPiranha;

  return (
    <div className="space-y-6">
      {/* Informasi Stock List & Posisi Stock Section */}
      <div className="glass-panel p-5 space-y-4 border-t-4 border-t-indigo-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-slate-800 text-base sm:text-lg">
                INFORMASI STOCK LIST
              </h3>
              <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200">
                Sheet: 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Posisi Stock terbagi 3 lokasi: <strong>TOKO</strong> (kolom QTY TOKO), <strong>GUDANG</strong> (kolom QTY GUDANG), dan <strong>PIRANHA</strong> (kolom QTY PIRANHA).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowStockBreakdown(!showStockBreakdown)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <span>{showStockBreakdown ? 'Sembunyikan Tabel Posisi' : 'Tampilkan Tabel Posisi'}</span>
            {showStockBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 3 Posisi Stock Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* TOKO */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                POSISI TOKO (QTY TOKO)
              </span>
              <p className="text-xl font-bold font-mono text-blue-950 mt-0.5">
                {formatStockNum(totalToko)}
              </p>
              <span className="text-[10px] text-blue-600 font-medium">Unit di Toko Fisik</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Store className="w-5 h-5" />
            </div>
          </div>

          {/* GUDANG */}
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                POSISI GUDANG (QTY GUDANG)
              </span>
              <p className="text-xl font-bold font-mono text-purple-950 mt-0.5">
                {formatStockNum(totalGudang)}
              </p>
              <span className="text-[10px] text-purple-600 font-medium">Unit di Gudang Utama</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>

          {/* PIRANHA */}
          <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                POSISI PIRANHA (QTY PIRANHA)
              </span>
              <p className="text-xl font-bold font-mono text-teal-950 mt-0.5">
                {formatStockNum(totalPiranha)}
              </p>
              <span className="text-[10px] text-teal-600 font-medium">Unit di Cabang Piranha</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* TOTAL SEMUA */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                TOTAL KESELURUHAN
              </span>
              <p className="text-xl font-bold font-mono text-indigo-950 mt-0.5">
                {formatStockNum(grandTotal)}
              </p>
              <span className="text-[10px] text-indigo-600 font-medium">Akumulasi Semua Lokasi</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Breakdown Table Per Product */}
        {showStockBreakdown && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-4">Nama Produk</th>
                  <th className="py-2.5 px-3 text-center text-blue-700 bg-blue-50/60">QTY TOKO</th>
                  <th className="py-2.5 px-3 text-center text-purple-700 bg-purple-50/60">QTY GUDANG</th>
                  <th className="py-2.5 px-3 text-center text-teal-700 bg-teal-50/60">QTY PIRANHA</th>
                  <th className="py-2.5 px-3 text-right bg-indigo-50/60 text-indigo-900">Total Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockSummary.map((item) => (
                  <tr key={item.produk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{item.produk.sku}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{item.produk.nama}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-900 bg-blue-50/30">
                      {formatStockNum(item.toko)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-900 bg-purple-50/30">
                      {formatStockNum(item.gudang)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-900 bg-teal-50/30">
                      {formatStockNum(item.piranha)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                      {formatStockNum(item.total)} {item.produk.satuan || 'Pcs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Action Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-6 flex items-center justify-between border-l-4 border-l-indigo-600">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-lg">Barang Masuk</h3>
            <p className="text-xs text-slate-500 mt-1">Catat penambahan stok (Restock/Beli Supplier)</p>
          </div>
          <button
            onClick={() => onOpenModalStok('MASUK')}
            className="bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" /> Catat Masuk
          </button>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-lg">Barang Keluar</h3>
            <p className="text-xs text-slate-500 mt-1">Catat pengurangan stok (Terjual/Rusak)</p>
          </div>
          <button
            onClick={() => onOpenModalStok('KELUAR')}
            className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" /> Catat Keluar
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama barang, SKU, atau keterangan mutasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-futuristic pl-10 text-sm"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value as any)}
            className="input-futuristic text-sm cursor-pointer"
          >
            <option value="ALL" className="bg-white text-slate-800">
              Semua Mutasi ({db.stok.length})
            </option>
            <option value="MASUK" className="bg-white text-slate-800">
              Barang Masuk
            </option>
            <option value="KELUAR" className="bg-white text-slate-800">
              Barang Keluar
            </option>
          </select>
        </div>
      </div>

      {/* Mutations Section */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-display font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600 shrink-0" /> Log Riwayat Mutasi Stok
          </h3>
          <span className="text-xs font-medium text-slate-500">Total {filteredLogs.length} Entri</span>
        </div>

        {/* Mobile Cards (Visible on screens < md) */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Belum ada riwayat mutasi stok.
            </div>
          ) : (
            filteredLogs.map((s) => {
              const prod = db.produk.find((p) => p.id === s.idProduk) || {
                nama: '[Produk Dihapus]',
                kategori: '-',
                satuan: '-',
                isiKarton: '-'
              };
              const isMasuk = s.tipe === 'MASUK';
              const badgeClass = isMasuk
                ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80';

              return (
                <div key={s.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                        {isMasuk ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {s.tipe}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">{formatDate(s.date)}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                        {isMasuk ? '+' : '-'}{s.jumlah} {prod.satuan || 'Pcs'}
                      </span>
                      {s.totalNilai ? (
                        <p className="text-xs font-bold font-mono text-slate-900 mt-1">{formatRupiah(s.totalNilai)}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800 text-sm">{prod.nama}</p>
                    {s.keterangan && (
                      <p className="text-xs text-slate-500 mt-0.5">{s.keterangan}</p>
                    )}
                  </div>

                  {onDeleteStok && (
                    <div className="flex justify-end pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          if (window.confirm('Hapus catatan mutasi stok ini?')) {
                            onDeleteStok(s.id);
                          }
                        }}
                        className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Catatan
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (Visible on screens >= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-4">Waktu</th>
                <th className="px-4 py-4">Tipe Transaksi</th>
                <th className="px-4 py-4">POSISI</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-4 py-4 text-center">Qty</th>
                <th className="px-4 py-4 text-right">Harga</th>
                <th className="px-4 py-4">Jenis Harga</th>
                <th className="px-4 py-4 text-right">Total</th>
                <th className="px-4 py-4">Keterangan</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-slate-400">
                    Belum ada riwayat mutasi stok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((s) => {
                  const prod = db.produk.find((p) => p.id === s.idProduk) || {
                    sku: '-',
                    nama: '[Produk Dihapus]',
                    kategori: '-',
                    satuan: 'Pcs',
                    isiKarton: '-'
                  };
                  const isMasuk = s.tipe === 'MASUK';
                  const badgeClass = isMasuk
                    ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 text-slate-500 text-xs font-medium">{formatDate(s.date)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border inline-flex items-center gap-1 ${badgeClass}`}
                        >
                          {isMasuk ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {s.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 text-xs">
                        {s.posisi || 'Utama'}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-indigo-600 font-bold">
                        {prod.sku || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{prod.nama}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800">{s.jumlah} {prod.satuan || 'Pcs'}</td>
                      <td className="px-4 py-4 text-right text-slate-600 font-mono text-xs">
                        {formatRupiah(s.harga || 0)}
                      </td>
                      <td className="px-4 py-4 text-slate-600 text-xs font-medium">
                        {s.jenisHarga || 'Umum'}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-bold font-mono text-xs ${
                          isMasuk ? 'text-indigo-600' : 'text-amber-600'
                        }`}
                      >
                        {formatRupiah((s.harga || 0) * s.jumlah)}
                      </td>
                      <td className="px-4 py-4 text-slate-600 text-xs truncate max-w-xs">
                        {s.keterangan || '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {onDeleteStok && (
                          <button
                            onClick={() => onDeleteStok(s.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Entri Mutasi Stok"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
