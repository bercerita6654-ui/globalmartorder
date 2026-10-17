import React, { useState } from 'react';
import { Customer } from '../types';
import { Users, Plus, Search, Edit, Trash2, UserCheck, X, Save, CreditCard, FileText, Lock } from 'lucide-react';

interface CustomerViewProps {
  customers: Customer[];
  metodePembayaranList?: string[];
  accounts?: { username: string }[];
  adminName?: string;
  onSaveCustomer: (customer: Omit<Customer, 'id'> & { id?: string }) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  metodePembayaranList = [],
  accounts = [],
  adminName,
  onSaveCustomer,
  onDeleteCustomer
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deniedModalAction, setDeniedModalAction] = useState<'edit' | 'delete' | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const currentAdmin = adminName || sessionStorage.getItem('globalMartAdmin') || 'Admin';
  const isServer = currentAdmin.toUpperCase().includes('SERVER');

  // Form State according to sheet columns:
  // - DATA CUSTOMER (kolom 1)
  // - PIC (kolom 2)
  // - METODE PEMBAYARAN (kolom 3)
  // - KETERANGAN (kolom 4)
  const [namaCustomer, setNamaCustomer] = useState('');
  const [pic, setPic] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState('Cash');
  const [keterangan, setKeterangan] = useState('');

  const openCreateModal = () => {
    setEditingCustomer(null);
    setNamaCustomer('');
    setPic('');
    setMetodePembayaran('Cash');
    setKeterangan('');
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setNamaCustomer(cust.namaCustomer || '');
    setPic(cust.pic || '');
    setMetodePembayaran(cust.metodePembayaran || 'Cash');
    setKeterangan(cust.keterangan || '');
    setIsModalOpen(true);
  };

  const handleEditCustomer = (cust: Customer) => {
    if (!isServer) {
      setDeniedModalAction('edit');
      return;
    }
    openEditModal(cust);
  };

  const handleDeleteCustomer = (cust: Customer) => {
    if (!isServer) {
      setDeniedModalAction('delete');
      return;
    }
    setCustomerToDelete(cust);
  };

  const confirmDeleteCustomer = () => {
    if (!customerToDelete || !isServer) return;
    onDeleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaCustomer.trim()) return;

    if (editingCustomer && !isServer) {
      setDeniedModalAction('edit');
      return;
    }

    onSaveCustomer({
      id: editingCustomer?.id,
      namaCustomer: namaCustomer.trim(),
      pic: pic.trim(),
      metodePembayaran: metodePembayaran.trim(),
      keterangan: keterangan.trim()
    });

    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.namaCustomer.toLowerCase().includes(search.toLowerCase()) ||
      c.pic.toLowerCase().includes(search.toLowerCase()) ||
      (c.metodePembayaran && c.metodePembayaran.toLowerCase().includes(search.toLowerCase())) ||
      (c.keterangan && c.keterangan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Daftar Customer (Sheet: CUSTOMER)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data Customer (Kolom 1), PIC (Kolom 2), Metode Pembayaran (Kolom 3), dan Keterangan (Kolom 4).
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isServer ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Akun SERVER: Akses Edit & Delete Diizinkan
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Fitur Edit & Delete hanya bisa dilakukan oleh akun SERVER
              </span>
            )}
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-neon px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tambah Customer Baru
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan Nama Customer, PIC, Metode Pembayaran, atau Keterangan..."
            className="w-full text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>

        <div className="md:col-span-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Customer</p>
            <p className="text-2xl font-bold font-mono mt-0.5">{customers.length} Pelanggan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Belum ada data customer tersimpan.
          </div>
        ) : (
          filteredCustomers.map((c, idx) => (
            <div key={`${c.id || c.namaCustomer}-${idx}`} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.namaCustomer}</h4>
                  {c.pic && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium">
                      <UserCheck className="w-3 h-3 text-indigo-500" /> PIC: {c.pic}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditCustomer(c)}
                    className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                      isServer
                        ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 cursor-pointer shadow-2xs active:scale-95'
                        : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={isServer ? "Edit Customer (Akun SERVER)" : "Akses Terkunci: Fitur edit hanya bisa dilakukan oleh akun SERVER"}
                  >
                    <Edit className={`w-4 h-4 ${isServer ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(c)}
                    className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                      isServer
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 cursor-pointer shadow-2xs active:scale-95'
                        : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={isServer ? "Hapus Customer (Akun SERVER)" : "Akses Terkunci: Fitur delete hanya bisa dilakukan oleh akun SERVER"}
                  >
                    <Trash2 className={`w-4 h-4 ${isServer ? 'text-rose-600' : 'text-slate-400'}`} />
                  </button>
                </div>
              </div>

              {c.metodePembayaran && (
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Metode: <strong className="text-slate-900">{c.metodePembayaran}</strong></span>
                </div>
              )}

              {c.keterangan && (
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{c.keterangan}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Customer List Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">DATA CUSTOMER (Kolom 1)</th>
                <th className="px-6 py-4">PIC (Kolom 2)</th>
                <th className="px-6 py-4">METODE PEMBAYARAN (Kolom 3)</th>
                <th className="px-6 py-4">KETERANGAN (Kolom 4)</th>
                <th className="px-6 py-4 text-center">
                  <span>Aksi</span>
                  {!isServer && (
                    <span className="block text-[9px] font-semibold text-amber-600 normal-case tracking-normal">
                      (Khusus SERVER)
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    Belum ada data customer tersimpan.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <tr key={`${c.id || c.namaCustomer}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{c.namaCustomer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        {c.pic || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        {c.metodePembayaran || 'Cash'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 max-w-xs">
                        {c.keterangan || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCustomer(c)}
                          className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                            isServer
                              ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 cursor-pointer shadow-2xs active:scale-95 group'
                              : 'text-slate-400 bg-slate-100 border border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 cursor-not-allowed opacity-60'
                          }`}
                          title={isServer ? "Edit Customer (Akun SERVER)" : "Akses Terkunci: Fitur edit hanya bisa dilakukan oleh akun SERVER"}
                        >
                          <Edit className={`w-4 h-4 ${isServer ? 'text-indigo-600 group-hover:scale-110 transition-transform' : 'text-slate-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                            isServer
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 cursor-pointer shadow-2xs active:scale-95 group'
                              : 'text-slate-400 bg-slate-100 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 cursor-not-allowed opacity-60'
                          }`}
                          title={isServer ? "Hapus Customer (Akun SERVER)" : "Akses Terkunci: Fitur delete hanya bisa dilakukan oleh akun SERVER"}
                        >
                          <Trash2 className={`w-4 h-4 ${isServer ? 'text-rose-600 group-hover:scale-110 transition-transform' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ width: '897.496px', maxWidth: '100%' }}
          >
            <div 
              className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between"
              style={{ height: '64.9688px' }}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">
                  {editingCustomer ? 'Edit Data Customer' : 'Tambah Customer Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  DATA CUSTOMER (Kolom 1) *
                </label>
                <input
                  type="text"
                  required
                  value={namaCustomer}
                  onChange={(e) => setNamaCustomer(e.target.value)}
                  placeholder="Contoh: Toko Berkah Dewata"
                  className="input-futuristic text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  PIC (Kolom 2)
                </label>
                <select
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  className="input-futuristic text-sm bg-white"
                >
                  <option value="">-- Pilih PIC (Admin) --</option>
                  {(accounts.length > 0 ? accounts.map(a => a.username) : ['SERVER', 'admin']).map((acc) => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                  {pic && !accounts.some(a => a.username === pic) && !['SERVER', 'admin'].includes(pic) && (
                    <option value={pic}>{pic}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  METODE PEMBAYARAN (Kolom 3)
                </label>
                <select
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value)}
                  className="input-futuristic text-sm bg-white"
                >
                  <option value="">-- Pilih Metode Pembayaran --</option>
                  {(metodePembayaranList.length > 0 ? metodePembayaranList : ['Cash', 'Transfer', 'Kredit', 'Tempo']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  KETERANGAN (Kolom 4)
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan tambahan atau informasi khusus..."
                  className="input-futuristic text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
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
                  <Save className="w-4 h-4" /> Simpan Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Akses Ditolak: Khusus Akun SERVER */}
      {deniedModalAction && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 font-display">Akses Khusus Akun SERVER</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Fitur <strong>{deniedModalAction === 'edit' ? 'Edit Customer' : 'Hapus Customer'}</strong> hanya bisa dilakukan oleh akun <strong>SERVER</strong>.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-mono">
                Akun aktif saat ini: <span className="font-bold text-slate-800">{currentAdmin}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeniedModalAction(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-sm active:scale-98"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Customer (Khusus SERVER) */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 font-display">Konfirmasi Hapus Customer</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus data customer berikut?
              </p>
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-left text-xs">
                <p className="font-bold text-rose-950">{customerToDelete.namaCustomer}</p>
                {customerToDelete.pic && <p className="text-[11px] text-rose-700 mt-0.5">PIC: <span className="font-medium text-slate-800">{customerToDelete.pic}</span></p>}
                {customerToDelete.metodePembayaran && <p className="text-[11px] text-rose-700">Metode: <span className="font-medium text-slate-800">{customerToDelete.metodePembayaran}</span></p>}
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 font-medium">
                Otorisasi: Akun SERVER ({currentAdmin})
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer shadow-sm shadow-rose-200 active:scale-98"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
