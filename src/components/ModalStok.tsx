import React, { useState, useEffect } from 'react';
import { Produk, TipeMutasi } from '../types';
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { fetchSheetCsv } from '../lib/googleSheets';

interface ModalStokProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    idProduk: string;
    tipe: TipeMutasi;
    jumlah: number;
    harga: number;
    keterangan: string;
    autoRecordCash: boolean;
    posisi: string;
    jenisHarga: string;
  }) => void;
  tipe: TipeMutasi;
  produkList: Produk[];
  preselectedProduct?: Produk | null;
}

export const ModalStok: React.FC<ModalStokProps> = ({
  isOpen,
  onClose,
  onSave,
  tipe,
  produkList,
  preselectedProduct
}) => {
  const [selectedProdId, setSelectedProdId] = useState('');
  const [jumlah, setJumlah] = useState<number | ''>('');
  const [harga, setHarga] = useState<number | ''>('');
  const [jenisHarga, setJenisHarga] = useState<'ECERAN' | 'GROSIR' | 'PARTAI' | 'HPP'>('ECERAN');
  const [posisiList, setPosisiList] = useState<string[]>(['TOKO', 'GUDANG', 'PIRANHA']);
  const [selectedPosisi, setSelectedPosisi] = useState('TOKO');
  const [jenisMasuk, setJenisMasuk] = useState<'PEMBELIAN' | 'STOK_AWAL'>('PEMBELIAN');
  const [keterangan, setKeterangan] = useState('');
  const [autoRecordCash, setAutoRecordCash] = useState(true);

  // Fetch POSISI list from sheet on mount
  useEffect(() => {
    fetchSheetCsv('1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ', 'POSISI').then((rows) => {
      if (rows && rows.length > 0) {
        const items = rows.flat().filter(Boolean).filter(val => val !== 'POSISI' && val !== 'Posisi');
        if (items.length > 0) {
          const merged = Array.from(new Set(['TOKO', 'GUDANG', 'PIRANHA', ...items]));
          setPosisiList(merged);
        }
      }
    }).catch(() => {
      // fallback
    });
  }, []);

  const selectedProd = produkList.find((p) => p.id === selectedProdId);

  const updatePrice = (prod: Produk, jHarga: 'ECERAN' | 'GROSIR' | 'PARTAI' | 'HPP') => {
    if (jHarga === 'HPP') {
      setHarga(prod.hpp || prod.harga || 0);
    } else if (jHarga === 'GROSIR') {
      setHarga(prod.grosir || prod.eceran || prod.harga || 0);
    } else if (jHarga === 'PARTAI') {
      setHarga(prod.partai || prod.grosir || prod.eceran || prod.harga || 0);
    } else {
      setHarga(prod.eceran || prod.harga || 0); // ECERAN
    }
  };

  const handleJenisMasukChange = (val: 'PEMBELIAN' | 'STOK_AWAL') => {
    setJenisMasuk(val);
    setAutoRecordCash(val === 'PEMBELIAN');
  };

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProdId(preselectedProduct.id);
      setJenisHarga('ECERAN');
      updatePrice(preselectedProduct, 'ECERAN');
    } else if (produkList.length > 0 && !selectedProdId) {
      setSelectedProdId(produkList[0].id);
      setJenisHarga('ECERAN');
      updatePrice(produkList[0], 'ECERAN');
    }
    setJumlah('');
    setJenisMasuk('PEMBELIAN');
    setKeterangan('');
    setAutoRecordCash(true);
  }, [isOpen, preselectedProduct, produkList]);

  const handleProductChange = (id: string) => {
    setSelectedProdId(id);
    const prod = produkList.find((p) => p.id === id);
    if (prod) {
      updatePrice(prod, jenisHarga);
    }
  };

  const handleJenisHargaChange = (jHarga: 'ECERAN' | 'GROSIR' | 'PARTAI' | 'HPP') => {
    setJenisHarga(jHarga);
    if (selectedProd) {
      updatePrice(selectedProd, jHarga);
    }
  };

  if (!isOpen) return null;

  const numJumlah = Number(jumlah) || 0;
  const numHarga = Number(harga) || 0;
  const totalNilai = numJumlah * numHarga;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || numJumlah <= 0) return;

    let finalKeterangan = keterangan.trim();
    if (isMasuk) {
      const labelJenis = jenisMasuk === 'PEMBELIAN' ? 'Pembelian Barang' : 'Stok Awal';
      finalKeterangan = finalKeterangan ? `[${labelJenis}] ${finalKeterangan}` : labelJenis;
    } else {
      finalKeterangan = finalKeterangan || 'Penjualan Barang';
    }

    onSave({
      idProduk: selectedProdId,
      tipe,
      jumlah: numJumlah,
      harga: numHarga,
      keterangan: finalKeterangan,
      autoRecordCash: isMasuk ? (jenisMasuk === 'PEMBELIAN') : autoRecordCash,
      posisi: selectedPosisi,
      jenisHarga
    });
    onClose();
  };

  const isMasuk = tipe === 'MASUK';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
            {isMasuk ? (
              <ArrowDownLeft className="w-5 h-5 text-indigo-600" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-amber-600" />
            )}
            {isMasuk ? 'Catat Barang Masuk (Restock)' : 'Catat Barang Keluar (Terjual)'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Pilih Produk
            </label>
            <select
              value={selectedProdId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="input-futuristic text-sm cursor-pointer"
              required
            >
              <option value="" disabled className="bg-white text-slate-400">
                -- Pilih Produk --
              </option>
              {produkList.map((p) => (
                <option key={p.id} value={p.id} className="bg-white text-slate-800">
                  {p.sku} - {p.nama} ({p.satuan || 'Pcs'})
                </option>
              ))}
            </select>
            {selectedProd && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-[10px] text-slate-500 font-semibold">Stok Saat Ini:</span>
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${selectedPosisi === 'TOKO' ? 'bg-blue-100 text-blue-900 border-blue-400 ring-1 ring-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  TOKO: {(selectedProd.qtyToko ?? 0).toLocaleString('id-ID')}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${selectedPosisi === 'GUDANG' ? 'bg-purple-100 text-purple-900 border-purple-400 ring-1 ring-purple-300' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  GUDANG: {(selectedProd.qtyGudang ?? 0).toLocaleString('id-ID')}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${selectedPosisi === 'PIRANHA' ? 'bg-teal-100 text-teal-900 border-teal-400 ring-1 ring-teal-300' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                  PIRANHA: {(selectedProd.qtyPiranha ?? 0).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Posisi Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Posisi / Gudang
            </label>
            <select
              value={selectedPosisi}
              onChange={(e) => setSelectedPosisi(e.target.value)}
              className="input-futuristic text-sm cursor-pointer font-medium text-slate-800"
              required
            >
              {posisiList.map((pos) => (
                <option key={pos} value={pos} className="bg-white text-slate-800">
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Jumlah Unit
              </label>
              <input
                type="number"
                required
                min={1}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="input-futuristic text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Jenis Harga
              </label>
              <select
                value={jenisHarga}
                onChange={(e) => handleJenisHargaChange(e.target.value as any)}
                className="input-futuristic text-sm cursor-pointer font-semibold text-indigo-700"
              >
                <option value="ECERAN">Eceran</option>
                <option value="GROSIR">Grosir</option>
                <option value="PARTAI">Partai</option>
                <option value="HPP">HPP (Modal)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Harga Satuan (Otomatis) (Rp)
            </label>
            <input
              type="number"
              required
              min={0}
              value={harga}
              onChange={(e) => setHarga(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              className="input-futuristic text-sm font-mono font-bold text-slate-900 bg-slate-50"
            />
          </div>

          {/* Calculated Total Display */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex justify-between items-center shadow-2xs">
            <div>
              <span className="text-[10px] text-indigo-600 font-bold uppercase block tracking-wider">Total Nilai Transaksi</span>
              <span className="text-xs text-slate-500 font-medium">Qty x Nominal</span>
            </div>
            <span className="font-mono font-bold text-indigo-700 text-lg">
              Rp {totalNilai.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Keterangan / Jenis Barang Masuk */}
          {isMasuk && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Jenis Restock *
              </label>
              <select
                value={jenisMasuk}
                onChange={(e) => handleJenisMasukChange(e.target.value as 'PEMBELIAN' | 'STOK_AWAL')}
                className="input-futuristic text-sm cursor-pointer font-semibold text-slate-800"
              >
                <option value="PEMBELIAN" className="bg-white text-slate-800 font-medium">
                  Pembelian Barang (Tercatat di Pembukuan Kas)
                </option>
                <option value="STOK_AWAL" className="bg-white text-slate-800 font-medium">
                  Stok Awal (TIDAK Tercatat di Pembukuan Kas)
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={isMasuk ? 'Cth: Restock dari Distributor A' : 'Cth: Penjualan toko'}
              className="input-futuristic text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-neon px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Simpan Mutasi Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
