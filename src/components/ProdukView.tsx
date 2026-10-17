import React, { useState } from 'react';
import { AppDatabase, Produk } from '../types';
import { Search, Plus, Trash2, Edit, Package, Layers, Image as ImageIcon } from 'lucide-react';
import { getProductStockInfo, formatStockNum } from '../lib/stockHelper';

interface ProdukViewProps {
  db: AppDatabase;
  onOpenAddModal: () => void;
  onOpenEditModal: (p: Produk) => void;
  onDeleteProduk: (id: string) => void;
  onQuickStok: (p: Produk, tipe: 'MASUK' | 'KELUAR') => void;
}

export const ProdukView: React.FC<ProdukViewProps> = ({
  db,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteProduk,
  onQuickStok
}) => {
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('ALL');

  // Categories list
  const categories = Array.from(new Set(db.produk.map((p) => p.kategori).filter(Boolean)));

  const getStockInfo = (p: Produk) => {
    return getProductStockInfo(p, db.stok);
  };

  const getSisaStok = (prodId: string) => {
    const prod = db.produk.find((p) => p.id === prodId);
    if (prod) return getStockInfo(prod).total;
    const masuk = db.stok
      .filter((s) => s.idProduk === prodId && s.tipe === 'MASUK')
      .reduce((a, b) => a + b.jumlah, 0);
    const keluar = db.stok
      .filter((s) => s.idProduk === prodId && s.tipe === 'KELUAR')
      .reduce((a, b) => a + b.jumlah, 0);
    return Math.max(0, masuk - keluar);
  };

  // Filtered products
  const filteredProducts = db.produk.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.merk && p.merk.toLowerCase().includes(search.toLowerCase())) ||
      p.kategori.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedKategori === 'ALL' || p.kategori === selectedKategori;
    return matchSearch && matchCat;
  });

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" /> Katalog Produk
            </h3>
            <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200">
              Sheet: 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-1.5">
            <span>Posisi Stock:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">TOKO (kolom QTY TOKO)</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">GUDANG (kolom QTY GUDANG)</span>
            <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">PIRANHA (kolom QTY PIRANHA)</span>
          </p>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan SKU, Nama Produk, Merk, Kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-futuristic pl-10 text-sm"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="input-futuristic text-sm cursor-pointer"
          >
            <option value="ALL" className="bg-white text-slate-800">
              Semua Kategori ({db.produk.length})
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-white text-slate-800">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Catalog Cards (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2 animate-pulse" />
            Tidak ada produk yang cocok dengan pencarian.
          </div>
        ) : (
          filteredProducts.map((p) => {
            const stockInfo = getStockInfo(p);
            const sisa = stockInfo.total;
            const minStok = p.minStok ?? 5;

            let stokBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
            if (sisa <= 0) {
              stokBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse';
            } else if (sisa <= minStok) {
              stokBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80';
            }

            return (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center">
                    {p.foto ? (
                      <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {p.sku}
                      </span>
                      {p.merk && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                          {p.merk}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm truncate">{p.nama}</h4>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Kategori: <strong className="text-slate-700">{p.kategori || 'Umum'}</strong></span>
                    <span className={`font-bold font-mono px-2 py-0.5 rounded text-xs border ${stokBadgeColor}`}>
                      Total: {formatStockNum(sisa)} {p.satuan || 'Pcs'}
                    </span>
                  </div>

                  {/* Posisi Stock Breakdown: TOKO, GUDANG, PIRANHA */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1 border-t border-slate-200">
                    <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-200">
                      <span className="font-bold text-blue-800 uppercase block text-[9px]">TOKO</span>
                      <span className="font-mono font-bold text-blue-950 text-xs">{formatStockNum(stockInfo.toko)}</span>
                    </div>
                    <div className="bg-purple-50/70 p-1.5 rounded-lg border border-purple-200">
                      <span className="font-bold text-purple-800 uppercase block text-[9px]">GUDANG</span>
                      <span className="font-mono font-bold text-purple-950 text-xs">{formatStockNum(stockInfo.gudang)}</span>
                    </div>
                    <div className="bg-teal-50/70 p-1.5 rounded-lg border border-teal-200">
                      <span className="font-bold text-teal-800 uppercase block text-[9px]">PIRANHA</span>
                      <span className="font-mono font-bold text-teal-950 text-xs">{formatStockNum(stockInfo.piranha)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-1">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase block">HPP</span>
                    <span className="font-mono font-semibold text-slate-700">{formatRupiah(p.hpp || 0)}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase block">Eceran</span>
                    <span className="font-mono font-bold text-indigo-600">{formatRupiah(p.eceran || p.harga || 0)}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase block">Grosir / Partai</span>
                    <span className="font-mono text-slate-700 text-[10px]">{formatRupiah(p.grosir || 0)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onQuickStok(p, 'MASUK')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    + Stok
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Catalog Table (Visible on screens >= md) */}
      <div className="hidden md:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-4 text-center">Foto</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-4 py-4">Kategori</th>
                <th className="px-4 py-4">Merk</th>
                <th className="px-4 py-4 text-right">HPP</th>
                <th className="px-4 py-4 text-right">Eceran</th>
                <th className="px-4 py-4 text-right">Grosir</th>
                <th className="px-4 py-4 text-right">Partai</th>
                <th className="px-4 py-4 text-center min-w-[200px]">Posisi Stock (TOKO / GUDANG / PIRANHA)</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-pulse" />
                    Tidak ada produk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockInfo = getStockInfo(p);
                  const sisa = stockInfo.total;
                  const minStok = p.minStok ?? 5;

                  let stokBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                  if (sisa <= 0) {
                    stokBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse';
                  } else if (sisa <= minStok) {
                    stokBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden mx-auto border border-slate-200 flex items-center justify-center">
                          {p.foto ? (
                            <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-indigo-600 font-bold">
                        {p.sku}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{p.nama}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 text-slate-600">
                          {p.kategori || 'Umum'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {p.merk || '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600 font-mono text-xs">
                        {formatRupiah(p.hpp || 0)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-900 font-mono font-bold">
                        {formatRupiah(p.eceran || p.harga || 0)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-700 font-mono text-xs">
                        {formatRupiah(p.grosir || 0)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-700 font-mono text-xs">
                        {formatRupiah(p.partai || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[11px] min-w-[190px]">
                            <div className="bg-blue-50 px-1.5 py-1 rounded border border-blue-200">
                              <span className="text-xs font-bold text-blue-700 block" style={{ fontSize: '12px' }}>TOKO</span>
                              <span className="font-mono font-bold text-blue-950 block" style={{ fontSize: '15px' }}>{formatStockNum(stockInfo.toko)}</span>
                            </div>
                            <div className="bg-purple-50 px-1.5 py-1 rounded border border-purple-200">
                              <span className="text-xs font-bold text-purple-700 block" style={{ fontSize: '12px' }}>GUDANG</span>
                              <span className="font-mono font-bold text-purple-950 block" style={{ fontSize: '15px' }}>{formatStockNum(stockInfo.gudang)}</span>
                            </div>
                            <div className="bg-teal-50 px-1.5 py-1 rounded border border-teal-200">
                              <span className="text-xs font-bold text-teal-700 block" style={{ fontSize: '12px' }}>PIRANHA</span>
                              <span className="font-mono font-bold text-teal-950 block" style={{ fontSize: '15px' }}>{formatStockNum(stockInfo.piranha)}</span>
                            </div>
                          <div className="flex items-center justify-between bg-slate-100/80 px-2 py-1 rounded border border-slate-200 text-slate-800 font-semibold">
                            <span className="text-xs text-slate-600 font-bold uppercase" style={{ fontSize: '12px' }}>Total Stock:</span>
                            <span className="font-mono font-bold text-indigo-700" style={{ fontSize: '15px' }}>{formatStockNum(sisa)} {p.satuan || 'Pcs'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onQuickStok(p, 'MASUK')}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                            title="Tambah Stok"
                          >
                            + Stok
                          </button>
                        </div>
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
