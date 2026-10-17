import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { PurchaseOrder, ItemPO, Produk, Customer, AccountPermission, MutasiStok } from '../types';
import { formatStockNum, getStockAtLocation, getProductStockInfo, normalizePosition } from '../lib/stockHelper';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  X, 
  PlusCircle, 
  MinusCircle, 
  Printer, 
  FileDown, 
  Receipt,
  Users,
  MapPin,
  UserCheck,
  Tag,
  DollarSign,
  AlertTriangle,
  Ban,
  AlertCircle
} from 'lucide-react';

interface PurchaseOrderViewProps {
  poList: PurchaseOrder[];
  produkList: Produk[];
  stokLogs?: MutasiStok[];
  customers?: Customer[];
  posisiList?: string[];
  accounts?: AccountPermission[];
  adminName?: string;
  onSavePO: (po: Omit<PurchaseOrder, 'id'> & { id?: string }, recordStock?: boolean) => PurchaseOrder;
  onDeletePO: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: 'DRAFT' | 'DIPESAN' | 'DITERIMA' | 'BATAL') => void;
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
};

interface ProductSearchInputProps {
  idx: number;
  item: ItemPO;
  produkList: Produk[];
  posisi: string;
  stokLogs?: MutasiStok[];
  onSelectProduct: (index: number, prod: Produk) => void;
  onCustomNameChange: (index: number, name: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
  onEnterToQty: () => void;
}

const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
  idx,
  item,
  produkList,
  posisi,
  stokLogs = [],
  onSelectProduct,
  onCustomNameChange,
  inputRef,
  onEnterToQty
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(item.namaProduk || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search query with item.namaProduk when it changes externally
  useEffect(() => {
    setSearchQuery(item.namaProduk || '');
  }, [item.namaProduk]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products: show top 10 matches (minimal 10 opsi) to prevent loading delay
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return produkList.slice(0, 10);
    }
    const q = searchQuery.toLowerCase().trim();
    const matched = produkList.filter((p) => {
      const matchName = p.nama.toLowerCase().includes(q);
      const matchSku = p.sku && p.sku.toLowerCase().includes(q);
      const matchKategori = p.kategori && p.kategori.toLowerCase().includes(q);
      return matchName || matchSku || matchKategori;
    });
    return matched.slice(0, 10);
  }, [produkList, searchQuery]);

  const handleSelect = (prod: Produk) => {
    const stockInPos = getStockAtLocation(prod, posisi, stokLogs);
    if (stockInPos <= 0) {
      alert(
        `TIDAK DAPAT DI-INPUT:\n\nProduk "${prod.nama}" memiliki STOK KOSONG (0 unit) di lokasi ${posisi}!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.`
      );
      return;
    }
    setSearchQuery(prod.nama);
    onSelectProduct(idx, prod);
    setIsOpen(false);
    onEnterToQty();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredProducts.length > 0 && filteredProducts[activeIndex]) {
        const prod = filteredProducts[activeIndex];
        const stockInPos = getStockAtLocation(prod, posisi, stokLogs);
        if (stockInPos <= 0) {
          alert(
            `TIDAK DAPAT DI-INPUT:\n\nProduk "${prod.nama}" memiliki STOK KOSONG (0 unit) di lokasi ${posisi}!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.`
          );
          return;
        }
        handleSelect(prod);
      } else {
        if (searchQuery.trim()) {
          onCustomNameChange(idx, searchQuery.trim());
        }
        setIsOpen(false);
        onEnterToQty();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (isOpen && filteredProducts.length > 0) {
        const chosen = filteredProducts[activeIndex] || filteredProducts[0];
        if (chosen && searchQuery.trim() && searchQuery !== item.namaProduk) {
          const stockInPos = getStockAtLocation(chosen, posisi, stokLogs);
          if (stockInPos <= 0) {
            alert(
              `TIDAK DAPAT DI-INPUT:\n\nProduk "${chosen.nama}" memiliki STOK KOSONG (0 unit) di lokasi ${posisi}!`
            );
            return;
          }
          onSelectProduct(idx, chosen);
          setSearchQuery(chosen.nama);
        }
      }
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          required
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onCustomNameChange(idx, e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ketik cari nama / SKU..."
          className="text-xs bg-white w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-2xs font-medium text-slate-800 placeholder:text-slate-400"
        />
        {searchQuery ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setSearchQuery('');
              onCustomNameChange(idx, '');
              setIsOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown 10 Opsi Produk */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-[320px] sm:w-[440px] max-h-72 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl z-50 divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-100">
            <span>Daftar Produk ({filteredProducts.length} opsi)</span>
            <span className="text-[9px] text-indigo-600 font-semibold">Lokasi Penjualan: {posisi}</span>
          </div>

          {filteredProducts.length > 0 ? (
            filteredProducts.map((p, pIdx) => {
              const isSelected = p.id === item.idProduk;
              const isActive = pIdx === activeIndex;
              const stockInPos = getStockAtLocation(p, posisi, stokLogs);
              const isStockEmpty = stockInPos <= 0;
              const normPos = normalizePosition(posisi);

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setActiveIndex(pIdx)}
                  className={`p-2.5 transition-colors text-left flex items-start justify-between gap-2 border-b border-slate-50 last:border-b-0 ${
                    isStockEmpty
                      ? 'bg-rose-50/50 opacity-80 cursor-not-allowed hover:bg-rose-100/60'
                      : isActive
                      ? 'bg-indigo-50 text-indigo-950 cursor-pointer'
                      : isSelected
                      ? 'bg-slate-50/90 cursor-pointer'
                      : 'hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`font-semibold text-xs leading-tight ${isStockEmpty ? 'text-slate-700' : 'text-slate-800'}`}>
                        {p.nama}
                      </p>
                      {isStockEmpty && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300 inline-flex items-center gap-1 shrink-0">
                          <Ban className="w-2.5 h-2.5" /> STOK KOSONG DI {posisi}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {p.sku && (
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-bold">
                          {p.sku}
                        </span>
                      )}
                      {p.satuan && (
                        <span className="text-[10px] text-slate-500">
                          Satuan: {p.satuan}
                        </span>
                      )}
                    </div>
                    {/* Stock Position breakdown: TOKO, GUDANG, PIRANHA */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[9px]">
                      <span className={`font-bold px-1.5 py-0.5 rounded border ${
                        normPos === 'TOKO'
                          ? (p.qtyToko ?? 0) <= 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                            : 'bg-blue-100 text-blue-900 border-blue-400 ring-1 ring-blue-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        TOKO: {formatStockNum(p.qtyToko ?? 0)}
                      </span>
                      <span className={`font-bold px-1.5 py-0.5 rounded border ${
                        normPos === 'GUDANG'
                          ? (p.qtyGudang ?? 0) <= 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                            : 'bg-purple-100 text-purple-900 border-purple-400 ring-1 ring-purple-300'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        GUDANG: {formatStockNum(p.qtyGudang ?? 0)}
                      </span>
                      <span className={`font-bold px-1.5 py-0.5 rounded border ${
                        normPos === 'PIRANHA'
                          ? (p.qtyPiranha ?? 0) <= 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                            : 'bg-teal-100 text-teal-900 border-teal-400 ring-1 ring-teal-300'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}>
                        PIRANHA: {formatStockNum(p.qtyPiranha ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-700 block">
                      {formatRupiah(p.eceran || p.harga || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">Eceran</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              <p>Tidak ada produk ditemukan untuk "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => {
                  onCustomNameChange(idx, searchQuery);
                  setIsOpen(false);
                }}
                className="mt-1.5 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Gunakan "{searchQuery}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({
  poList,
  produkList,
  stokLogs = [],
  customers = [],
  posisiList = ['TOKO', 'GUDANG', 'PIRANHA'],
  accounts = [],
  adminName = 'Admin',
  onSavePO,
  onDeletePO,
  onUpdateStatus
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);

  // Helper for real-time Indonesian Day & Date Time
  const getRealtimeDateTime = () => {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dayName}, ${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  };

  // Form State for Pop up Penjualan
  // 1. ID
  // 2. CUSTOMER
  // 3. POSISI (sheet POSISI)
  // 4. ADMIN (otomatis akun login)
  // 5. HARI/TANGGAL (real time & tidak bisa di edit)
  const [noPO, setNoPO] = useState('');
  const [customer, setCustomer] = useState('');
  const [posisi, setPosisi] = useState('');
  const [admin, setAdmin] = useState('');
  const [realtimeDate, setRealtimeDate] = useState('');
  const [catatan, setCatatan] = useState('');
  const [recordStock, setRecordStock] = useState(true);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
  const [deniedModalAction, setDeniedModalAction] = useState<'edit' | 'delete' | null>(null);

  // Live timer for HARI/TANGGAL while modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setInterval(() => {
      setRealtimeDate(getRealtimeDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [isModalOpen]);

  // Initial items list in form - prefer product with stock > 0
  const initialAvailableProd = produkList.find((p) => getStockAtLocation(p, 'TOKO', stokLogs) > 0) || produkList[0];
  const [items, setItems] = useState<ItemPO[]>([
    { 
      idProduk: initialAvailableProd?.id || '', 
      sku: initialAvailableProd?.sku || initialAvailableProd?.id || '',
      namaProduk: initialAvailableProd?.nama || '', 
      quantity: 1, 
      satuan: initialAvailableProd?.satuan || 'Pcs',
      harga: initialAvailableProd?.eceran || initialAvailableProd?.harga || 0,
      jenisHarga: 'Eceran'
    }
  ]);

  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const currentLoggedAdmin = adminName || sessionStorage.getItem('globalMartAdmin') || 'Admin';
  const isServer = currentLoggedAdmin.toUpperCase().includes('SERVER') || currentLoggedAdmin.toUpperCase() === 'ADMIN';

  const getAdminPosisi = (username: string): string => {
    const found = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (found?.posisi) return found.posisi;
    if (found?.role) {
      if (found.role.toUpperCase().includes('GUDANG')) return 'GUDANG';
      if (found.role.toUpperCase().includes('PIRANHA')) return 'PIRANHA';
      if (found.role.toUpperCase().includes('TOKO')) return 'TOKO';
    }
    try {
      const saved = localStorage.getItem('globalMartAccountsPermissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        const acc = parsed.find((a: any) => a.username.toLowerCase() === username.toLowerCase());
        if (acc?.posisi) return acc.posisi;
        if (acc?.role?.toUpperCase().includes('GUDANG')) return 'GUDANG';
        if (acc?.role?.toUpperCase().includes('PIRANHA')) return 'PIRANHA';
        if (acc?.role?.toUpperCase().includes('TOKO')) return 'TOKO';
      }
    } catch (e) {}

    if (username.toLowerCase().includes('gudang')) return 'GUDANG';
    if (username.toLowerCase().includes('piranha')) return 'PIRANHA';
    if (username.toLowerCase().includes('toko') || username.toLowerCase() === 'kasir' || username.toLowerCase() === 'admin') return 'TOKO';

    return 'TOKO';
  };

  const openModal = () => {
    // Generate next Penjualan ID: PJ-0001, PJ-0002, etc.
    let nextNum = poList.length + 1;
    poList.forEach((p) => {
      const code = p.noPO || p.id;
      if (code) {
        const match = code.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      }
    });
    const generatedId = `PJ-${String(nextNum).padStart(4, '0')}`;
    setNoPO(generatedId);

    // Initial values
    setCustomer(customers[0]?.namaCustomer || '');

    const currentLoggedAdmin = adminName || sessionStorage.getItem('globalMartAdmin') || 'Admin';
    setAdmin(currentLoggedAdmin);

    const isCurrentServer = currentLoggedAdmin.toUpperCase().includes('SERVER');
    const initialPos = isCurrentServer ? 'TOKO' : getAdminPosisi(currentLoggedAdmin);
    setPosisi(initialPos);

    setRealtimeDate(getRealtimeDateTime());
    setCatatan('');
    setRecordStock(true);

    // Find first product with available stock > 0 in initialPos
    const firstAvailable = produkList.find(
      (p) => getStockAtLocation(p, initialPos, stokLogs) > 0
    );

    if (firstAvailable) {
      const pPrice = firstAvailable.eceran || firstAvailable.harga || 0;
      setItems([{
        idProduk: firstAvailable.id,
        sku: firstAvailable.sku || firstAvailable.id,
        namaProduk: firstAvailable.nama,
        quantity: 1,
        satuan: firstAvailable.satuan || 'Pcs',
        harga: pPrice,
        jenisHarga: 'Eceran'
      }]);
    } else {
      setItems([{ 
        idProduk: '', 
        sku: '', 
        namaProduk: '', 
        quantity: 1, 
        satuan: 'Pcs', 
        harga: 0, 
        jenisHarga: 'Eceran' 
      }]);
    }

    productInputRefs.current = [];
    qtyInputRefs.current = [];
    setIsModalOpen(true);
  };

  const handleAddItemRow = (autoFocus = false) => {
    // Pick first product that has stock > 0 in current posisi and not already added
    const availableProd =
      produkList.find(
        (p) => getStockAtLocation(p, posisi, stokLogs) > 0 && !items.some((it) => it.idProduk === p.id)
      ) ||
      produkList.find((p) => getStockAtLocation(p, posisi, stokLogs) > 0);

    const newIdx = items.length;
    setItems((prev) => [
      ...prev,
      {
        idProduk: availableProd ? availableProd.id : '',
        sku: availableProd ? (availableProd.sku || availableProd.id) : '',
        namaProduk: availableProd ? availableProd.nama : '',
        quantity: 1,
        satuan: availableProd ? (availableProd.satuan || 'Pcs') : 'Pcs',
        harga: availableProd ? (availableProd.eceran || availableProd.harga || 0) : 0,
        jenisHarga: 'Eceran'
      }
    ]);

    if (autoFocus) {
      setTimeout(() => {
        const el = productInputRefs.current[newIdx];
        if (el) {
          el.focus();
        }
      }, 50);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (index: number, prod: Produk) => {
    const stockInPos = getStockAtLocation(prod, posisi, stokLogs);
    if (stockInPos <= 0) {
      alert(
        `TIDAK BISA DI-INPUT:\n\nStok produk "${prod.nama}" di lokasi ${posisi} KOSONG (0 unit)!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.`
      );
      return;
    }
    const newItems = [...items];
    const cur = { ...newItems[index] };
    cur.idProduk = prod.id;
    cur.sku = prod.sku || prod.id;
    cur.namaProduk = prod.nama;
    cur.satuan = prod.satuan || 'Pcs';
    const tier = cur.jenisHarga || 'Eceran';
    if (tier === 'Eceran') cur.harga = prod.eceran || prod.harga || 0;
    else if (tier === 'Grosir') cur.harga = prod.grosir || prod.harga || 0;
    else if (tier === 'Partai') cur.harga = prod.partai || prod.harga || 0;
    newItems[index] = cur;
    setItems(newItems);
  };

  const handleCustomProductName = (index: number, name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      const match = produkList.find(
        (p) =>
          p.nama.toLowerCase() === trimmed.toLowerCase() ||
          (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase())
      );
      if (match) {
        const stockInPos = getStockAtLocation(match, posisi, stokLogs);
        if (stockInPos <= 0) {
          alert(
            `TIDAK BISA DI-INPUT:\n\nStok produk "${match.nama}" di lokasi ${posisi} KOSONG (0 unit)!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.`
          );
          return;
        }
        handleSelectProduct(index, match);
        return;
      }
    }
    const newItems = [...items];
    const cur = { ...newItems[index] };
    cur.namaProduk = name;
    newItems[index] = cur;
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof ItemPO, value: any) => {
    const newItems = [...items];
    const cur = { ...newItems[index] };

    if (field === 'idProduk') {
      const prod = produkList.find((p) => p.id === value);
      if (prod) {
        const stockInPos = getStockAtLocation(prod, posisi, stokLogs);
        if (stockInPos <= 0) {
          alert(
            `TIDAK BISA DI-INPUT:\n\nStok produk "${prod.nama}" di lokasi ${posisi} KOSONG (0 unit)!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.`
          );
          return;
        }
        cur.idProduk = prod.id;
        cur.sku = prod.sku || prod.id;
        cur.namaProduk = prod.nama;
        cur.satuan = prod.satuan || 'Pcs';
        const tier = cur.jenisHarga || 'Eceran';
        if (tier === 'Eceran') cur.harga = prod.eceran || prod.harga || 0;
        else if (tier === 'Grosir') cur.harga = prod.grosir || prod.harga || 0;
        else if (tier === 'Partai') cur.harga = prod.partai || prod.harga || 0;
      }
    } else if (field === 'jenisHarga') {
      cur.jenisHarga = value;
      const prod = produkList.find((p) => p.id === cur.idProduk);
      if (prod) {
        if (value === 'Eceran') cur.harga = prod.eceran || prod.harga || 0;
        else if (value === 'Grosir') cur.harga = prod.grosir || prod.harga || 0;
        else if (value === 'Partai') cur.harga = prod.partai || prod.harga || 0;
      }
    } else {
      (cur as any)[field] = value;
    }

    newItems[index] = cur;
    setItems(newItems);
  };

  // Automated Calculations: TOTAL QTY & TOTAL HARGA
  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalHarga = items.reduce(
    (acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.harga) || 0)), 
    0
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      alert('Silakan pilih atau masukkan nama CUSTOMER.');
      return;
    }

    if (!posisi.trim()) {
      alert('Silakan pilih POSISI.');
      return;
    }

    const validItems = items
      .filter((it) => it.namaProduk.trim() && (Number(it.quantity) || 0) > 0)
      .map((it) => ({
        ...it,
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        harga: Math.max(0, Number(it.harga) || 0),
      }));
    if (validItems.length === 0) {
      alert('Masukkan minimal 1 barang dengan quantity yang valid.');
      return;
    }

    // Strict validation: "dibagian menu Penjualan tidak akan bisa di input apabila stok di lokasinya kosong"
    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      const prod =
        produkList.find((p) => p.id === it.idProduk) ||
        produkList.find((p) => p.sku === it.sku) ||
        produkList.find((p) => p.nama.toLowerCase() === it.namaProduk.toLowerCase());

      if (prod) {
        const stockInLocation = getStockAtLocation(prod, posisi, stokLogs);
        if (stockInLocation <= 0) {
          alert(
            `GAGAL MENYIMPAN PENJUALAN:\n\nBarang #${i + 1} "${it.namaProduk}" memiliki STOK KOSONG (0 unit) di lokasi ${posisi}!\n\nDi menu Penjualan tidak akan bisa di-input apabila stok di lokasinya kosong.\n\nSilakan hapus baris barang tersebut atau pindahkan ke lokasi yang memiliki stok sebelum melanjutkan.`
          );
          return;
        }
        if (Number(it.quantity) > stockInLocation) {
          alert(
            `GAGAL MENYIMPAN PENJUALAN:\n\nJumlah pesanan "${it.namaProduk}" (${it.quantity} ${it.satuan}) melebihi sisa stok yang tersedia di lokasi ${posisi} (${formatStockNum(stockInLocation)} ${it.satuan})!\n\nSilakan sesuaikan jumlah barang.`
          );
          return;
        }
      }
    }

    const createdPO = onSavePO(
      {
        noPO: noPO,
        tanggal: realtimeDate,
        customer: customer.trim(),
        namaSupplier: customer.trim(), // backward-compatible
        posisi: posisi.trim(),
        admin: admin.trim(),
        items: validItems,
        totalQty: totalQty,
        totalHarga: totalHarga,
        catatan,
        status: 'DIPESAN'
      },
      recordStock
    );

    setIsModalOpen(false);
    setActivePO(createdPO);
  };

  const handleDeletePO = (po: PurchaseOrder) => {
    if (!isServer) {
      setDeniedModalAction('delete');
      return;
    }
    setPoToDelete(po);
  };

  const confirmDeletePO = () => {
    if (poToDelete) {
      onDeletePO(poToDelete.id);
      setPoToDelete(null);
    }
  };

  // Helper Print
  const handlePrintPO = () => {
    const printContent = document.getElementById('printable-po-modal');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota Penjualan - ${activePO?.noPO || 'Penjualan'}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              font-size: 11pt;
            }
            .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            table.items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 9pt; text-transform: uppercase; }
            table.items-table td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .bold { font-weight: bold; }
            .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-top: 10px; margin-bottom: 20px; }
            .signature-table { width: 100%; margin-top: 25px; text-align: center; }
            .signature-table td { width: 50%; padding-top: 60px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Helper Download PDF
  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-po-modal');
    if (!element || !activePO) return;

    try {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.padding = '24px';
      clone.style.width = '750px';
      clone.style.backgroundColor = '#ffffff';

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.appendChild(clone);
      document.body.appendChild(container);

      const html2pdfModule = typeof html2pdf === 'function' ? html2pdf : (window as any).html2pdf;
      if (!html2pdfModule) {
        throw new Error('html2pdf not available');
      }

      const filename = `Nota_Penjualan_${activePO.noPO || activePO.id}_${activePO.customer || activePO.namaSupplier || 'Customer'}.pdf`;
      const opt = {
        margin:       [10, 10, 10, 10],
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
      document.body.removeChild(container);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Sistem akan membuka menu Cetak Browser. Pilih "Simpan sebagai PDF" / "Save as PDF" pada tujuan printer Anda.');
      window.print();
    }
  };

  const filteredPO = poList.filter(
    (p) =>
      (p.customer && p.customer.toLowerCase().includes(search.toLowerCase())) ||
      (p.namaSupplier && p.namaSupplier.toLowerCase().includes(search.toLowerCase())) ||
      (p.posisi && p.posisi.toLowerCase().includes(search.toLowerCase())) ||
      (p.admin && p.admin.toLowerCase().includes(search.toLowerCase())) ||
      p.tanggal.includes(search) ||
      (p.noPO && p.noPO.toLowerCase().includes(search.toLowerCase())) ||
      p.items.some((it) => it.namaProduk.toLowerCase().includes(search.toLowerCase()) || (it.sku && it.sku.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" /> 
            <span>Penjualan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan data penjualan barang lengkap dengan ID, Customer, Posisi, Admin, SKU, Tier Harga, Total Qty & Total Harga.
          </p>
        </div>

        <button
          onClick={openModal}
          className="btn-neon w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Buat Penjualan
        </button>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        <div className="md:col-span-8 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID, customer, posisi, admin, SKU, atau barang..."
            className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">
              Clear
            </button>
          )}
        </div>

        <div className="md:col-span-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Penjualan</p>
            <p className="text-xl sm:text-2xl font-bold font-mono mt-0.5">{poList.length} Transaksi</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {filteredPO.length === 0 ? (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Belum ada data Penjualan. Klik "Buat Penjualan" untuk menambahkan.
          </div>
        ) : (
          filteredPO.map((p) => {
            const calculatedTotalQty = p.totalQty ?? p.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
            const calculatedTotalHarga = p.totalHarga ?? p.items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.harga || 0)), 0);

            return (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="font-bold text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                      {p.noPO || p.id}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono text-slate-500 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {p.tanggal}
                    </div>
                  </div>

                  <div>
                    {p.status === 'DITERIMA' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> DITERIMA
                      </span>
                    ) : p.status === 'BATAL' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                        <X className="w-3.5 h-3.5" /> BATAL
                      </span>
                    ) : p.status === 'DIPESAN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" /> DIPESAN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" /> DRAFT
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Customer:</span>
                    <div className="font-bold text-slate-900">{p.customer || p.namaSupplier || '-'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Posisi / Admin:</span>
                    <div className="text-slate-700 font-medium">{p.posisi || '-'} • <span className="font-semibold text-indigo-700">{p.admin || '-'}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">List Barang Dipesan:</p>
                  {p.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-800">
                      <div className="break-words pr-2 leading-snug">
                        <span className="font-semibold">{it.namaProduk}</span>
                        {it.sku && <span className="text-[10px] text-slate-400 font-mono ml-1">({it.sku})</span>}
                        {it.jenisHarga && <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1 rounded ml-1">{it.jenisHarga}</span>}
                      </div>
                      <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                        {it.quantity} {it.satuan}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600">Total: {calculatedTotalQty} Unit</span>
                    <span className="text-emerald-700 font-mono">{formatRupiah(calculatedTotalHarga)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setActivePO(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Printer className="w-4 h-4" /> Nota Penjualan
                  </button>

                  {p.status !== 'DITERIMA' && (
                    <button
                      onClick={() => onUpdateStatus(p.id, 'DITERIMA')}
                      className="py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center cursor-pointer active:scale-98"
                    >
                      Selesai
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePO(p)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isServer
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer'
                        : 'text-slate-300 hover:text-rose-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={isServer ? "Hapus Penjualan" : "Fitur delete hanya bisa dilakukan oleh akun SERVER"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Penjualan Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-5 py-4">ID & Waktu</th>
                <th className="px-5 py-4">Customer & Posisi</th>
                <th className="px-5 py-4">Admin</th>
                <th className="px-5 py-4">List Barang (SKU, Harga, Qty)</th>
                <th className="px-5 py-4 text-right">Total Qty & Harga</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPO.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    Belum ada data Penjualan. Klik "Buat Penjualan" untuk menambahkan.
                  </td>
                </tr>
              ) : (
                filteredPO.map((p) => {
                  const calculatedTotalQty = p.totalQty ?? p.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
                  const calculatedTotalHarga = p.totalHarga ?? p.items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.harga || 0)), 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block mb-1">
                          {p.noPO || p.id}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 mb-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{p.tanggal}</span>
                        </div>
                        {p.status === 'DITERIMA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3" /> DITERIMA
                          </span>
                        ) : p.status === 'BATAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <X className="w-3 h-3" /> BATAL
                          </span>
                        ) : p.status === 'DIPESAN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> DIPESAN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> DRAFT
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{p.customer || p.namaSupplier || '-'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Posisi: <strong className="text-slate-700">{p.posisi || '-'}</strong></span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{p.admin || '-'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1.5 max-w-md">
                          {p.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                              <div className="break-words leading-snug">
                                <span className="font-semibold text-slate-800">{it.namaProduk}</span>
                                {it.sku && <span className="text-[10px] text-slate-400 font-mono ml-1.5">({it.sku})</span>}
                                {it.jenisHarga && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded ml-1">
                                    {it.jenisHarga}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {it.quantity} {it.satuan}
                                </span>
                                {it.harga ? (
                                  <span className="text-[11px] text-slate-500 block font-mono">
                                    @{formatRupiah(it.harga)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                        {p.catatan && (
                          <p className="text-xs text-slate-500 italic mt-1.5">Ket: {p.catatan}</p>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top text-right">
                        <div className="text-xs text-slate-500">
                          Total Qty: <strong className="text-slate-800 font-mono">{calculatedTotalQty} Unit</strong>
                        </div>
                        <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                          {formatRupiah(calculatedTotalHarga)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActivePO(p)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Lihat / Cetak Penjualan"
                          >
                            <Printer className="w-3.5 h-3.5" /> Nota Penjualan
                          </button>

                          {p.status !== 'DITERIMA' && (
                            <button
                              onClick={() => onUpdateStatus(p.id, 'DITERIMA')}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Tandai Selesai"
                            >
                              Selesai
                            </button>
                          )}

                          <button
                            onClick={() => handleDeletePO(p)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isServer
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                : 'text-slate-300 hover:text-rose-400 bg-slate-50 cursor-not-allowed opacity-60'
                            }`}
                            title={isServer ? "Hapus Penjualan" : "Fitur delete hanya bisa dilakukan oleh akun SERVER"}
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

      {/* Pop up Penjualan Baru */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[94vh] flex flex-col relative z-10"
            style={{ width: '897.496px', maxWidth: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0"
              style={{ height: '64.9688px' }}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base font-display">Penjualan</h3>
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

            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
              {/* Header Grid: ID, CUSTOMER, POSISI, ADMIN, HARI/TANGGAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {/* 1. ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    ID (No. Transaksi)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={noPO}
                    className="input-futuristic text-xs sm:text-sm font-mono font-bold text-indigo-700 bg-slate-100 cursor-not-allowed w-full"
                  />
                </div>

                {/* 2. CUSTOMER */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    CUSTOMER *
                  </label>
                  <input
                    type="text"
                    required
                    list="customer-list-datalist"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Pilih atau ketik Customer..."
                    className="input-futuristic text-xs sm:text-sm bg-white w-full"
                    autoFocus
                  />
                  <datalist id="customer-list-datalist">
                    {customers.map((c, idx) => (
                      <option key={`${c.id || c.namaCustomer}-${idx}`} value={c.namaCustomer}>
                        {c.namaCustomer} {c.pic ? `(PIC: ${c.pic})` : ''} {c.metodePembayaran ? `[${c.metodePembayaran}]` : ''}
                      </option>
                    ))}
                    <option value="Customer Umum" />
                  </datalist>
                </div>

                {/* 3. POSISI (sesuai data sheet ADMIN / SERVER opsi LOKASI TOKO/GUDANG/PIRANHA) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      POSISI {isServer ? '(Opsi TOKO/GUDANG/PIRANHA)' : '(Sheet ADMIN)'} *
                    </label>
                    {!isServer && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Otomatis Sheet ADMIN
                      </span>
                    )}
                  </div>
                  <select
                    value={posisi}
                    onChange={(e) => {
                      const newPos = e.target.value;
                      setPosisi(newPos);
                      const emptyInNewPos = items.filter((it) => {
                        if (!it.namaProduk.trim()) return false;
                        const p = produkList.find(
                          (x) => x.id === it.idProduk || x.sku === it.sku || x.nama.toLowerCase() === it.namaProduk.toLowerCase()
                        );
                        return p ? getStockAtLocation(p, newPos, stokLogs) <= 0 : false;
                      });
                      if (emptyInNewPos.length > 0) {
                        alert(
                          `Perhatian:\nTerdapat ${emptyInNewPos.length} barang di daftar pesanan yang memiliki STOK KOSONG di lokasi ${newPos}!\n\nBarang tersebut tidak dapat disimpan untuk Penjualan di lokasi ini.`
                        );
                      }
                    }}
                    disabled={!isServer}
                    className={`input-futuristic text-xs sm:text-sm w-full font-bold transition-all ${
                      isServer
                        ? 'bg-white cursor-pointer border-indigo-400 text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200'
                    }`}
                    required
                  >
                    {isServer ? (
                      <>
                        <option value="TOKO">TOKO (QTY TOKO)</option>
                        <option value="GUDANG">GUDANG (QTY GUDANG)</option>
                        <option value="PIRANHA">PIRANHA (QTY PIRANHA)</option>
                        {Array.from(new Set(['TOKO', 'GUDANG', 'PIRANHA', ...posisiList]))
                          .filter((p) => p !== 'TOKO' && p !== 'GUDANG' && p !== 'PIRANHA')
                          .map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                      </>
                    ) : (
                      <option value={posisi}>{posisi || 'TOKO'}</option>
                    )}
                  </select>
                  {isServer ? (
                    <p className="text-[10px] text-indigo-600 mt-1 font-medium">
                      Khusus akun SERVER dapat memilih opsi lokasi TOKO / GUDANG / PIRANHA.
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Otomatis terkunci mengikuti data akun di sheet ADMIN.
                    </p>
                  )}
                </div>

                {/* 4. ADMIN (otomatis akun login) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    ADMIN (Akun Login)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={admin}
                    className="input-futuristic text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 cursor-not-allowed w-full"
                  />
                </div>

                {/* 5. HARI/TANGGAL (real time, tidak bisa di pilih/di edit) */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>HARI / TANGGAL (Real Time)</span>
                    <span className="text-[10px] font-normal text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Otomatis Real Time
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={realtimeDate}
                    className="input-futuristic text-xs sm:text-sm font-mono font-medium text-slate-700 bg-slate-100 cursor-not-allowed w-full"
                  />
                </div>
              </div>

              {/* Items Section: List Barang Yang Dipesan (PO) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-indigo-600" />
                      <span>List Barang Yang Dipesan (PO) *</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 font-medium px-2 py-0.5 rounded-full border border-indigo-100 hidden sm:inline-flex items-center gap-1">
                      <kbd className="bg-white px-1 py-0.2 rounded border border-indigo-200 font-mono font-bold text-[9px] shadow-2xs">Tab</kbd> di baris terakhir otomatis tambah barang
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItemRow(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer shrink-0 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" /> Tambah Barang
                  </button>
                </div>

                {/* Table Form for List Barang Yang Dipesan (PO) */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs min-h-[340px] pb-32">
                  <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-center w-12 border-r border-slate-200">No</th>
                        <th className="py-3 px-3 w-36 border-r border-slate-200">SKU</th>
                        <th className="py-3 px-3 min-w-[280px] border-r border-slate-200">Nama Produk</th>
                        <th className="py-3 px-3 w-32 border-r border-slate-200 text-center">Qty</th>
                        <th className="py-3 px-3 w-36 border-r border-slate-200">Harga (Rp)</th>
                        <th className="py-3 px-3 w-32 border-r border-slate-200">Jenis Harga</th>
                        <th className="py-3 px-3 w-32 text-right border-r border-slate-200">Subtotal</th>
                        <th className="py-3 px-3 w-14 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const selectedProd =
                          produkList.find((p) => p.id === item.idProduk) ||
                          produkList.find((p) => p.sku === item.sku) ||
                          produkList.find((p) => p.nama.toLowerCase() === item.namaProduk.toLowerCase());
                        const stockAtLoc = selectedProd ? getStockAtLocation(selectedProd, posisi, stokLogs) : null;
                        const isZeroStock = stockAtLoc !== null && stockAtLoc <= 0;
                        const isExceeded = stockAtLoc !== null && stockAtLoc > 0 && Number(item.quantity) > stockAtLoc;
                        const normPos = normalizePosition(posisi);
                        const itemSubtotal = (Number(item.quantity) || 0) * (Number(item.harga) || 0);

                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isZeroStock
                                ? 'bg-rose-50/70 border-b border-rose-200'
                                : 'hover:bg-slate-50/80 border-b border-slate-100'
                            }`}
                          >
                            {/* No */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">
                              {idx + 1}
                            </td>

                            {/* SKU */}
                            <td className="py-3 px-3 border-r border-slate-100">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs inline-block">
                                {item.sku || selectedProd?.sku || '-'}
                              </span>
                            </td>

                            {/* Nama Produk (Bisa diketik & tampil minimal 10 opsi dropdown) */}
                            <td className="py-3 px-3 border-r border-slate-100 min-w-[280px]">
                              <ProductSearchInput
                                idx={idx}
                                item={item}
                                produkList={produkList}
                                posisi={posisi}
                                stokLogs={stokLogs}
                                onSelectProduct={handleSelectProduct}
                                onCustomNameChange={handleCustomProductName}
                                inputRef={(el) => { productInputRefs.current[idx] = el; }}
                                onEnterToQty={() => { qtyInputRefs.current[idx]?.focus(); }}
                              />
                              {selectedProd && (
                                <div className="space-y-1.5 mt-1.5">
                                  {isZeroStock && (
                                    <div className="p-1.5 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                                      <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>STOK KOSONG DI {posisi} (0 Unit) - Produk ini tidak bisa di-input!</span>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    <span className="text-[10px] text-slate-500 font-semibold">Posisi Stock:</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-mono font-bold border ${
                                        normPos === 'TOKO'
                                          ? (selectedProd.qtyToko ?? 0) <= 0
                                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                                            : 'bg-blue-100 text-blue-900 border-blue-400 ring-1 ring-blue-300'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}
                                    >
                                      TOKO: {formatStockNum(selectedProd.qtyToko ?? 0)}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-mono font-bold border ${
                                        normPos === 'GUDANG'
                                          ? (selectedProd.qtyGudang ?? 0) <= 0
                                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                                            : 'bg-purple-100 text-purple-900 border-purple-400 ring-1 ring-purple-300'
                                          : 'bg-purple-50 text-purple-700 border-purple-200'
                                      }`}
                                    >
                                      GUDANG: {formatStockNum(selectedProd.qtyGudang ?? 0)}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-mono font-bold border ${
                                        normPos === 'PIRANHA'
                                          ? (selectedProd.qtyPiranha ?? 0) <= 0
                                            ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                                            : 'bg-teal-100 text-teal-900 border-teal-400 ring-1 ring-teal-300'
                                          : 'bg-teal-50 text-teal-700 border-teal-200'
                                      }`}
                                    >
                                      PIRANHA: {formatStockNum(selectedProd.qtyPiranha ?? 0)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Qty */}
                            <td className="py-3 px-3 border-r border-slate-100">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    ref={(el) => { qtyInputRefs.current[idx] = el; }}
                                    type="number"
                                    min={1}
                                    required
                                    disabled={isZeroStock}
                                    value={item.quantity === '' ? '' : item.quantity}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '') {
                                        handleItemChange(idx, 'quantity', '');
                                      } else {
                                        const num = parseInt(val, 10);
                                        handleItemChange(idx, 'quantity', isNaN(num) ? '' : Math.max(0, num));
                                      }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={() => {
                                      if (!item.quantity || Number(item.quantity) < 1) {
                                        handleItemChange(idx, 'quantity', 1);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (idx === items.length - 1) {
                                          handleAddItemRow(true);
                                        } else {
                                          productInputRefs.current[idx + 1]?.focus();
                                        }
                                      }
                                    }}
                                    className={`text-xs font-mono font-bold w-20 text-center py-1.5 px-2 rounded-xl border outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                      isZeroStock
                                        ? 'bg-rose-100 text-rose-500 border-rose-300 cursor-not-allowed'
                                        : isExceeded
                                        ? 'bg-amber-50 text-amber-900 border-amber-400 ring-1 ring-amber-300'
                                        : 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-text'
                                    }`}
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium shrink-0">
                                    {item.satuan || 'Pcs'}
                                  </span>
                                </div>
                                {isZeroStock && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                    Stok 0
                                  </span>
                                )}
                                {isExceeded && !isZeroStock && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    Max {formatStockNum(stockAtLoc || 0)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Harga */}
                            <td className="py-3 px-3 border-r border-slate-100">
                              <input
                                type="number"
                                min={0}
                                value={item.harga === '' ? '' : item.harga}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    handleItemChange(idx, 'harga', '');
                                  } else {
                                    const num = parseFloat(val);
                                    handleItemChange(idx, 'harga', isNaN(num) ? '' : Math.max(0, num));
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => {
                                  if (item.harga === '' || isNaN(Number(item.harga))) {
                                    handleItemChange(idx, 'harga', 0);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (idx === items.length - 1) {
                                      handleAddItemRow(true);
                                    } else {
                                      productInputRefs.current[idx + 1]?.focus();
                                    }
                                  }
                                }}
                                placeholder="0"
                                className="text-xs bg-white font-mono w-full py-1.5 px-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                              />
                            </td>

                            {/* Jenis Harga */}
                            <td className="py-3 px-3 border-r border-slate-100">
                              <select
                                value={item.jenisHarga || 'Eceran'}
                                onChange={(e) => handleItemChange(idx, 'jenisHarga', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab' && !e.shiftKey) {
                                    if (idx === items.length - 1) {
                                      e.preventDefault();
                                      handleAddItemRow(true);
                                    } else {
                                      e.preventDefault();
                                      productInputRefs.current[idx + 1]?.focus();
                                    }
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (idx === items.length - 1) {
                                      handleAddItemRow(true);
                                    } else {
                                      productInputRefs.current[idx + 1]?.focus();
                                    }
                                  }
                                }}
                                className="input-futuristic text-xs bg-white cursor-pointer w-full font-semibold text-indigo-900 py-1.5"
                              >
                                <option value="Eceran">Eceran</option>
                                <option value="Grosir">Grosir</option>
                                <option value="Partai">Partai</option>
                                <option value="Custom">Custom</option>
                              </select>
                            </td>

                            {/* Subtotal */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                              {formatRupiah(itemSubtotal)}
                            </td>

                            {/* Aksi */}
                            <td className="py-3 px-3 text-center">
                              {items.length > 1 ? (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => handleRemoveItemRow(idx)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Tab' && !e.shiftKey) {
                                      if (idx === items.length - 1) {
                                        e.preventDefault();
                                        handleAddItemRow(true);
                                      } else {
                                        e.preventDefault();
                                        productInputRefs.current[idx + 1]?.focus();
                                      }
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isZeroStock
                                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 ring-1 ring-rose-300'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={isZeroStock ? 'Hapus barang berstok kosong ini' : 'Hapus Baris'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Automated TOTAL QTY & TOTAL HARGA Box */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">TOTAL QTY</p>
                    <p className="text-xl font-bold font-mono">{totalQty} Unit / Barang</p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">TOTAL HARGA</p>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{formatRupiah(totalHarga)}</p>
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Catatan / Keterangan Penjualan (Opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan pengiriman / instruksi khusus..."
                  className="input-futuristic text-xs sm:text-sm w-full"
                />
              </div>

              {/* Auto record mutasi stok */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start sm:items-center gap-2">
                <input
                  type="checkbox"
                  id="recordStock"
                  checked={recordStock}
                  onChange={(e) => setRecordStock(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 sm:mt-0 cursor-pointer shrink-0"
                />
                <label htmlFor="recordStock" className="text-xs font-semibold text-indigo-950 cursor-pointer">
                  Otomatis catat pengurangan stok barang keluar di log Mutasi & Stock
                </label>
              </div>

              {/* Warning banner if any product has zero stock in current posisi */}
              {items.some((it) => {
                if (!it.namaProduk.trim()) return false;
                const p = produkList.find(
                  (x) => x.id === it.idProduk || x.sku === it.sku || x.nama.toLowerCase() === it.namaProduk.toLowerCase()
                );
                return p ? getStockAtLocation(p, posisi, stokLogs) <= 0 : false;
              }) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Tidak Dapat Menyimpan Penjualan:</span>
                    <span>
                      Terdapat produk dengan stok kosong (0 unit) di lokasi {posisi}. Sesuai aturan sistem, produk dengan stok kosong tidak dapat di-input untuk Penjualan. Silakan hapus atau ganti barang tersebut.
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5 sm:gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={items.some((it) => {
                    if (!it.namaProduk.trim()) return false;
                    const p = produkList.find(
                      (x) => x.id === it.idProduk || x.sku === it.sku || x.nama.toLowerCase() === it.namaProduk.toLowerCase()
                    );
                    return p ? getStockAtLocation(p, posisi, stokLogs) <= 0 : false;
                  })}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    items.some((it) => {
                      if (!it.namaProduk.trim()) return false;
                      const p = produkList.find(
                        (x) => x.id === it.idProduk || x.sku === it.sku || x.nama.toLowerCase() === it.namaProduk.toLowerCase()
                      );
                      return p ? getStockAtLocation(p, posisi, stokLogs) <= 0 : false;
                    })
                      ? 'bg-rose-100 text-rose-400 border border-rose-200 cursor-not-allowed opacity-60'
                      : 'btn-neon cursor-pointer'
                  }`}
                  title={
                    items.some((it) => {
                      if (!it.namaProduk.trim()) return false;
                      const p = produkList.find(
                        (x) => x.id === it.idProduk || x.sku === it.sku || x.nama.toLowerCase() === it.namaProduk.toLowerCase()
                      );
                      return p ? getStockAtLocation(p, posisi, stokLogs) <= 0 : false;
                    })
                      ? `Terdapat produk dengan stok kosong di lokasi ${posisi}`
                      : 'Simpan Penjualan'
                  }
                >
                  <Receipt className="w-4 h-4" /> Simpan Penjualan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Penjualan & Cetak / Simpan PDF */}
      {activePO && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setActivePO(null)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-4 sm:my-8 overflow-hidden animate-in fade-in zoom-in duration-200 relative z-10 max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Controls */}
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 no-print border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm font-display">Pratinjau Nota Penjualan</h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrintPO}
                  className="px-2.5 sm:px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" /> <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePO(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area Document */}
            <div className="p-4 sm:p-8 overflow-y-auto">
              <div id="printable-po-modal" className="bg-white text-slate-900 space-y-4 sm:space-y-6">
                {/* Header Toko Vidica Dewata */}
                <div className="border-b-2 border-slate-900 pb-3 sm:pb-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div>
                    <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 font-display">
                      TOKO VIDICA DEWATA
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">Jl. Gunung Seraya No. 28, Denpasar, Bali</p>
                    <p className="text-xs text-slate-500">Telp: 08125921720 / 081283364685</p>
                  </div>
                  <div className="sm:text-right">
                    <div className="inline-block bg-slate-900 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                      NOTA PENJUALAN
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-1.5">
                      No. Transaksi: <span className="text-indigo-900">{activePO.noPO || activePO.id}</span>
                    </p>
                    <p className="text-xs font-mono text-slate-600">Hari/Tgl: {activePO.tanggal}</p>
                  </div>
                </div>

                {/* Detail Customer, Posisi, Admin */}
                <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                      CUSTOMER
                    </p>
                    <p className="font-bold text-sm text-slate-900">{activePO.customer || activePO.namaSupplier || '-'}</p>
                  </div>

                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                      POSISI BARANG
                    </p>
                    <p className="font-semibold text-slate-800">{activePO.posisi || '-'}</p>
                  </div>

                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                      ADMIN / KASIR
                    </p>
                    <p className="font-semibold text-slate-800">{activePO.admin || '-'}</p>
                  </div>
                </div>

                {/* Tabel Items Penjualan */}
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                        <th className="p-2.5 sm:p-3 text-center border-r border-slate-300 w-10">No</th>
                        <th className="p-2.5 sm:p-3 border-r border-slate-300">SKU</th>
                        <th className="p-2.5 sm:p-3 border-r border-slate-300">Deskripsi Barang / Produk</th>
                        <th className="p-2.5 sm:p-3 border-r border-slate-300 text-center">Jenis</th>
                        <th className="p-2.5 sm:p-3 text-center border-r border-slate-300">Qty</th>
                        <th className="p-2.5 sm:p-3 text-right border-r border-slate-300">Harga Satuan</th>
                        <th className="p-2.5 sm:p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activePO.items.map((it, idx) => {
                        const sub = (it.quantity || 0) * (it.harga || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 sm:p-3 text-center font-mono border-r border-slate-200">{idx + 1}</td>
                            <td className="p-2.5 sm:p-3 font-mono text-slate-600 border-r border-slate-200">{it.sku || '-'}</td>
                            <td className="p-2.5 sm:p-3 font-semibold text-slate-800 border-r border-slate-200">{it.namaProduk}</td>
                            <td className="p-2.5 sm:p-3 text-center text-slate-600 border-r border-slate-200">{it.jenisHarga || 'Eceran'}</td>
                            <td className="p-2.5 sm:p-3 text-center font-mono font-bold text-indigo-950 border-r border-slate-200">
                              {it.quantity} {it.satuan}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-mono text-slate-700 border-r border-slate-200">
                              {formatRupiah(it.harga || 0)}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(sub)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total Qty & Total Harga Summary */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold">TOTAL QTY:</span>{' '}
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {activePO.totalQty ?? activePO.items.reduce((acc, it) => acc + (it.quantity || 0), 0)} Unit
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold mr-2">TOTAL HARGA:</span>
                    <span className="font-mono font-bold text-emerald-700 text-base">
                      {formatRupiah(activePO.totalHarga ?? activePO.items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.harga || 0)), 0))}
                    </span>
                  </div>
                </div>

                {/* Catatan & Pengesahan */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">CATATAN TRANSAKSI:</p>
                    <p className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 italic min-h-[40px]">
                      {activePO.catatan || 'Terima kasih atas transaksi Anda di Toko Vidica Dewata.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center text-xs pt-2 sm:pt-0">
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-8 sm:mb-12">Hormat Kami (Kasir)</p>
                      <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800 text-[11px] sm:text-xs">
                        ( {activePO.admin || 'Kasir'} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-8 sm:mb-12">Customer</p>
                      <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800 text-[11px] sm:text-xs truncate">
                        ( {activePO.customer || activePO.namaSupplier || 'Customer'} )
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print shrink-0">
              <button
                type="button"
                onClick={() => setActivePO(null)}
                className="px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPO}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Printer className="w-4 h-4 text-indigo-600" /> <span className="hidden sm:inline">Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="btn-neon px-3.5 sm:px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Simpan PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Akses Ditolak: Khusus Akun SERVER */}
      {deniedModalAction && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600 shadow-inner">
              <Ban className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 font-display">Akses Khusus Akun SERVER</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Fitur <strong>Hapus Penjualan</strong> hanya bisa dilakukan oleh akun <strong>SERVER / ADMIN</strong>.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-mono">
                Akun aktif saat ini: <span className="font-bold text-slate-800">{currentLoggedAdmin}</span>
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

      {/* Modal Konfirmasi Hapus Penjualan (Khusus SERVER) */}
      {poToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 font-display">Konfirmasi Hapus Penjualan</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus data penjualan berikut?
              </p>
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-left text-xs space-y-1">
                <p className="font-bold text-rose-950 font-mono">ID: {poToDelete.noPO || poToDelete.id}</p>
                <p className="text-slate-800">Customer: <strong>{poToDelete.customer || poToDelete.namaSupplier || '-'}</strong></p>
                <p className="text-slate-600 text-[11px]">Posisi: {poToDelete.posisi} • Admin: {poToDelete.admin}</p>
                <p className="text-emerald-700 font-mono font-bold pt-1">
                  Total: {formatRupiah(poToDelete.totalHarga || poToDelete.items.reduce((acc, it) => acc + (it.quantity * it.harga), 0))}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 font-medium">
                Otorisasi: Akun SERVER ({currentLoggedAdmin})
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeletePO}
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
