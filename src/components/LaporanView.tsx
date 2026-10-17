import React from 'react';
import { AppDatabase, GoogleSheetsConfig } from '../types';
import { FileText, Download, Upload, Printer, AlertTriangle, FileSpreadsheet, ExternalLink, RefreshCw, Sliders, CheckCircle2 } from 'lucide-react';

interface LaporanViewProps {
  db: AppDatabase;
  sheetsConfig?: GoogleSheetsConfig;
  onSync?: () => void;
  isSyncing?: boolean;
  onOpenSettings?: () => void;
  onImportJson: (json: AppDatabase) => void;
}

const TARGET_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ/edit?gid=0#gid=0';

export const LaporanView: React.FC<LaporanViewProps> = ({
  db,
  sheetsConfig,
  onSync,
  isSyncing = false,
  onOpenSettings,
  onImportJson
}) => {
  // Calculations
  const totalPemasukan = db.keuangan
    .filter((k) => k.tipe === 'MASUK')
    .reduce((sum, k) => sum + k.nominal, 0);

  const totalPengeluaran = db.keuangan
    .filter((k) => k.tipe === 'KELUAR')
    .reduce((sum, k) => sum + k.nominal, 0);

  const netCashflow = totalPemasukan - totalPengeluaran;

  // Stock Warnings
  const lowStockItems = db.produk.filter((p) => {
    const masuk = db.stok
      .filter((s) => s.idProduk === p.id && s.tipe === 'MASUK')
      .reduce((a, b) => a + b.jumlah, 0);
    const keluar = db.stok
      .filter((s) => s.idProduk === p.id && s.tipe === 'KELUAR')
      .reduce((a, b) => a + b.jumlah, 0);
    const sisa = masuk - keluar;
    return sisa <= (p.minStok ?? 5);
  });

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // Helper CSV Export
  const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || !rows.length) {
      alert('Tidak ada data untuk diexport.');
      return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row: any) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator)
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Combined Summary CSV
  const handleExportFullCsv = () => {
    const combinedData = [
      ...db.produk.map((p) => ({
        Modul: 'KATALOG PRODUK',
        ID: p.id,
        SKU: p.sku,
        Nama: p.nama,
        Kategori: p.kategori,
        Harga: p.harga,
        Keterangan: `Isi: ${p.isiKarton} (${p.satuan})`
      })),
      ...db.stok.map((s) => {
        const prod = db.produk.find((p) => p.id === s.idProduk);
        return {
          Modul: 'MUTASI STOK',
          ID: s.id,
          SKU: prod?.sku || '',
          Nama: prod?.nama || s.idProduk,
          Kategori: s.tipe,
          Harga: s.harga,
          Keterangan: `Jumlah: ${s.jumlah} | ${s.keterangan}`
        };
      }),
      ...db.keuangan.map((k) => ({
        Modul: 'BUKU KAS KEUANGAN',
        ID: k.id,
        SKU: '-',
        Nama: k.kategori || k.tipe,
        Kategori: k.tipe,
        Harga: k.nominal,
        Keterangan: k.keterangan
      }))
    ];
    exportToCsv(`rekap_database_tokovidica_${new Date().toISOString().split('T')[0]}.csv`, combinedData);
  };

  // Export Sheet PENJUALAN CSV (Kolom: ID, CUSTOMER, POSISI, ADMIN, HARI/TANGGAL, SKU, NAMA PRODUK, QTY, HARGA, JENIS HARGA, TOTAL QTY, TOTAL HARGA)
  const handleExportPenjualanCsv = () => {
    const rows = (db.purchaseOrder || []).flatMap((p) => {
      const totalQty = p.totalQty ?? (p.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const totalHarga = p.totalHarga ?? (p.items || []).reduce((acc, it) => acc + ((it.quantity || 0) * (it.harga || 0)), 0);

      if (!p.items || p.items.length === 0) {
        return [{
          ID: p.noPO || p.id,
          CUSTOMER: p.customer || p.namaSupplier || '-',
          POSISI: p.posisi || 'TOKO',
          ADMIN: p.admin || 'Admin',
          'HARI/TANGGAL': p.tanggal,
          SKU: '-',
          'NAMA PRODUK': '-',
          QTY: 0,
          HARGA: 0,
          'JENIS HARGA': '-',
          'TOTAL QTY': totalQty,
          'TOTAL HARGA': totalHarga
        }];
      }

      return p.items.map((it) => ({
        ID: p.noPO || p.id,
        CUSTOMER: p.customer || p.namaSupplier || '-',
        POSISI: p.posisi || 'TOKO',
        ADMIN: p.admin || 'Admin',
        'HARI/TANGGAL': p.tanggal,
        SKU: it.sku || '-',
        'NAMA PRODUK': it.namaProduk || '-',
        QTY: it.quantity || 0,
        HARGA: it.harga || 0,
        'JENIS HARGA': it.jenisHarga || 'Eceran',
        'TOTAL QTY': totalQty,
        'TOTAL HARGA': totalHarga
      }));
    });

    exportToCsv(`sheet_penjualan_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  // Export Json Backup
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_tokovidica_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Json Backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.produk) && Array.isArray(parsed.stok)) {
          onImportJson(parsed);
          alert('Berhasil mengimpor data backup JSON Toko Vidica Dewata!');
        } else {
          alert('Format berkas JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca berkas JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Ringkasan Laporan & Export Data
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analisis arus kas, peringatan stok menipis, serta rekap otomatis ke Google Sheets.
          </p>
        </div>

        <button
          onClick={handlePrintReport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Cetak Halaman
        </button>
      </div>

      {/* Dedicated Google Spreadsheet Recap Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-white">
                Spreadsheet Rekap Toko Vidica Dewata
              </h4>
              <p className="text-xs text-indigo-200/80">
                Terhubung langsung ke Google Sheets untuk rekapitulasi data otomatis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={TARGET_SPREADSHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer"
            >
              <span>Buka Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
            </a>

            {onSync && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Mengirim...' : 'Rekap Sekarang'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
          <div className="text-indigo-200 truncate max-w-full">
            <span className="text-slate-400">URL Target: </span>
            <span className="text-emerald-300 font-bold">{TARGET_SPREADSHEET_URL}</span>
          </div>

          {sheetsConfig?.lastSyncedAt ? (
            <span className="text-slate-300 text-[11px] flex-shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Terakhir Rekap:{' '}
              {new Date(sheetsConfig.lastSyncedAt).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-amber-300 text-[11px] flex-shrink-0">
              Belum pernah di-rekap
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-indigo-300/80">
            Integrasi langsung via Google Sheets API v4 (Tanpa Apps Script).
          </p>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" /> Pengaturan Direct Sheets
            </button>
          )}
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Akumulasi Pemasukan</p>
          <h4 className="text-2xl font-display font-bold text-emerald-600 mt-1 font-mono">
            {formatRupiah(totalPemasukan)}
          </h4>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Akumulasi Pengeluaran</p>
          <h4 className="text-2xl font-display font-bold text-rose-600 mt-1 font-mono">
            {formatRupiah(totalPengeluaran)}
          </h4>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-indigo-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bersih / Net Cashflow</p>
          <h4
            className={`text-2xl font-display font-bold mt-1 font-mono ${
              netCashflow >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}
          >
            {formatRupiah(netCashflow)}
          </h4>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      {lowStockItems.length > 0 && (
        <div className="glass-panel p-5 border-l-4 border-l-amber-500 bg-amber-50/50">
          <h4 className="font-display font-bold text-amber-800 text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Peringatan: {lowStockItems.length} Produk
            Membutuhkan Restock
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockItems.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-white border border-amber-200 text-xs flex justify-between items-center shadow-2xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{p.nama}</div>
                  <div className="text-[10px] text-slate-400 font-mono font-medium">{p.sku}</div>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                  Batas Min. {p.minStok ?? 5}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export & Import Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Downloads */}
        <div className="glass-panel p-6 space-y-4">
          <h4 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" /> Export Laporan ke CSV
          </h4>
          <p className="text-xs text-slate-500">
            Unduh laporan format spreadsheet untuk diolah di Microsoft Excel atau Google Sheets.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleExportFullCsv}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-700 transition-colors cursor-pointer"
            >
              <span>Download CSV Rekap Gabungan Semua Modul</span>
              <Download className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              onClick={handleExportPenjualanCsv}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
            >
              <span>Download CSV Sheet PENJUALAN ({db.purchaseOrder?.length || 0} Transaksi)</span>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() =>
                exportToCsv(`katalog_produk_${new Date().toISOString().split('T')[0]}.csv`, db.produk)
              }
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>Download CSV Katalog Produk ({db.produk.length} item)</span>
              <Download className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              onClick={() =>
                exportToCsv(
                  `mutasi_stok_${new Date().toISOString().split('T')[0]}.csv`,
                  db.stok
                )
              }
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>Download CSV Riwayat Stok ({db.stok.length} entri)</span>
              <Download className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              onClick={() =>
                exportToCsv(
                  `buku_kas_${new Date().toISOString().split('T')[0]}.csv`,
                  db.keuangan
                )
              }
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>Download CSV Buku Kas Keuangan ({db.keuangan.length} entri)</span>
              <Download className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* JSON Backup & Restore */}
        <div className="glass-panel p-6 space-y-4">
          <h4 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" /> Backup & Restore Database
          </h4>
          <p className="text-xs text-slate-500">
            Simpan atau pulihkan seluruh database Toko Vidica Dewata dalam format JSON resmi.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-600 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Backup JSON Database
            </button>

            <label className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Restore Database dari File JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
