import React, { useState, useEffect, useMemo } from 'react';
import { Produk } from '../types';
import { X, Save, Package, Plus, List, Trash2 } from 'lucide-react';

interface ModalProdukProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (p: Omit<Produk, 'id'> & { id?: string }) => void;
  initialData?: Produk | null;
  existingCategories?: string[];
  onDeleteCategory?: (categoryName: string) => void;
}

const DEFAULT_CATEGORIES = ['HANDTOWEL', 'ROLL', 'NAPKIN', 'FACIAL TISSUE', 'KITCHEN TOWEL'];

export const ModalProduk: React.FC<ModalProdukProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCategories = [],
  onDeleteCategory
}) => {

  const [sku, setSku] = useState('');
  const [nama, setNama] = useState('');
  const [kategoriSelect, setKategoriSelect] = useState('HANDTOWEL');
  const [customKategori, setCustomKategori] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [harga, setHarga] = useState<number | ''>('');
  const [satuan, setSatuan] = useState('Pcs');
  const [isiKarton, setIsiKarton] = useState('1');
  const [minStok, setMinStok] = useState<number | ''>(5);

  // Combine default categories and existing categories from db
  const excludedCategories = ['makanan', 'minuman', 'rokok', 'sembako'];
  const allCategories = useMemo(() => {
    const filteredExisting = existingCategories.filter(c => c && !excludedCategories.includes(c.toLowerCase()));
    const combined = new Set([...DEFAULT_CATEGORIES, ...filteredExisting]);
    if (initialData?.kategori) {
      combined.add(initialData.kategori);
    }
    return Array.from(combined);
  }, [existingCategories, initialData]);

  useEffect(() => {
    if (initialData) {
      setSku(initialData.sku);
      setNama(initialData.nama);
      
      if (allCategories.includes(initialData.kategori)) {
        setKategoriSelect(initialData.kategori);
        setIsCustomMode(false);
        setCustomKategori('');
      } else {
        setIsCustomMode(true);
        setCustomKategori(initialData.kategori);
        setKategoriSelect('HANDTOWEL');
      }

      setHarga(initialData.harga);
      setSatuan(initialData.satuan);
      setIsiKarton(String(initialData.isiKarton));
      setMinStok(initialData.minStok ?? 5);
    } else {
      setSku(`BRG-${Math.floor(100 + Math.random() * 900)}`);
      setNama('');
      setKategoriSelect('HANDTOWEL');
      setCustomKategori('');
      setIsCustomMode(false);
      setHarga('');
      setSatuan('Pcs');
      setIsiKarton('1');
      setMinStok(5);
    }
  }, [initialData, isOpen, allCategories]);

  const handleDeleteCurrentCategory = () => {
    const catToDelete = isCustomMode ? customKategori.trim() : kategoriSelect;
    if (!catToDelete) return;
    if (window.confirm(`Hapus kategori "${catToDelete}"?`)) {
      if (onDeleteCategory) {
        onDeleteCategory(catToDelete);
      }
      setKategoriSelect('HANDTOWEL');
      setIsCustomMode(false);
      setCustomKategori('');
    }
  };

  if (!isOpen) return null;


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !sku.trim()) return;

    let finalKategori = 'HANDTOWEL';
    if (isCustomMode) {
      finalKategori = customKategori.trim() || 'Lainnya';
    } else {
      if (kategoriSelect === '__CUSTOM__') {
        finalKategori = customKategori.trim() || 'Lainnya';
      } else {
        finalKategori = kategoriSelect;
      }
    }

    onSave({
      id: initialData?.id,
      sku: sku.toUpperCase().trim(),
      nama: nama.trim(),
      kategori: finalKategori,
      harga: Number(harga) || 0,
      satuan,
      isiKarton: isiKarton.trim() || '1',
      minStok: Number(minStok) || 5
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            {initialData ? 'Edit Data Produk' : 'Tambah Produk Baru'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Kode SKU
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Contoh: BRG-001"
                className="input-futuristic uppercase font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Nama Produk
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Barang"
                className="input-futuristic text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kategori
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(!isCustomMode);
                    if (!isCustomMode && !customKategori) {
                      setCustomKategori('');
                    }
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isCustomMode ? (
                    <>
                      <List className="w-3 h-3" /> Pilih Dari List
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> + Custom Baru
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {isCustomMode ? (
                    <input
                      type="text"
                      required
                      value={customKategori}
                      onChange={(e) => setCustomKategori(e.target.value)}
                      placeholder="Ketik Kategori Baru..."
                      className="input-futuristic text-sm focus:border-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={kategoriSelect}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomMode(true);
                        } else {
                          setKategoriSelect(e.target.value);
                        }
                      }}
                      className="input-futuristic text-sm cursor-pointer"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat} className="bg-white text-slate-800">
                          {cat}
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="bg-white text-indigo-600 font-semibold">
                        + Kategori Custom Baru...
                      </option>
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDeleteCurrentCategory}
                  className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer shrink-0"
                  title="Hapus Kategori Ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Harga Dasar (Rp)
              </label>
              <input
                type="number"
                required
                min={0}
                value={harga}
                onChange={(e) => setHarga(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="input-futuristic text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Satuan
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="input-futuristic text-sm cursor-pointer"
              >
                <option value="Pcs" className="bg-white text-slate-800">Pcs</option>
                <option value="Karton" className="bg-white text-slate-800">Karton</option>
                <option value="Pak" className="bg-white text-slate-800">Pak</option>
                <option value="Dus" className="bg-white text-slate-800">Dus</option>
                <option value="Kg" className="bg-white text-slate-800">Kg</option>
                <option value="Botol" className="bg-white text-slate-800">Botol</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Isi per Kemasan
              </label>
              <input
                type="text"
                value={isiKarton}
                onChange={(e) => setIsiKarton(e.target.value)}
                placeholder="Contoh: 24"
                className="input-futuristic text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Batas Min. Stok
              </label>
              <input
                type="number"
                min={0}
                value={minStok}
                onChange={(e) => setMinStok(e.target.value ? Number(e.target.value) : '')}
                placeholder="5"
                className="input-futuristic text-sm font-mono"
              />
            </div>
          </div>

          <div className="mt-6 pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-neon px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
