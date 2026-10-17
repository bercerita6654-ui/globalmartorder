import React, { useState, useEffect } from 'react';
import { TipeMutasi } from '../types';
import { X, Wallet, PlusCircle, MinusCircle, CheckCircle2, Banknote, CreditCard } from 'lucide-react';

interface ModalKeuanganProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    tipe: TipeMutasi;
    nominal: number;
    keterangan: string;
    kategori?: string;
    metodePembayaran?: 'CASH' | 'TRANSFER';
    namaBank?: string;
  }) => void;
  tipe: TipeMutasi;
  initialData?: {
    nominal?: number;
    keterangan?: string;
    kategori?: string;
    metodePembayaran?: 'CASH' | 'TRANSFER';
    namaBank?: string;
  };
}

const BANK_OPTIONS = ['BCA', 'MANDIRI', 'BNI', 'BRI', 'MANTAP', 'BPD', 'BSI', 'BANK_LAIN'];

export const ModalKeuangan: React.FC<ModalKeuanganProps> = ({
  isOpen,
  onClose,
  onSave,
  tipe,
  initialData
}) => {
  const [nominal, setNominal] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');
  const [kategori, setKategori] = useState('Penjualan');
  const [metodePembayaran, setMetodePembayaran] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [selectedBank, setSelectedBank] = useState('BCA');
  const [customBank, setCustomBank] = useState('');

  useEffect(() => {
    if (initialData) {
      setNominal(initialData.nominal || '');
      setKeterangan(initialData.keterangan || '');
      setKategori(initialData.kategori || (tipe === 'MASUK' ? 'Penjualan' : 'Operasional'));
      setMetodePembayaran(initialData.metodePembayaran || 'CASH');
      if (initialData.namaBank) {
        if (BANK_OPTIONS.includes(initialData.namaBank.toUpperCase())) {
          setSelectedBank(initialData.namaBank.toUpperCase());
        } else {
          setSelectedBank('BANK_LAIN');
          setCustomBank(initialData.namaBank);
        }
      } else {
        setSelectedBank('BCA');
        setCustomBank('');
      }
    } else {
      setNominal('');
      setKeterangan('');
      setKategori(tipe === 'MASUK' ? 'Penjualan' : 'Operasional');
      setMetodePembayaran('CASH');
      setSelectedBank('BCA');
      setCustomBank('');
    }
  }, [isOpen, tipe, initialData]);

  if (!isOpen) return null;

  const isMasuk = tipe === 'MASUK';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numNominal = Number(nominal);
    if (!numNominal || numNominal <= 0 || !keterangan.trim()) return;

    let finalNamaBank: string | undefined = undefined;
    if (metodePembayaran === 'TRANSFER') {
      if (selectedBank === 'BANK_LAIN') {
        finalNamaBank = customBank.trim() ? customBank.trim().toUpperCase() : 'BANK LAIN';
      } else {
        finalNamaBank = selectedBank;
      }
    }

    onSave({
      tipe,
      nominal: numNominal,
      keterangan: keterangan.trim(),
      kategori,
      metodePembayaran,
      namaBank: finalNamaBank
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80">
          <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
            {isMasuk ? (
              <PlusCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <MinusCircle className="w-5 h-5 text-rose-600" />
            )}
            {isMasuk ? 'Terima Pemasukan Kas (Debit)' : 'Catat Pengeluaran Kas (Kredit)'}
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
              Nominal Transaksi (Rp)
            </label>
            <input
              type="number"
              required
              min={1}
              value={nominal}
              onChange={(e) => setNominal(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              className={`input-futuristic text-xl font-bold font-mono ${
                isMasuk ? 'text-emerald-600' : 'text-rose-600'
              }`}
            />
          </div>

          {/* Metode Pembayaran: CASH / TRANSFER */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Metode Pembayaran *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodePembayaran('CASH')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  metodePembayaran === 'CASH'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4" /> CASH (Tunai)
              </button>

              <button
                type="button"
                onClick={() => setMetodePembayaran('TRANSFER')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  metodePembayaran === 'TRANSFER'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" /> TRANSFER BANK
              </button>
            </div>
          </div>

          {/* Pilihan Bank jika TRANSFER */}
          {metodePembayaran === 'TRANSFER' && (
            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase tracking-wider">
                  Pilih Bank Tujuan / Asal *
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="input-futuristic text-sm cursor-pointer font-bold text-indigo-950 bg-white"
                >
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="MANDIRI">MANDIRI (Bank Mandiri)</option>
                  <option value="BNI">BNI (Bank Negara Indonesia)</option>
                  <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                  <option value="MANTAP">MANTAP (Bank Mandiri Taspen)</option>
                  <option value="BPD">BPD (Bank Pembangunan Daerah / BPD Bali)</option>
                  <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                  <option value="BANK_LAIN">+ TAMBAHKAN BANK LAIN...</option>
                </select>
              </div>

              {selectedBank === 'BANK_LAIN' && (
                <div>
                  <label className="block text-[11px] font-bold text-indigo-800 mb-1 uppercase">
                    Nama Bank Lainnya *
                  </label>
                  <input
                    type="text"
                    required
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Cth: BANK PERMATA / DANAMON / JAGO"
                    className="input-futuristic text-sm bg-white font-semibold text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Kategori Transaksi
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="input-futuristic text-sm cursor-pointer"
            >
              {isMasuk ? (
                <>
                  <option value="Penjualan" className="bg-white text-slate-800">Penjualan Harian</option>
                  <option value="Pelunasan Piutang" className="bg-white text-slate-800">Pelunasan Piutang Customer</option>
                  <option value="Modal" className="bg-white text-slate-800">Tambahan Modal</option>
                  <option value="Lainnya" className="bg-white text-slate-800">Lain-lain</option>
                </>
              ) : (
                <>
                  <option value="Operasional" className="bg-white text-slate-800">Biaya Operasional (Listrik/Air/Internet)</option>
                  <option value="Pelunasan Hutang" className="bg-white text-slate-800">Pelunasan Hutang Supplier / PO</option>
                  <option value="Pembelian Stok" className="bg-white text-slate-800">Pembelian Stok Supplier</option>
                  <option value="Gaji" className="bg-white text-slate-800">Gaji / Honor Karyawan</option>
                  <option value="Sewa" className="bg-white text-slate-800">Sewa Tempat</option>
                  <option value="Lainnya" className="bg-white text-slate-800">Lain-lain</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Keterangan / Rincian
            </label>
            <textarea
              required
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={
                isMasuk
                  ? 'Contoh: Hasil penjualan kasir Shift 1 Toko Vidica'
                  : 'Contoh: Pembayaran listrik dan air bulan ini'
              }
              className="input-futuristic text-sm resize-none"
            />
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
              <CheckCircle2 className="w-4 h-4" /> Simpan Entri Kas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
