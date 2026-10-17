import React, { useState, useEffect } from 'react';
import { 
  AppDatabase, 
  ViewTab, 
  Produk, 
  TipeMutasi, 
  GoogleSheetsConfig,
  Customer,
  Pengiriman,
  PurchaseOrder,
  TransaksiKeuangan,
  AccountPermission
} from './types';
import { INITIAL_DATABASE } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProdukView } from './components/ProdukView';
import { StokView } from './components/StokView';
import { KeuanganView } from './components/KeuanganView';
import { CustomerView } from './components/CustomerView';
import { PengirimanView } from './components/PengirimanView';
import { PurchaseOrderView } from './components/PurchaseOrderView';
import { LaporanView } from './components/LaporanView';
import { ModalProduk } from './components/ModalProduk';
import { ModalStok } from './components/ModalStok';
import { ModalKeuangan } from './components/ModalKeuangan';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { fetchCloudDatabase, saveCloudDatabase, subscribeCloudDatabase } from './lib/firestoreSync';
import { 
  syncToWebApp, 
  fetchDatabaseFromSheets,
  TARGET_SPREADSHEET_ID, 
  TARGET_SPREADSHEET_URL, 
  DEFAULT_WEB_APP_URL 
} from './lib/googleSheets';

const LOCAL_STORAGE_KEY = 'vidicaDataFuturistic';
const CONFIG_STORAGE_KEY = 'vidicaSheetsConfig';

export default function App() {
  // Admin Auth State (Sheet ADMIN)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!sessionStorage.getItem('globalMartAdmin');
  });
  const [adminName, setAdminName] = useState<string>(() => {
    return sessionStorage.getItem('globalMartAdmin') || 'Admin';
  });

  const handleAdminLogout = () => {
    sessionStorage.removeItem('globalMartAdmin');
    setIsAdminLoggedIn(false);
    showToast('Berhasil keluar dari akun admin.');
  };

  // Database State
  const [db, setDb] = useState<AppDatabase>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.produk) && parsed.produk.some((p: any) => p.sku === '14502' || p.qtyToko !== undefined)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse local database:', e);
    }
    return INITIAL_DATABASE;
  });

  // Google Sheets Config State
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const url = parsed.webAppUrl && typeof parsed.webAppUrl === 'string' && parsed.webAppUrl.trim().length > 0 && !parsed.webAppUrl.includes('AKfycbxblnwrH1kB2BjAVHcF4qKNpEh4oA9k7lLa_KsNQJQo3iElQLRJMDa6QAKgAraC2nbT')
          ? parsed.webAppUrl
          : DEFAULT_WEB_APP_URL;
        const sheetUrl = parsed.spreadsheetUrl && parsed.spreadsheetUrl.includes('1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ')
          ? parsed.spreadsheetUrl
          : TARGET_SPREADSHEET_URL;
        return {
          ...parsed,
          webAppUrl: url,
          spreadsheetUrl: sheetUrl
        };
      }
    } catch (e) {
      console.error('Failed to parse sheets config:', e);
    }
    return { webAppUrl: DEFAULT_WEB_APP_URL, spreadsheetUrl: TARGET_SPREADSHEET_URL, autoSync: true };
  });

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Control States
  const [isModalProdukOpen, setIsModalProdukOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState<Produk | null>(null);

  const [isModalStokOpen, setIsModalStokOpen] = useState(false);
  const [stokModalTipe, setStokModalTipe] = useState<TipeMutasi>('MASUK');
  const [stokPreselectedProd, setStokPreselectedProd] = useState<Produk | null>(null);

  const [isModalKeuanganOpen, setIsModalKeuanganOpen] = useState(false);
  const [keuanganModalTipe, setKeuanganModalTipe] = useState<TipeMutasi>('MASUK');
  const [keuanganModalInitialData, setKeuanganModalInitialData] = useState<{
    nominal?: number;
    keterangan?: string;
    kategori?: string;
    metodePembayaran?: 'CASH' | 'TRANSFER';
    namaBank?: string;
  } | undefined>(undefined);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cloud Database Sync (Real-time Firestore for computer & mobile cross-device sync)
  useEffect(() => {
    fetchCloudDatabase().then((cloudDb) => {
      if (cloudDb && Array.isArray(cloudDb.produk)) {
        setDb(cloudDb);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudDb));
      }
    });

    const unsubscribe = subscribeCloudDatabase((cloudDb) => {
      setDb(cloudDb);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudDb));
      } catch (e) {
        console.error('Failed to update local storage from cloud:', e);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Auto Refresh data dari Google Spreadsheet saat awal masuk ke aplikasi
  useEffect(() => {
    const autoRefreshFromSheets = async () => {
      try {
        const spreadsheetId = sheetsConfig.spreadsheetUrl || TARGET_SPREADSHEET_ID;
        const res = await fetchDatabaseFromSheets(null, spreadsheetId);
        if (res.success && res.data) {
          setDb(res.data);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data));
          } catch (e) {
            console.error('Failed to update local storage:', e);
          }
          saveCloudDatabase(res.data);
          showToast('Data otomatis diperbarui dari Google Spreadsheet!');
        }
      } catch (err) {
        console.error('Auto refresh spreadsheet error:', err);
      }
    };

    autoRefreshFromSheets();
  }, [sheetsConfig.spreadsheetUrl]);

  // Show Toast Message helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Google Sheets Synchronization
  const syncToSheets = async (targetDb = db) => {
    setIsSyncing(true);
    const targetSpreadsheet = sheetsConfig.spreadsheetUrl || TARGET_SPREADSHEET_URL;

    try {
      if (sheetsConfig.webAppUrl) {
        const webRes = await syncToWebApp(targetDb, sheetsConfig.webAppUrl);
        if (webRes.success) {
          const nowStr = new Date().toISOString();
          setSheetsConfig((prev) => {
            const updated = { ...prev, lastSyncedAt: nowStr };
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
          showToast('BERHASIL! Data telah disinkronkan ke Google Spreadsheet.');
        } else {
          showToast(`Gagal Sinkron: ${webRes.message}`);
        }
      } else {
        showToast('URL Web App Google Apps Script belum dikonfigurasi di Pengaturan.');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast(`Gagal menyinkronkan data: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save to LocalStorage, Cloud & Web App Sync
  const saveDatabase = (newDb: AppDatabase) => {
    setDb(newDb);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newDb));
      saveCloudDatabase(newDb);
    } catch (e) {
      console.error('Failed to save to local storage or cloud:', e);
      saveCloudDatabase(newDb);
    }

    // Web App Endpoint Sync
    const targetWebAppUrl = sheetsConfig.webAppUrl || DEFAULT_WEB_APP_URL;
    if (targetWebAppUrl) {
      syncToWebApp(newDb, targetWebAppUrl);
    }
  };

  const handleRefreshData = async () => {
    showToast('Menarik data terbaru dari Google Spreadsheet...');
    setIsSyncing(true);

    try {
      const spreadsheetId = sheetsConfig.spreadsheetUrl || TARGET_SPREADSHEET_ID;
      const res = await fetchDatabaseFromSheets(null, spreadsheetId);

      if (res.success && res.data) {
        setDb(res.data);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data));
        } catch (e) {
          // ignore
        }
        saveCloudDatabase(res.data);
        showToast('BERHASIL! Data telah ditarik dan diperbarui dari Google Spreadsheet!');
      } else {
        showToast(`Gagal menarik data dari Google Spreadsheet: ${res.message}`);
      }
    } catch (err: any) {
      console.error('Refresh error:', err);
      showToast('Gagal menarik data dari Google Spreadsheet: ' + (err.message || ''));
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Config handler
  const handleSaveConfig = (cfg: GoogleSheetsConfig) => {
    setSheetsConfig(cfg);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    showToast('Pengaturan Google Sheets disimpan.');
  };

  const handleUpdateAccounts = (accounts: AccountPermission[]) => {
    saveDatabase({
      ...db,
      accounts
    });
    showToast('Hak akses akun berhasil diperbarui dan direkap ke Sheet ADMIN!');
  };

  // Reset Data handler
  const handleResetData = () => {
    if (
      window.confirm(
        'PERINGATAN: Apakah Anda yakin ingin menghapus SELUA data dan mengembalikan ke data sampel Toko Vidica Dewata?'
      )
    ) {
      setDb(INITIAL_DATABASE);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DATABASE));
      showToast('Database berhasil di-reset ke data awal.');
    }
  };

  // --- CRUD: PRODUK ---
  const handleSaveProduk = (prodData: Omit<Produk, 'id'> & { id?: string }) => {
    let updatedProducts: Produk[];

    if (prodData.id) {
      // Edit
      updatedProducts = db.produk.map((p) =>
        p.id === prodData.id ? ({ ...p, ...prodData } as Produk) : p
      );
      showToast(`Produk "${prodData.nama}" berhasil diperbarui.`);
    } else {
      // Create
      const newProd: Produk = {
        ...prodData,
        id: `PROD-${Date.now()}`
      };
      updatedProducts = [...db.produk, newProd];
      showToast(`Produk "${prodData.nama}" berhasil ditambahkan.`);
    }

    saveDatabase({
      ...db,
      produk: updatedProducts
    });
  };

  const handleDeleteProduk = (id: string) => {
    const prod = db.produk.find((p) => p.id === id);
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus produk "${prod?.nama || 'ini'}" dari katalog?`
      )
    ) {
      const updated = db.produk.filter((p) => p.id !== id);
      saveDatabase({
        ...db,
        produk: updated
      });
      showToast('Produk berhasil dihapus.');
    }
  };

  // --- CRUD: STOK MUTASI ---
  const handleSaveStok = (data: {
    idProduk: string;
    tipe: TipeMutasi;
    jumlah: number;
    harga: number;
    keterangan: string;
    autoRecordCash: boolean;
    posisi?: string;
    jenisHarga?: string;
  }) => {
    const newMutasi = {
      id: `STK-${Date.now()}`,
      date: new Date().toISOString(),
      idProduk: data.idProduk,
      tipe: data.tipe,
      jumlah: data.jumlah,
      harga: data.harga,
      keterangan: data.keterangan,
      posisi: data.posisi,
      jenisHarga: data.jenisHarga
    };

    let updatedKeuangan = [...db.keuangan];

    if (data.autoRecordCash) {
      const prod = db.produk.find((p) => p.id === data.idProduk);
      const totalNilai = data.jumlah * data.harga;
      const isMasukStok = data.tipe === 'MASUK';

      updatedKeuangan.unshift({
        id: `KEU-AUTO-${Date.now()}`,
        date: new Date().toISOString(),
        tipe: isMasukStok ? 'KELUAR' : 'MASUK', // Buying stock = Cash Out; Selling stock = Cash In
        nominal: totalNilai,
        keterangan: `[AUTO] ${isMasukStok ? 'Pembelian' : 'Penjualan'} Stok: ${
          data.jumlah
        } unit ${prod?.nama || 'Barang'}`,
        kategori: isMasukStok ? 'Pembelian Stok' : 'Penjualan'
      });
    }

    const updatedDb: AppDatabase = {
      ...db,
      stok: [newMutasi, ...db.stok],
      keuangan: updatedKeuangan
    };

    saveDatabase(updatedDb);
    syncToSheets(updatedDb);

    showToast(`Mutasi stok ${data.tipe} (Barang ${data.tipe}) berhasil dicatat & dikirim ke Sheet!`);
  };

  const handleDeleteStok = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus entri mutasi stok ini?')) {
      saveDatabase({
        ...db,
        stok: db.stok.filter((s) => s.id !== id)
      });
      showToast('Entri mutasi stok berhasil dihapus.');
    }
  };

  // --- CRUD: KEUANGAN ---
  const handleSaveKeuangan = (data: {
    tipe: TipeMutasi;
    nominal: number;
    keterangan: string;
    kategori?: string;
    metodePembayaran?: 'CASH' | 'TRANSFER';
    namaBank?: string;
  }) => {
    const newTrans: TransaksiKeuangan = {
      id: `KEU-${Date.now()}`,
      date: new Date().toISOString(),
      tipe: data.tipe,
      nominal: data.nominal,
      keterangan: data.keterangan,
      kategori: data.kategori || (data.tipe === 'MASUK' ? 'Penjualan' : 'Operasional'),
      metodePembayaran: data.metodePembayaran || 'CASH',
      namaBank: data.namaBank
    };

    saveDatabase({
      ...db,
      keuangan: [newTrans, ...db.keuangan]
    });

    const methodDesc = data.metodePembayaran === 'TRANSFER' ? ` (Transfer ${data.namaBank || ''})` : ' (Cash)';
    showToast(`Entri Kas (${data.tipe})${methodDesc} sebesar Rp ${data.nominal.toLocaleString('id-ID')} berhasil dicatat.`);
  };

  const handleDeleteKeuangan = (id: string) => {
    const target = db.keuangan.find((k) => k.id === id);
    if (target) {
      saveDatabase({
        ...db,
        keuangan: db.keuangan.filter((k) => k.id !== id)
      });
      showToast(`Transaksi kas "${target.keterangan}" berhasil dihapus.`);
    }
  };

  // --- CRUD: KATEGORI ---
  const handleDeleteCategory = (categoryName: string) => {
    const updatedCustom = (db.customKategori || []).filter(
      (c) => c.toLowerCase() !== categoryName.toLowerCase()
    );
    saveDatabase({
      ...db,
      customKategori: updatedCustom
    });
    showToast(`Kategori "${categoryName}" berhasil dihapus.`);
  };

  // --- CRUD: CUSTOMER ---
  const handleSaveCustomer = (custData: Omit<Customer, 'id'> & { id?: string }) => {
    const isEdit = Boolean(custData.id);
    const isServerAccount = (adminName || sessionStorage.getItem('globalMartAdmin') || '').toUpperCase().includes('SERVER');
    if (isEdit && !isServerAccount) {
      showToast('Akses Ditolak: Fitur edit customer hanya bisa dilakukan oleh akun SERVER.');
      return;
    }

    const currentList = db.customer || [];
    let updatedList: Customer[];

    if (custData.id) {
      updatedList = currentList.map((c) =>
        c.id === custData.id ? ({ ...c, ...custData } as Customer) : c
      );
      showToast(`Data customer "${custData.namaCustomer}" berhasil diperbarui.`);
    } else {
      const newCust: Customer = {
        ...custData,
        id: `CUST-${Date.now()}`
      };
      updatedList = [newCust, ...currentList];
      showToast(`Customer "${custData.namaCustomer}" berhasil ditambahkan.`);
    }

    saveDatabase({
      ...db,
      customer: updatedList
    });
  };

  const handleDeleteCustomer = (id: string) => {
    const isServerAccount = (adminName || sessionStorage.getItem('globalMartAdmin') || '').toUpperCase().includes('SERVER');
    if (!isServerAccount) {
      showToast('Akses Ditolak: Fitur delete customer hanya bisa dilakukan oleh akun SERVER.');
      return;
    }

    const currentList = db.customer || [];
    const target = currentList.find((c) => c.id === id);
    const updated = currentList.filter((c) => c.id !== id);
    saveDatabase({
      ...db,
      customer: updated
    });
    showToast(`Customer "${target?.namaCustomer || ''}" berhasil dihapus.`);
  };

  // --- CRUD: PENGIRIMAN ---
  const handleSavePengiriman = (
    pengirimanData: Omit<Pengiriman, 'id'> & { id?: string },
    deductStock: boolean = true
  ): Pengiriman => {
    const currentList = db.pengiriman || [];
    const newPengiriman: Pengiriman = {
      ...pengirimanData,
      id: `KRM-${Date.now()}`
    };

    let updatedStok = [...db.stok];

    if (deductStock) {
      pengirimanData.items.forEach((item, index) => {
        if (item.idProduk) {
          const prod = db.produk.find((p) => p.id === item.idProduk);
          updatedStok.unshift({
            id: `STK-KRM-${Date.now()}-${index}`,
            date: new Date().toISOString(),
            idProduk: item.idProduk,
            tipe: 'KELUAR',
            jumlah: item.quantity,
            harga: item.harga || prod?.harga || 0,
            keterangan: `[PENGIRIMAN] Kepada ${pengirimanData.namaCustomer} (${pengirimanData.noNota || 'Nota Baru'})`
          });
        }
      });
    }

    let updatedKeuangan = [...db.keuangan];
    if (pengirimanData.autoRecordKeuangan !== false) {
      const isKredit = pengirimanData.metodePembayaran === 'KREDIT';
      const totalNilai = pengirimanData.totalHarga ?? pengirimanData.items.reduce((acc, it) => acc + (it.quantity * (it.harga || 0)), 0);

      updatedKeuangan.unshift({
        id: `KEU-KRM-${Date.now()}`,
        date: new Date().toISOString(),
        tipe: 'MASUK',
        nominal: totalNilai,
        kategori: isKredit ? 'Piutang' : 'Penjualan',
        metodePembayaran: isKredit ? 'KREDIT' : 'CASH',
        keterangan: `[PENGIRIMAN - ${isKredit ? 'KREDIT/PIUTANG' : 'CASH'}] Kepada ${pengirimanData.namaCustomer} (${pengirimanData.noNota || 'Nota Baru'})`
      });
    }

    saveDatabase({
      ...db,
      pengiriman: [newPengiriman, ...currentList],
      stok: updatedStok,
      keuangan: updatedKeuangan
    });

    const isKreditMsg = pengirimanData.metodePembayaran === 'KREDIT' ? ' (Metode Kredit / Piutang)' : ' (Metode Cash / Tunai)';
    showToast(`Nota pengiriman untuk "${pengirimanData.namaCustomer}" berhasil dibuat${isKreditMsg}.`);
    return newPengiriman;
  };

  const handleUpdateMetodePembayaranPengiriman = (id: string, newMetode: 'CASH' | 'KREDIT') => {
    const currentList = db.pengiriman || [];
    const target = currentList.find((p) => p.id === id);
    if (!target) return;

    const updatedList = currentList.map((p) =>
      p.id === id ? { ...p, metodePembayaran: newMetode } : p
    );

    const isKredit = newMetode === 'KREDIT';
    const totalNilai = target.totalHarga ?? target.items.reduce((acc, it) => acc + (it.quantity * (it.harga || 0)), 0);

    const updatedKeuangan = [{
      id: `KEU-UPDATE-${Date.now()}`,
      date: new Date().toISOString(),
      tipe: 'MASUK' as const,
      nominal: totalNilai,
      kategori: isKredit ? 'Piutang' : 'Penjualan',
      metodePembayaran: newMetode,
      keterangan: `[UPDATE METODE - ${isKredit ? 'KREDIT/PIUTANG' : 'CASH'}] Nota ${target.noNota || target.id} - Customer ${target.namaCustomer}`
    }, ...db.keuangan];

    saveDatabase({
      ...db,
      pengiriman: updatedList,
      keuangan: updatedKeuangan
    });

    showToast(`Metode pembayaran nota ${target.noNota || target.id} diubah ke ${newMetode === 'KREDIT' ? 'KREDIT (Piutang)' : 'CASH (Tunai)'} & dihubungkan ke Kas.`);
  };

  const handleDeletePengiriman = (id: string) => {
    const currentList = db.pengiriman || [];
    const updated = currentList.filter((p) => p.id !== id);
    saveDatabase({
      ...db,
      pengiriman: updated
    });
    showToast('Surat pengiriman berhasil dihapus.');
  };

  const handleUpdateStatusPengiriman = (id: string, newStatus: 'PROSES' | 'TERKIRIM' | 'BATAL') => {
    const currentList = db.pengiriman || [];
    const updated = currentList.map((p) =>
      p.id === id ? { ...p, status: newStatus } : p
    );
    saveDatabase({
      ...db,
      pengiriman: updated
    });
    showToast(`Status pengiriman diubah menjadi ${newStatus}.`);
  };

  // --- CRUD: PURCHASE ORDER ---
  const handleSavePurchaseOrder = (
    poData: Omit<PurchaseOrder, 'id'> & { id?: string },
    recordStock: boolean = true
  ): PurchaseOrder => {
    const currentList = db.purchaseOrder || [];
    const newPO: PurchaseOrder = {
      ...poData,
      id: poData.id || `PJ-${Date.now()}`
    };

    let updatedStok = [...db.stok];
    let updatedProducts = [...db.produk];

    if (recordStock) {
      poData.items.forEach((item, index) => {
        const targetProdIndex = updatedProducts.findIndex(
          (p) => p.id === item.idProduk || p.sku === item.sku || (item.namaProduk && p.nama === item.namaProduk)
        );

        if (targetProdIndex >= 0) {
          const prod = { ...updatedProducts[targetProdIndex] };
          const soldQty = Number(item.quantity) || 0;
          const posUpper = (poData.posisi || 'TOKO').toUpperCase().trim();

          if (posUpper.includes('GUDANG')) {
            prod.qtyGudang = Math.max(0, (prod.qtyGudang ?? 0) - soldQty);
          } else if (posUpper.includes('PIRANHA')) {
            prod.qtyPiranha = Math.max(0, (prod.qtyPiranha ?? 0) - soldQty);
          } else {
            prod.qtyToko = Math.max(0, (prod.qtyToko ?? 0) - soldQty);
          }

          prod.qty = (prod.qtyToko ?? 0) + (prod.qtyGudang ?? 0) + (prod.qtyPiranha ?? 0);
          updatedProducts[targetProdIndex] = prod;
        }

        if (item.idProduk || item.sku) {
          const prod = db.produk.find((p) => p.id === item.idProduk || p.sku === item.sku);
          const party = poData.customer || poData.namaSupplier || 'Customer';
          updatedStok.unshift({
            id: `STK-PJ-${Date.now()}-${index}`,
            date: new Date().toISOString(),
            idProduk: prod?.id || item.idProduk || item.sku || `PROD-${index}`,
            tipe: 'KELUAR',
            jumlah: item.quantity,
            harga: item.harga || prod?.harga || 0,
            posisi: poData.posisi || 'TOKO',
            jenisHarga: item.jenisHarga || 'Eceran',
            keterangan: `[PENJUALAN] ${party} (${poData.noPO || 'Penjualan'})`
          });
        }
      });
    }

    const updatedDb: AppDatabase = {
      ...db,
      produk: updatedProducts,
      purchaseOrder: poData.id ? currentList.map(p => p.id === poData.id ? newPO : p) : [newPO, ...currentList],
      stok: updatedStok
    };

    saveDatabase(updatedDb);
    syncToSheets(updatedDb);

    const party = poData.customer || poData.namaSupplier || 'Customer';
    showToast(`Penjualan "${poData.noPO || 'PJ'}" untuk "${party}" berhasil disimpan & dikirim ke Sheet PENJUALAN!`);
    return newPO;
  };

  const handleDeletePurchaseOrder = (id: string) => {
    const isServerAccount = (adminName || sessionStorage.getItem('globalMartAdmin') || '').toUpperCase().includes('SERVER');
    if (!isServerAccount) {
      showToast('Akses Ditolak: Fitur delete Penjualan hanya bisa dilakukan oleh akun SERVER.');
      return;
    }
    const currentList = db.purchaseOrder || [];
    const updated = currentList.filter((p) => p.id !== id);
    const updatedDb: AppDatabase = {
      ...db,
      purchaseOrder: updated
    };
    saveDatabase(updatedDb);
    syncToSheets(updatedDb);
    showToast('Dokumen Penjualan berhasil dihapus & dikirim ke Sheet.');
  };

  const handleUpdateStatusPO = (id: string, newStatus: 'DRAFT' | 'DIPESAN' | 'DITERIMA' | 'BATAL') => {
    const currentList = db.purchaseOrder || [];
    const updated = currentList.map((p) =>
      p.id === id ? { ...p, status: newStatus } : p
    );
    const updatedDb: AppDatabase = {
      ...db,
      purchaseOrder: updated
    };
    saveDatabase(updatedDb);
    syncToSheets(updatedDb);
    showToast(`Status Penjualan diubah menjadi ${newStatus} & dikirim ke Sheet.`);
  };


  // Quick Stock Helper
  const handleQuickStok = (p: Produk, tipe: TipeMutasi) => {
    setStokPreselectedProd(p);
    setStokModalTipe(tipe);
    setIsModalStokOpen(true);
  };

  if (!isAdminLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={(name) => {
          setIsAdminLoggedIn(true);
          setAdminName(name);
          sessionStorage.setItem('globalMartAdmin', name);
          showToast(`Login berhasil! Selamat datang, ${name}`);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050b14]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 glass-panel border-sky-500/40 text-sky-400 text-xs font-semibold px-4 py-3 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobileSidebar}
        setIsOpenMobile={setIsOpenMobileSidebar}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={{ displayName: adminName, email: 'admin@globalmart' } as any}
        onLogoutGoogle={handleAdminLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setIsOpenMobileSidebar(!isOpenMobileSidebar)}
          sheetsConfig={sheetsConfig}
          user={{ displayName: adminName, email: 'admin@globalmart' } as any}
          onSync={() => syncToSheets()}
          isSyncing={isSyncing}
          onReset={handleResetData}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLoginGoogle={() => {}}
          onLogoutGoogle={handleAdminLogout}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 hide-scroll">
          {activeTab === 'dashboard' && (
            <DashboardView
              db={db}
              onNavigate={setActiveTab}
              onOpenModalStok={(tipe) => {
                setStokPreselectedProd(null);
                setStokModalTipe(tipe);
                setIsModalStokOpen(true);
              }}
              onOpenModalKeuangan={(tipe) => {
                setKeuanganModalTipe(tipe);
                setIsModalKeuanganOpen(true);
              }}
              onOpenModalProduk={() => {
                setEditingProduk(null);
                setIsModalProdukOpen(true);
              }}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'produk' && (
            <ProdukView
              db={db}
              onOpenAddModal={() => {
                setEditingProduk(null);
                setIsModalProdukOpen(true);
              }}
              onOpenEditModal={(p) => {
                setEditingProduk(p);
                setIsModalProdukOpen(true);
              }}
              onDeleteProduk={handleDeleteProduk}
              onQuickStok={handleQuickStok}
            />
          )}

          {activeTab === 'stok' && (
            <StokView
              db={db}
              onOpenModalStok={(tipe) => {
                setStokPreselectedProd(null);
                setStokModalTipe(tipe);
                setIsModalStokOpen(true);
              }}
              onDeleteStok={handleDeleteStok}
            />
          )}

          {activeTab === 'keuangan' && (
            <KeuanganView
              db={db}
              onOpenModalKeuangan={(tipe, initialData) => {
                setKeuanganModalTipe(tipe);
                setKeuanganModalInitialData(initialData);
                setIsModalKeuanganOpen(true);
              }}
              onDeleteKeuangan={handleDeleteKeuangan}
            />
          )}

          {activeTab === 'customer' && (
            <CustomerView
              customers={db.customer || []}
              metodePembayaranList={db.metodePembayaranList || []}
              accounts={db.accounts || []}
              adminName={adminName}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'pengiriman' && (
            <PengirimanView
              pengirimanList={db.pengiriman || []}
              customers={db.customer || []}
              produkList={db.produk}
              onSavePengiriman={handleSavePengiriman}
              onDeletePengiriman={handleDeletePengiriman}
              onUpdateStatus={handleUpdateStatusPengiriman}
              onUpdateMetodePembayaran={handleUpdateMetodePembayaranPengiriman}
            />
          )}

          {activeTab === 'purchase_order' && (
            <PurchaseOrderView
              poList={db.purchaseOrder || []}
              produkList={db.produk}
              stokLogs={db.stok || []}
              customers={db.customer || []}
              posisiList={['TOKO', 'GUDANG', 'PIRANHA']}
              accounts={db.accounts || []}
              adminName={adminName}
              onSavePO={handleSavePurchaseOrder}
              onDeletePO={handleDeletePurchaseOrder}
              onUpdateStatus={handleUpdateStatusPO}
            />
          )}

          {activeTab === 'laporan' && (
            <LaporanView
              db={db}
              sheetsConfig={sheetsConfig}
              onSync={() => syncToSheets()}
              isSyncing={isSyncing}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onImportJson={(newDb) => {
                saveDatabase(newDb);
                showToast('Import database JSON berhasil.');
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ModalProduk
        isOpen={isModalProdukOpen}
        onClose={() => setIsModalProdukOpen(false)}
        onSave={handleSaveProduk}
        initialData={editingProduk}
        existingCategories={[...(db.customKategori || []), ...db.produk.map((p) => p.kategori)].filter(c => c && !['makanan', 'minuman', 'rokok', 'sembako'].includes(c.toLowerCase()))}
        onDeleteCategory={handleDeleteCategory}
      />


      <ModalStok
        isOpen={isModalStokOpen}
        onClose={() => setIsModalStokOpen(false)}
        onSave={handleSaveStok}
        tipe={stokModalTipe}
        produkList={db.produk}
        preselectedProduct={stokPreselectedProd}
      />

      <ModalKeuangan
        isOpen={isModalKeuanganOpen}
        onClose={() => {
          setIsModalKeuanganOpen(false);
          setKeuanganModalInitialData(undefined);
        }}
        onSave={handleSaveKeuangan}
        tipe={keuanganModalTipe}
        initialData={keuanganModalInitialData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={sheetsConfig}
        db={db}
        adminName={adminName}
        onSaveConfig={handleSaveConfig}
        onUpdateAccounts={handleUpdateAccounts}
        onSyncNow={() => syncToSheets()}
        isSyncing={isSyncing}
      />
    </div>
  );
}
