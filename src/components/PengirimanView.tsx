import React, { useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Customer, Pengiriman, ItemPengiriman, Produk } from '../types';
import { 
  Truck, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  PackageCheck, 
  User, 
  CheckCircle, 
  Clock, 
  X, 
  PlusCircle, 
  MinusCircle, 
  Printer, 
  Phone, 
  MapPin, 
  Receipt,
  Download,
  FileDown,
  Banknote,
  CreditCard
} from 'lucide-react';

interface PengirimanViewProps {
  pengirimanList: Pengiriman[];
  customers: Customer[];
  produkList: Produk[];
  onSavePengiriman: (pengiriman: Omit<Pengiriman, 'id'> & { id?: string }, deductStock?: boolean) => Pengiriman;
  onDeletePengiriman: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: 'PROSES' | 'TERKIRIM' | 'BATAL') => void;
  onUpdateMetodePembayaran?: (id: string, newMetode: 'CASH' | 'KREDIT') => void;
}

const formatRupiah = (num: number) => {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
};

export const PengirimanView: React.FC<PengirimanViewProps> = ({
  pengirimanList,
  customers,
  produkList,
  onSavePengiriman,
  onDeletePengiriman,
  onUpdateStatus,
  onUpdateMetodePembayaran
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeNota, setActiveNota] = useState<Pengiriman | null>(null);

  const currentAdmin = sessionStorage.getItem('globalMartAdmin') || 'Admin';
  const isServer = currentAdmin.toUpperCase().includes('SERVER');

  const handleDelete = (id: string) => {
    if (!isServer) {
      alert(`Akses Ditolak!\n\nFitur delete hanya bisa dilakukan oleh akun SERVER.\nAkun aktif saat ini: "${currentAdmin}".`);
      return;
    }
    if (window.confirm('Hapus surat/riwayat pengiriman ini?')) {
      onDeletePengiriman(id);
    }
  };

  // Form State for New Pengiriman
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [namaCustomerManual, setNamaCustomerManual] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [pic, setPic] = useState('');
  const [catatan, setCatatan] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState<'CASH' | 'KREDIT'>('CASH');
  const [autoRecordKeuangan, setAutoRecordKeuangan] = useState(true);
  const [deductStock, setDeductStock] = useState(true);

  // Items list in form
  const [items, setItems] = useState<ItemPengiriman[]>([
    { 
      idProduk: produkList[0]?.id || '', 
      namaProduk: produkList[0]?.nama || '', 
      quantity: 1, 
      satuan: produkList[0]?.satuan || 'Pcs',
      harga: produkList[0]?.harga || 0
    }
  ]);

  const openModal = () => {
    setTanggal(new Date().toISOString().split('T')[0]);
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
      setNamaCustomerManual(customers[0].namaCustomer);
      setAlamat(customers[0].alamat);
      setNoTelp(customers[0].noTelp);
      setPic(customers[0].pic || '');
    } else {
      setSelectedCustomerId('');
      setNamaCustomerManual('');
      setAlamat('');
      setNoTelp('');
      setPic('');
    }
    setCatatan('');
    setMetodePembayaran('CASH');
    setAutoRecordKeuangan(true);
    setDeductStock(true);

    if (produkList.length > 0) {
      setItems([{
        idProduk: produkList[0].id,
        namaProduk: produkList[0].nama,
        quantity: 1,
        satuan: produkList[0].satuan || 'Pcs',
        harga: produkList[0].harga || 0
      }]);
    } else {
      setItems([{ idProduk: '', namaProduk: '', quantity: 1, satuan: 'Pcs', harga: 0 }]);
    }

    setIsModalOpen(true);
  };

  const handleSelectCustomerChange = (custID: string) => {
    setSelectedCustomerId(custID);
    if (custID === 'MANUAL') {
      setNamaCustomerManual('');
      setAlamat('');
      setNoTelp('');
      setPic('');
    } else {
      const found = customers.find((c) => c.id === custID);
      if (found) {
        setNamaCustomerManual(found.namaCustomer);
        setAlamat(found.alamat);
        setNoTelp(found.noTelp);
        setPic(found.pic || '');
      }
    }
  };

  const handleAddItemRow = () => {
    const defaultProd = produkList[0];
    setItems([
      ...items,
      {
        idProduk: defaultProd ? defaultProd.id : '',
        namaProduk: defaultProd ? defaultProd.nama : '',
        quantity: 1,
        satuan: defaultProd ? defaultProd.satuan : 'Pcs',
        harga: defaultProd ? defaultProd.harga : 0
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemPengiriman, value: any) => {
    const newItems = [...items];
    if (field === 'idProduk') {
      const prod = produkList.find((p) => p.id === value);
      if (prod) {
        newItems[index].idProduk = prod.id;
        newItems[index].namaProduk = prod.nama;
        newItems[index].satuan = prod.satuan;
        newItems[index].harga = prod.harga || 0;
      } else {
        newItems[index].idProduk = value;
      }
    } else {
      (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  };

  const calculateFormTotal = () => {
    return items.reduce((acc, curr) => acc + (curr.quantity * (curr.harga || 0)), 0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomerName = selectedCustomerId === 'MANUAL' || !selectedCustomerId 
      ? namaCustomerManual.trim() 
      : (customers.find(c => c.id === selectedCustomerId)?.namaCustomer || namaCustomerManual.trim());
    
    if (!finalCustomerName) {
      alert('Silakan masukkan atau pilih nama customer.');
      return;
    }

    const validItems = items.filter((it) => it.namaProduk.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Masukkan minimal 1 barang dengan quantity yang valid.');
      return;
    }

    let nextNum = pengirimanList.length + 1;
    pengirimanList.forEach((p) => {
      if (p.noNota) {
        const match = p.noNota.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      }
    });
    const seqFormatted = String(nextNum).padStart(4, '0');
    const generatedNoNota = `NOTA-${seqFormatted}`;
    const computedTotal = calculateFormTotal();

    const createdPengiriman = onSavePengiriman(
      {
        noNota: generatedNoNota,
        tanggal,
        idCustomer: selectedCustomerId !== 'MANUAL' ? selectedCustomerId : undefined,
        namaCustomer: finalCustomerName,
        alamat,
        noTelp,
        pic,
        items: validItems,
        totalHarga: computedTotal,
        catatan,
        status: 'PROSES',
        metodePembayaran,
        autoRecordKeuangan
      },
      deductStock
    );

    setIsModalOpen(false);
    if (createdPengiriman) {
      setActiveNota(createdPengiriman);
    }
  };

  const handlePrintNota = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-nota-modal');
    if (!element) {
      alert('Elemen nota tidak ditemukan.');
      return;
    }

    try {
      // Get html2pdf function safely across bundler setups
      const html2pdfModule = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
      if (!html2pdfModule) {
        throw new Error('Library html2pdf tidak tersedia');
      }

      // Clone element & prepare inline styles to prevent Tailwind v4 oklch() canvas crashes
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '750px';
      clone.style.padding = '24px';
      clone.style.background = '#ffffff';
      clone.style.color = '#0f172a';
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.appendChild(clone);
      document.body.appendChild(container);

      const filename = `Nota_Pengiriman_${activeNota?.noNota || activeNota?.id || 'Vidica'}.pdf`;
      const opt = {
        margin:       6,
        filename:     filename,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          onclone: (clonedDoc: Document) => {
            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach((tag) => {
              if (tag.textContent && tag.textContent.includes('oklch')) {
                tag.textContent = tag.textContent.replace(/oklch\([^)]+\)/g, '#475569');
              }
            });
            const allNodes = clonedDoc.querySelectorAll('*');
            allNodes.forEach((node) => {
              const el = node as HTMLElement;
              if (el.style && el.style.cssText && el.style.cssText.includes('oklch')) {
                el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, '#475569');
              }
            });
          }
        },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdfModule().set(opt).from(clone).save();

      // Cleanup
      document.body.removeChild(container);
    } catch (err) {
      console.error('Download PDF error:', err);
      // Fallback if browser security or canvas block occurs
      alert('Sistem akan membuka menu Cetak Browser. Pilih "Simpan sebagai PDF" / "Save as PDF" pada tujuan printer Anda.');
      window.print();
    }
  };

  const filteredPengiriman = pengirimanList.filter(
    (p) =>
      p.namaCustomer.toLowerCase().includes(search.toLowerCase()) ||
      p.tanggal.includes(search) ||
      (p.noNota && p.noNota.toLowerCase().includes(search.toLowerCase())) ||
      p.items.some((it) => it.namaProduk.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" /> Nota & Pengiriman Barang
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan daftar pengiriman barang ke customer lengkap dengan harga, rincian item, dan cetak nota resmi.
          </p>
        </div>

        <button
          onClick={openModal}
          className="btn-neon px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Buat Surat Pengiriman
        </button>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. nota, nama customer, tanggal pengiriman, atau nama barang..."
            className="w-full text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>

        <div className="md:col-span-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Pengiriman</p>
            <p className="text-2xl font-bold font-mono mt-0.5">{pengirimanList.length} Transaksi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Cards View (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {filteredPengiriman.length === 0 ? (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Belum ada riwayat pengiriman. Klik "Buat Surat Pengiriman" untuk mencatat.
          </div>
        ) : (
          filteredPengiriman.map((p) => {
            const calculatedTotal = p.totalHarga ?? p.items.reduce((acc, it) => acc + (it.quantity * (it.harga || 0)), 0);

            return (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="font-bold text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                      {p.noNota || p.id}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono text-slate-500 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {p.tanggal}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {p.status === 'TERKIRIM' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> TERKIRIM
                      </span>
                    ) : p.status === 'BATAL' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                        <X className="w-3.5 h-3.5" /> BATAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" /> PROSES
                      </span>
                    )}

                    {onUpdateMetodePembayaran ? (
                      <select
                        value={p.metodePembayaran || 'CASH'}
                        onChange={(e) => onUpdateMetodePembayaran(p.id, e.target.value as 'CASH' | 'KREDIT')}
                        className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border cursor-pointer ${
                          p.metodePembayaran === 'KREDIT'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <option value="CASH">💵 CASH (Tunai)</option>
                        <option value="KREDIT">💳 KREDIT (Piutang)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        p.metodePembayaran === 'KREDIT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {p.metodePembayaran === 'KREDIT' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        {p.metodePembayaran === 'KREDIT' ? 'KREDIT' : 'CASH'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{p.namaCustomer}</span>
                  </div>
                  {p.pic && <p className="text-xs text-indigo-600 font-medium mt-0.5">PIC: {p.pic}</p>}
                  {p.noTelp && <p className="text-xs text-slate-500 font-mono mt-0.5">Telp: {p.noTelp}</p>}
                  {p.alamat && <p className="text-xs text-slate-500 mt-0.5">{p.alamat}</p>}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">List Barang:</p>
                  {p.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-800">
                      <span className="font-medium truncate pr-2">• {it.namaProduk}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                          {it.quantity} {it.satuan}
                        </span>
                        {it.harga ? (
                          <span className="text-[10px] font-mono text-slate-500">
                            @ {formatRupiah(it.harga)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {p.catatan && <p className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-200/60">Ket: {p.catatan}</p>}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Total Nilai:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    {formatRupiah(calculatedTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setActiveNota(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Printer className="w-4 h-4" /> Nota
                  </button>

                  {p.status !== 'TERKIRIM' && (
                    <button
                      onClick={() => onUpdateStatus(p.id, 'TERKIRIM')}
                      className="py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center cursor-pointer active:scale-98"
                    >
                      Selesai
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(p.id)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isServer
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer'
                        : 'text-slate-300 hover:text-rose-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={isServer ? "Hapus riwayat pengiriman" : "Fitur delete hanya bisa dilakukan oleh akun SERVER"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Pengiriman List Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">No. Nota & Status</th>
                <th className="px-6 py-4">Metode Bayar</th>
                <th className="px-6 py-4">Nama Customer & PIC</th>
                <th className="px-6 py-4">List Barang (Qty, Satuan & Harga)</th>
                <th className="px-6 py-4 text-right">Total Nilai</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPengiriman.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    Belum ada riwayat pengiriman. Klik "Buat Surat Pengiriman" untuk mencatat.
                  </td>
                </tr>
              ) : (
                filteredPengiriman.map((p) => {
                  const calculatedTotal = p.totalHarga ?? p.items.reduce((acc, it) => acc + (it.quantity * (it.harga || 0)), 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block mb-1">
                          {p.noNota || p.id}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {p.tanggal}
                        </div>
                        {p.status === 'TERKIRIM' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3" /> TERKIRIM
                          </span>
                        ) : p.status === 'BATAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <X className="w-3 h-3" /> BATAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> PROSES
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top">
                        {onUpdateMetodePembayaran ? (
                          <select
                            value={p.metodePembayaran || 'CASH'}
                            onChange={(e) => onUpdateMetodePembayaran(p.id, e.target.value as 'CASH' | 'KREDIT')}
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer ${
                              p.metodePembayaran === 'KREDIT'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <option value="CASH">💵 CASH (Tunai)</option>
                            <option value="KREDIT">💳 KREDIT (Piutang)</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            p.metodePembayaran === 'KREDIT'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {p.metodePembayaran === 'KREDIT' ? <CreditCard className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                            {p.metodePembayaran === 'KREDIT' ? 'KREDIT' : 'CASH'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{p.namaCustomer}</span>
                        </div>
                        {p.pic && <p className="text-xs text-indigo-600 font-medium mt-0.5">PIC: {p.pic}</p>}
                        {p.noTelp && <p className="text-xs text-slate-500 font-mono mt-0.5">Telp: {p.noTelp}</p>}
                        {p.alamat && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.alamat}</p>}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          {p.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                              <span className="font-medium text-slate-700 truncate">{it.namaProduk}</span>
                              <div className="flex items-center gap-2 text-right shrink-0">
                                <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {it.quantity} {it.satuan}
                                </span>
                                {it.harga ? (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    @ {formatRupiah(it.harga)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                        {p.catatan && (
                          <p className="text-xs text-slate-500 italic mt-2">Ket: {p.catatan}</p>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-right">
                        <span className="font-bold font-mono text-slate-900 text-sm">
                          {formatRupiah(calculatedTotal)}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveNota(p)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Cetak Nota"
                          >
                            <Printer className="w-3.5 h-3.5" /> Nota
                          </button>

                          {p.status !== 'TERKIRIM' && (
                            <button
                              onClick={() => onUpdateStatus(p.id, 'TERKIRIM')}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Tandai Terkirim"
                            >
                              Selesai
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(p.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isServer
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                : 'text-slate-300 hover:text-rose-400 bg-slate-50 cursor-not-allowed opacity-60'
                            }`}
                            title={isServer ? "Hapus Pengiriman" : "Fitur delete hanya bisa dilakukan oleh akun SERVER"}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Input Pengiriman Baru */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">Buat Surat Pengiriman Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tanggal Pengiriman *
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="input-futuristic text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Pilih Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomerChange(e.target.value)}
                    className="input-futuristic text-sm cursor-pointer"
                  >
                    {customers.map((c, idx) => (
                      <option key={`${c.id || c.namaCustomer}-${idx}`} value={c.id} className="bg-white text-slate-800">
                        {c.namaCustomer} ({c.pic || 'No PIC'})
                      </option>
                    ))}
                    <option value="MANUAL" className="bg-white text-indigo-600 font-bold">
                      + Input Customer Manual Baru...
                    </option>
                  </select>
                </div>
              </div>

              {/* Customer Details Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Detail Customer & Pengiriman
                </p>
                
                {selectedCustomerId === 'MANUAL' || customers.length === 0 ? (
                  <div>
                    <input
                      type="text"
                      required
                      value={namaCustomerManual}
                      onChange={(e) => setNamaCustomerManual(e.target.value)}
                      placeholder="Nama Customer / Toko *"
                      className="input-futuristic text-sm bg-white"
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    placeholder="Nama PIC / Kontak Penerima"
                    className="input-futuristic text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={noTelp}
                    onChange={(e) => setNoTelp(e.target.value)}
                    placeholder="No. Telp / WhatsApp"
                    className="input-futuristic text-sm bg-white font-mono"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Alamat Pengiriman Lengkap"
                    className="input-futuristic text-sm bg-white"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    List Barang Yang Dibeli *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Tambah Barang
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => {
                    const subtotal = (item.quantity || 0) * (item.harga || 0);

                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Barang #{idx + 1}</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <MinusCircle className="w-3.5 h-3.5" /> Hapus
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                          {/* Produk dropdown / name */}
                          <div className="sm:col-span-5">
                            {produkList.length > 0 ? (
                              <select
                                value={item.idProduk}
                                onChange={(e) => handleItemChange(idx, 'idProduk', e.target.value)}
                                className="input-futuristic text-xs bg-white cursor-pointer"
                              >
                                {produkList.map((p) => (
                                  <option key={p.id} value={p.id} className="bg-white text-slate-800">
                                    {p.nama} ({formatRupiah(p.harga)})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                required
                                value={item.namaProduk}
                                onChange={(e) => handleItemChange(idx, 'namaProduk', e.target.value)}
                                placeholder="Nama Produk / Barang"
                                className="input-futuristic text-xs bg-white"
                              />
                            )}
                          </div>

                          {/* Qty & Satuan */}
                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              required
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              placeholder="Qty"
                              className="input-futuristic text-xs bg-white font-mono w-20"
                            />
                            <input
                              type="text"
                              value={item.satuan}
                              onChange={(e) => handleItemChange(idx, 'satuan', e.target.value)}
                              placeholder="Satuan"
                              className="input-futuristic text-xs bg-white w-20"
                            />
                          </div>

                          {/* Harga Satuan */}
                          <div className="sm:col-span-4 flex items-center gap-2">
                            <div className="flex-1">
                              <input
                                type="number"
                                min={0}
                                required
                                value={item.harga}
                                onChange={(e) => handleItemChange(idx, 'harga', Number(e.target.value))}
                                placeholder="Harga Satuan (Rp)"
                                className="input-futuristic text-xs bg-white font-mono"
                              />
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
                              <span className="text-xs font-bold font-mono text-indigo-700">
                                {formatRupiah(subtotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Preview Box */}
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Total Harga Keseluruhan
                  </span>
                  <span className="text-base font-bold font-mono text-indigo-700">
                    {formatRupiah(calculateFormTotal())}
                  </span>
                </div>
              </div>

              {/* Metode Pembayaran (Cash / Kredit) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Metode Pembayaran *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodePembayaran('CASH')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      metodePembayaran === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> CASH (Tunai)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodePembayaran('KREDIT')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      metodePembayaran === 'KREDIT'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> KREDIT (Piutang)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  {metodePembayaran === 'CASH'
                    ? '• Pembayaran tunai: Otomatis dicatat sebagai Pemasukan Kas di Kas & Keuangan.'
                    : '• Pembayaran kredit/tempo: Otomatis dicatat sebagai Piutang di Kas & Keuangan.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Catatan / Keterangan Pengiriman
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Titip di kasir / Kirim sore hari / Jatuh tempo 30 hari"
                  className="input-futuristic text-sm"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deductStock"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <label htmlFor="deductStock" className="text-xs font-semibold text-indigo-950 cursor-pointer">
                    Otomatis potong stok barang keluar di sistem mutasi stok
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoRecordKeuangan"
                    checked={autoRecordKeuangan}
                    onChange={(e) => setAutoRecordKeuangan(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <label htmlFor="autoRecordKeuangan" className="text-xs font-semibold text-emerald-950 cursor-pointer">
                    Hubungkan & catat transaksi ke Kas & Keuangan ({metodePembayaran === 'CASH' ? 'Pemasukan Kas' : 'Piutang'})
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-neon px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Buat Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tampilan Nota & Cetak/Save PDF */}
      {activeNota && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setActiveNota(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Controls (Hidden during print) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm font-display">Pratinjau Nota Penjualan</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintNota}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak (Print)
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileDown className="w-4 h-4" /> Simpan PDF
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNota(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="printable-nota-modal" className="p-8 bg-white text-slate-900 space-y-6">
              {/* Header Toko & Judul Nota */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 font-display">
                    TOKO VIDICA DEWATA
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">Jl. Gunung Seraya No. 28, Denpasar, Bali</p>
                  <p className="text-xs text-slate-500">Telp : 08125921720/081283364685</p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded">
                    NOTA PENJUALAN
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                    No: <span className="text-indigo-900">{activeNota.noNota || activeNota.id}</span>
                  </p>
                  <p className="text-xs font-mono text-slate-600">Tanggal: {activeNota.tanggal}</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                    Pembayaran: <span className={activeNota.metodePembayaran === 'KREDIT' ? 'text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200' : 'text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200'}>
                      {activeNota.metodePembayaran === 'KREDIT' ? 'KREDIT (PIUTANG)' : 'CASH (TUNAI)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Detail Customer & Pengiriman */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                    KEPADA YTH. (CUSTOMER)
                  </p>
                  <p className="font-bold text-sm text-slate-900">{activeNota.namaCustomer}</p>
                  {activeNota.pic && <p className="text-slate-700 mt-0.5"><span className="font-semibold">U.P / PIC:</span> {activeNota.pic}</p>}
                  {activeNota.noTelp && <p className="text-slate-700 mt-0.5"><span className="font-semibold">Telp:</span> {activeNota.noTelp}</p>}
                </div>

                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                    ALAMAT PENGIRIMAN
                  </p>
                  <p className="text-slate-800 leading-relaxed">{activeNota.alamat || '-'}</p>
                </div>
              </div>

              {/* Tabel Barang */}
              <div className="overflow-hidden border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      <th className="p-2.5 text-center border-r border-slate-300 w-10">No</th>
                      <th className="p-2.5 border-r border-slate-300">Deskripsi Barang / Produk</th>
                      <th className="p-2.5 text-center border-r border-slate-300 w-24">Qty & Satuan</th>
                      <th className="p-2.5 text-right border-r border-slate-300 w-28">Harga Satuan</th>
                      <th className="p-2.5 text-right w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeNota.items.map((it, idx) => {
                      const itemSubtotal = (it.quantity || 0) * (it.harga || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-mono border-r border-slate-200">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-800 border-r border-slate-200">{it.namaProduk}</td>
                          <td className="p-2.5 text-center font-mono font-bold border-r border-slate-200">
                            {it.quantity} {it.satuan}
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-slate-200">
                            {formatRupiah(it.harga || 0)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(itemSubtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-sm">
                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-xs border-r border-slate-300">
                        TOTAL KESELURAHAN
                      </td>
                      <td className="p-3 text-right font-mono text-indigo-950 font-black">
                        {formatRupiah(activeNota.totalHarga ?? activeNota.items.reduce((acc, it) => acc + (it.quantity * (it.harga || 0)), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Catatan & Tanda Tangan */}
              <div className="pt-2 grid grid-cols-2 gap-6 items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">CATATAN PENGIRIMAN:</p>
                  <p className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 italic min-h-[48px]">
                    {activeNota.catatan || 'Terima kasih atas kepercayaan Anda berbelanja dengan kami.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center text-xs">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-12">Penerima / Customer</p>
                    <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                      ( {activeNota.pic || activeNota.namaCustomer} )
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-12">Hormat Kami</p>
                    <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                      ( Toko Vidica Dewata )
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions (Hidden during print) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => setActiveNota(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer shadow-2xs"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintNota}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
                >
                  <Printer className="w-4 h-4 text-indigo-600" /> Cetak (Print)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="btn-neon px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Simpan File PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
