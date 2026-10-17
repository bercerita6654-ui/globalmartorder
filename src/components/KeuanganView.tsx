import React, { useState } from 'react';
import { AppDatabase } from '../types';
import { 
  Wallet, 
  PlusCircle, 
  MinusCircle, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  Banknote, 
  CreditCard,
  Building2,
  Landmark,
  Receipt,
  CheckCircle2,
  Clock,
  User,
  Truck,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface KeuanganViewProps {
  db: AppDatabase;
  onOpenModalKeuangan: (
    tipe: 'MASUK' | 'KELUAR',
    initialData?: {
      nominal?: number;
      keterangan?: string;
      kategori?: string;
      metodePembayaran?: 'CASH' | 'TRANSFER';
      namaBank?: string;
    }
  ) => void;
  onDeleteKeuangan?: (id: string) => void;
}

const DEFAULT_BANKS = [
  { code: 'CASH', name: 'Kas Tunai (Cash)', isCash: true, color: 'emerald' },
  { code: 'BCA', name: 'Bank BCA (Central Asia)', isCash: false, color: 'blue' },
  { code: 'MANDIRI', name: 'Bank Mandiri', isCash: false, color: 'amber' },
  { code: 'BRI', name: 'Bank BRI (Rakyat Indonesia)', isCash: false, color: 'sky' },
  { code: 'BNI', name: 'Bank BNI (Negara Indonesia)', isCash: false, color: 'orange' },
  { code: 'BSI', name: 'Bank BSI (Syariah Indonesia)', isCash: false, color: 'teal' },
  { code: 'BPD', name: 'Bank BPD (BPD Bali / Regional)', isCash: false, color: 'indigo' },
  { code: 'MANTAP', name: 'Bank Mandiri Taspen (Mantap)', isCash: false, color: 'purple' },
];

export const KeuanganView: React.FC<KeuanganViewProps> = ({ db, onOpenModalKeuangan, onDeleteKeuangan }) => {
  const [activeTab, setActiveTab] = useState<'BUKU_KAS' | 'SALDO_BANK' | 'HUTANG_PIUTANG'>('BUKU_KAS');
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [filterMetode, setFilterMetode] = useState<'ALL' | 'CASH' | 'TRANSFER' | 'KREDIT'>('ALL');
  const [filterBank, setFilterBank] = useState<string>('ALL');

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 1. Overall Balance Calculation
  const totalSaldo = db.keuangan.reduce(
    (acc, curr) => (curr.tipe === 'MASUK' ? acc + curr.nominal : acc - curr.nominal),
    0
  );

  // 2. Bank & Cash Balances Calculation
  const bankBalances: Record<string, { masuk: number; keluar: number; saldo: number }> = {
    CASH: { masuk: 0, keluar: 0, saldo: 0 },
    BCA: { masuk: 0, keluar: 0, saldo: 0 },
    MANDIRI: { masuk: 0, keluar: 0, saldo: 0 },
    BRI: { masuk: 0, keluar: 0, saldo: 0 },
    BNI: { masuk: 0, keluar: 0, saldo: 0 },
    BSI: { masuk: 0, keluar: 0, saldo: 0 },
    BPD: { masuk: 0, keluar: 0, saldo: 0 },
    MANTAP: { masuk: 0, keluar: 0, saldo: 0 },
  };

  db.keuangan.forEach((k) => {
    let key = 'CASH';
    if (k.metodePembayaran === 'TRANSFER') {
      key = k.namaBank ? k.namaBank.toUpperCase() : 'BANK_LAIN';
    } else if (k.metodePembayaran === 'KREDIT') {
      return; // Credit is tracked under Piutang/Hutang, not liquid cash/bank balance
    }

    if (!bankBalances[key]) {
      bankBalances[key] = { masuk: 0, keluar: 0, saldo: 0 };
    }

    if (k.tipe === 'MASUK') {
      bankBalances[key].masuk += k.nominal;
      bankBalances[key].saldo += k.nominal;
    } else {
      bankBalances[key].keluar += k.nominal;
      bankBalances[key].saldo -= k.nominal;
    }
  });

  const totalSaldoCash = bankBalances.CASH?.saldo || 0;
  const totalSaldoBank = Object.keys(bankBalances)
    .filter((b) => b !== 'CASH')
    .reduce((acc, b) => acc + bankBalances[b].saldo, 0);

  // 3. Piutang Calculation (Customer Unpaid Invoices / Incomplete Debt)
  const creditShipments = (db.pengiriman || []).filter(
    (p) => p.metodePembayaran === 'KREDIT' && p.status !== 'BATAL'
  );

  // Map payments from keuangan for each credit shipment
  const piutangList = creditShipments.map((p) => {
    const totalHarga = p.totalHarga ?? (p.items || []).reduce((acc, i) => acc + (i.harga * i.quantity), 0);
    const notaKey = (p.noNota || p.id).toLowerCase();
    const customerKey = (p.namaCustomer || '').toLowerCase();

    // Check payments matching this nota or customer specifically
    const totalPaid = db.keuangan
      .filter((k) => k.tipe === 'MASUK' && 
        (k.kategori === 'Pelunasan Piutang' || k.kategori === 'Piutang') &&
        ((notaKey && k.keterangan.toLowerCase().includes(notaKey)) ||
         (customerKey && k.keterangan.toLowerCase().includes(customerKey)))
      )
      .reduce((acc, k) => acc + k.nominal, 0);

    const sisaPiutang = Math.max(0, totalHarga - totalPaid);
    const isLunas = sisaPiutang <= 0;

    return {
      id: p.id,
      noNota: p.noNota || p.id,
      tanggal: p.tanggal,
      namaCustomer: p.namaCustomer,
      alamat: p.alamat || '-',
      totalHarga,
      totalPaid,
      sisaPiutang,
      isLunas
    };
  });

  const totalPiutang = piutangList.reduce((acc, p) => acc + p.sisaPiutang, 0);

  // 4. Hutang Calculation (Supplier Unpaid POs)
  const poList = (db.purchaseOrder || []).filter(
    (p) => p.status !== 'BATAL' && p.status !== 'DRAFT'
  );

  const hutangList = poList.map((po) => {
    const totalHarga = po.totalHarga ?? (po.items || []).reduce((acc, i) => acc + (i.harga * i.quantity), 0);
    const poKey = (po.noPO || po.id).toLowerCase();
    const supplierKey = (po.namaSupplier || '').toLowerCase();

    const totalPaid = db.keuangan
      .filter((k) => k.tipe === 'KELUAR' && 
        (k.kategori === 'Pelunasan Hutang' || k.kategori === 'Pembelian Stok') &&
        ((poKey && k.keterangan.toLowerCase().includes(poKey)) ||
         (supplierKey && k.keterangan.toLowerCase().includes(supplierKey)))
      )
      .reduce((acc, k) => acc + k.nominal, 0);

    const sisaHutang = Math.max(0, totalHarga - totalPaid);
    const isLunas = sisaHutang <= 0;

    return {
      id: po.id,
      noPO: po.noPO || po.id,
      tanggal: po.tanggal,
      namaSupplier: po.namaSupplier,
      totalHarga,
      totalPaid,
      sisaHutang,
      isLunas
    };
  });

  const totalHutang = hutangList.reduce((acc, h) => acc + h.sisaHutang, 0);

  // 5. Filtered Cashbook Logs
  const filteredLogs = db.keuangan
    .filter((k) => {
      const matchSearch = k.keterangan.toLowerCase().includes(search.toLowerCase()) ||
                          (k.namaBank && k.namaBank.toLowerCase().includes(search.toLowerCase())) ||
                          (k.kategori && k.kategori.toLowerCase().includes(search.toLowerCase()));
      const matchTipe = filterTipe === 'ALL' || k.tipe === filterTipe;
      const matchMetode = filterMetode === 'ALL' || 
                          (filterMetode === 'CASH' && (k.metodePembayaran === 'CASH' || !k.metodePembayaran)) ||
                          (filterMetode === 'TRANSFER' && k.metodePembayaran === 'TRANSFER') ||
                          (filterMetode === 'KREDIT' && (k.metodePembayaran === 'KREDIT' || k.kategori === 'Piutang'));
      const matchBank = filterBank === 'ALL' || 
                        (filterBank === 'CASH' && (k.metodePembayaran === 'CASH' || !k.metodePembayaran)) ||
                        (k.metodePembayaran === 'TRANSFER' && k.namaBank?.toUpperCase() === filterBank.toUpperCase());
      return matchSearch && matchTipe && matchMetode && matchBank;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation Tabs */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-600" /> Kas, Saldo Bank, Hutang & Piutang
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistem pencatatan kas utama, pengecekan saldo bank, serta penjumlahan total hutang & piutang usaha.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenModalKeuangan('MASUK')}
              className="flex-1 sm:flex-initial bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Uang Masuk
            </button>
            <button
              onClick={() => onOpenModalKeuangan('KELUAR')}
              className="flex-1 sm:flex-initial bg-rose-600 text-white hover:bg-rose-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MinusCircle className="w-4 h-4" /> Uang Keluar
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('BUKU_KAS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BUKU_KAS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-400" /> Buku Kas Utama ({db.keuangan.length})
          </button>

          <button
            onClick={() => setActiveTab('SALDO_BANK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SALDO_BANK'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-100'
            }`}
          >
            <Landmark className="w-4 h-4" /> Cek Saldo Bank ({formatRupiah(totalSaldoBank)})
          </button>

          <button
            onClick={() => setActiveTab('HUTANG_PIUTANG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HUTANG_PIUTANG'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100'
            }`}
          >
            <Receipt className="w-4 h-4" /> Menu Hutang & Piutang
            {(totalPiutang > 0 || totalHutang > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Overview Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saldo Combined */}
        <div className="glass-panel p-4 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Kas & Bank</p>
            <p className="text-lg font-bold font-mono text-emerald-600 mt-1">{formatRupiah(totalSaldo)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Gabungan Kas Tunai & Bank</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Cash Tunai */}
        <div className="glass-panel p-4 border-l-4 border-l-sky-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Tunai (Cash)</p>
            <p className="text-lg font-bold font-mono text-sky-600 mt-1">{formatRupiah(totalSaldoCash)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Uang fisik di brankas/kasir</p>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        {/* Total Piutang Customer */}
        <div className="glass-panel p-4 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Piutang (Tagihan Customer)</p>
            <p className="text-lg font-bold font-mono text-amber-600 mt-1">{formatRupiah(totalPiutang)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{piutangList.filter(p => !p.isLunas).length} Nota Kredit Belum Lunas</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Total Hutang Supplier */}
        <div className="glass-panel p-4 border-l-4 border-l-rose-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Hutang (Kewajiban Supplier)</p>
            <p className="text-lg font-bold font-mono text-rose-600 mt-1">{formatRupiah(totalHutang)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{hutangList.filter(h => !h.isLunas).length} PO Supplier Belum Lunas</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: BUKU KAS UTAMA */}
      {activeTab === 'BUKU_KAS' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari transaksi berdasarkan rincian keterangan / bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-futuristic pl-10 text-sm"
              />
            </div>

            <div className="w-full sm:w-40">
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value as any)}
                className="input-futuristic text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="MASUK">Pemasukan (Debit)</option>
                <option value="KELUAR">Pengeluaran (Kredit)</option>
              </select>
            </div>

            <div className="w-full sm:w-40">
              <select
                value={filterMetode}
                onChange={(e) => setFilterMetode(e.target.value as any)}
                className="input-futuristic text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">Semua Metode</option>
                <option value="CASH">💵 Cash (Tunai)</option>
                <option value="TRANSFER">💳 Transfer Bank</option>
                <option value="KREDIT">📄 Kredit (Piutang)</option>
              </select>
            </div>

            <div className="w-full sm:w-40">
              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="input-futuristic text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">Semua Rekening/Bank</option>
                <option value="CASH">Kas Tunai</option>
                <option value="BCA">Bank BCA</option>
                <option value="MANDIRI">Bank Mandiri</option>
                <option value="BRI">Bank BRI</option>
                <option value="BNI">Bank BNI</option>
                <option value="BSI">Bank BSI</option>
                <option value="BPD">Bank BPD</option>
                <option value="MANTAP">Bank Mantap</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
              <h3 className="font-display font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600 shrink-0" /> Riwayat Transaksi Kas & Bank
              </h3>
              <div className="text-xs sm:text-sm bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-2xs">
                <span className="text-slate-500 font-medium">Saldo Kas & Bank:</span>
                <span className="font-bold text-emerald-600 font-mono text-sm sm:text-base">
                  {formatRupiah(totalSaldo)}
                </span>
              </div>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Belum ada pencatatan kas/keuangan yang cocok.
                </div>
              ) : (
                filteredLogs.map((k) => {
                  const isMasuk = k.tipe === 'MASUK';
                  return (
                    <div key={k.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isMasuk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {isMasuk ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isMasuk ? 'PEMASUKAN' : 'PENGELUARAN'}
                          </span>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">{formatDate(k.date)}</p>
                        </div>

                        <div className="text-right">
                          <p className={`font-bold font-mono text-sm ${isMasuk ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isMasuk ? '+' : '-'}{formatRupiah(k.nominal)}
                          </p>
                          {k.metodePembayaran === 'KREDIT' || k.kategori === 'Piutang' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5">
                              <CreditCard className="w-3 h-3 text-amber-600" /> Kredit (Piutang)
                            </span>
                          ) : k.metodePembayaran === 'TRANSFER' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mt-0.5">
                              <Landmark className="w-3 h-3 text-indigo-500" /> Transfer ({k.namaBank || 'BANK'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5">
                              <Banknote className="w-3 h-3 text-emerald-600" /> Cash Tunai
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800 text-xs">{k.keterangan || '-'}</p>
                        {k.kategori && (
                          <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {k.kategori}
                          </span>
                        )}
                      </div>

                      {onDeleteKeuangan && (
                        <div className="flex justify-end pt-1 border-t border-slate-100">
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus transaksi kas ini?')) {
                                onDeleteKeuangan(k.id);
                              }
                            }}
                            className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4">Metode Bayar / Rekening</th>
                    <th className="px-6 py-4">Kategori & Keterangan</th>
                    <th className="px-6 py-4 text-right text-emerald-700">Pemasukan (Debit)</th>
                    <th className="px-6 py-4 text-right text-rose-700">Pengeluaran (Kredit)</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        Buku kas masih kosong atau tidak ada transaksi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((k) => {
                      const isMasuk = k.tipe === 'MASUK';
                      const isTransfer = k.metodePembayaran === 'TRANSFER';

                      return (
                        <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-slate-500 text-xs font-medium">{formatDate(k.date)}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border inline-flex items-center gap-1 ${
                                isMasuk
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {isMasuk ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {k.tipe}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {k.metodePembayaran === 'KREDIT' || k.kategori === 'Piutang' ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-amber-600" />
                                Kredit (Piutang)
                              </span>
                            ) : isTransfer ? (
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                                <Landmark className="w-3 h-3 text-indigo-600" />
                                Transfer ({k.namaBank || 'BANK'})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
                                <Banknote className="w-3 h-3 text-emerald-600" />
                                Cash Tunai
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-800 text-sm font-medium whitespace-normal break-words max-w-sm">
                            <div className="font-semibold">{k.keterangan}</div>
                            {k.kategori && (
                              <div className="text-[11px] text-slate-400 font-normal">{k.kategori}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                            {isMasuk ? formatRupiah(k.nominal) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                            {!isMasuk ? formatRupiah(k.nominal) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {onDeleteKeuangan && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus transaksi kas "${k.keterangan}"?`)) {
                                    onDeleteKeuangan(k.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Transaksi"
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
      )}

      {/* SUB-VIEW 2: CEK SALDO BANK MASING-MASING */}
      {activeTab === 'SALDO_BANK' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-indigo-950 text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" /> Rincian Saldo Per Bank & Kas Tunai
              </h3>
              <p className="text-xs text-indigo-800 mt-0.5">
                Pilih atau cek ketersediaan saldo tunai maupun saldo di masing-masing rekening bank.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-indigo-700 font-semibold">Total Seluruh Rekening:</span>
              <p className="text-lg font-bold font-mono text-indigo-950">{formatRupiah(totalSaldo)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_BANKS.map((bank) => {
              const bData = bankBalances[bank.code] || { masuk: 0, keluar: 0, saldo: 0 };
              const isPositive = bData.saldo >= 0;

              return (
                <div key={bank.code} className="glass-panel p-5 space-y-4 hover:border-indigo-300 transition-all shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        bank.isCash ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {bank.isCash ? <Banknote className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{bank.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {bank.isCash ? 'KAS TUNAI (CASH)' : `REKENING ${bank.code}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Saat Ini</span>
                    <p className={`text-2xl font-bold font-mono mt-0.5 ${
                      isPositive ? 'text-slate-900' : 'text-rose-600'
                    }`}>
                      {formatRupiah(bData.saldo)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-semibold">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block uppercase">Total Masuk</span>
                      <span className="font-mono text-emerald-800 font-bold">{formatRupiah(bData.masuk)}</span>
                    </div>

                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                      <span className="text-[10px] text-rose-700 block uppercase">Total Keluar</span>
                      <span className="font-mono text-rose-800 font-bold">{formatRupiah(bData.keluar)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => onOpenModalKeuangan('MASUK', {
                        metodePembayaran: bank.isCash ? 'CASH' : 'TRANSFER',
                        namaBank: bank.isCash ? undefined : bank.code
                      })}
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      + Terima Masuk
                    </button>
                    <button
                      onClick={() => onOpenModalKeuangan('KELUAR', {
                        metodePembayaran: bank.isCash ? 'CASH' : 'TRANSFER',
                        namaBank: bank.isCash ? undefined : bank.code
                      })}
                      className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      - Transfer Out
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: MENU HUTANG & PIUTANG */}
      {activeTab === 'HUTANG_PIUTANG' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Penjumlahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-6 border-l-4 border-l-amber-500 bg-amber-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Penjumlahan Total Piutang (Tagihan Customer)</span>
                  <h3 className="text-3xl font-bold font-mono text-amber-600 mt-2">{formatRupiah(totalPiutang)}</h3>
                  <p className="text-xs text-slate-600 mt-2">
                    Uang milik usaha Anda yang masih dibawa customer dari pengiriman barang kredit.
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
                  <Receipt className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 border-l-4 border-l-rose-500 bg-rose-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Penjumlahan Total Hutang (Kewajiban Supplier)</span>
                  <h3 className="text-3xl font-bold font-mono text-rose-600 mt-2">{formatRupiah(totalHutang)}</h3>
                  <p className="text-xs text-slate-600 mt-2">
                    Kewajiban pembayaran kepada supplier dari pembelian barang / Purchase Order.
                  </p>
                </div>
                <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
                  <CreditCard className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Rincian List Piutang Customer */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-amber-50/50 flex items-center justify-between">
              <h3 className="font-display font-bold text-amber-950 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" /> Rincian Piutang Customer (Pengiriman Kredit)
              </h3>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                Total: {formatRupiah(totalPiutang)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">No. Nota & Tanggal</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5 text-right">Nilai Nota</th>
                    <th className="px-6 py-3.5 text-right">Sudah Dibayar</th>
                    <th className="px-6 py-3.5 text-right text-amber-700">Sisa Piutang</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-center">Aksi Pelunasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {piutangList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Tidak ada catatan piutang customer saat ini.
                      </td>
                    </tr>
                  ) : (
                    piutangList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.noNota}</div>
                          <div className="text-xs text-slate-400 font-mono">{p.tanggal}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-400 shrink-0" /> {p.namaCustomer}
                          </div>
                          <div className="text-xs text-slate-400">{p.alamat}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                          {formatRupiah(p.totalHarga)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                          {formatRupiah(p.totalPaid)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-amber-600">
                          {formatRupiah(p.sisaPiutang)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.isLunas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5" /> BELUM LUNAS
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!p.isLunas ? (
                            <button
                              onClick={() => onOpenModalKeuangan('MASUK', {
                                nominal: p.sisaPiutang,
                                keterangan: `[PELUNASAN PIUTANG] Nota ${p.noNota} - Customer: ${p.namaCustomer}`,
                                kategori: 'Pelunasan Piutang'
                              })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Banknote className="w-3.5 h-3.5" /> 💳 Terima Pelunasan (Cash/Transfer)
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sudah Lunas
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rincian List Hutang Supplier */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
              <h3 className="font-display font-bold text-rose-950 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" /> Rincian Hutang Supplier (Purchase Orders)
              </h3>
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
                Total: {formatRupiah(totalHutang)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">No. PO & Tanggal</th>
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5 text-right">Nilai Tagihan PO</th>
                    <th className="px-6 py-3.5 text-right">Sudah Dibayar</th>
                    <th className="px-6 py-3.5 text-right text-rose-700">Sisa Hutang</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-center">Aksi Bayar Hutang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {hutangList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Tidak ada catatan hutang supplier saat ini.
                      </td>
                    </tr>
                  ) : (
                    hutangList.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{h.noPO}</div>
                          <div className="text-xs text-slate-400 font-mono">{h.tanggal}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" /> {h.namaSupplier}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                          {formatRupiah(h.totalHarga)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                          {formatRupiah(h.totalPaid)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                          {formatRupiah(h.sisaHutang)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {h.isLunas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5" /> BELUM LUNAS
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!h.isLunas ? (
                            <button
                              onClick={() => onOpenModalKeuangan('KELUAR', {
                                nominal: h.sisaHutang,
                                keterangan: `[PELUNASAN HUTANG] PO ${h.noPO} - Supplier: ${h.namaSupplier}`,
                                kategori: 'Pelunasan Hutang'
                              })}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Bayar Hutang PO
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sudah Lunas</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
