export type TipeMutasi = 'MASUK' | 'KELUAR';

export interface Produk {
  id: string;
  sku: string;
  barcode?: string;
  nama: string;
  kategori: string;
  subKategori?: string;
  harga: number;
  satuan: string;
  isiKarton: string | number;
  minStok?: number;
  merk?: string;
  hpp?: number;
  eceran?: number;
  grosir?: number;
  partai?: number;
  qty?: number;
  qtyToko?: number;
  qtyGudang?: number;
  qtyPiranha?: number;
  foto?: string;
}

export interface MutasiStok {
  id: string;
  date: string;
  idProduk: string;
  tipe: TipeMutasi;
  jumlah: number;
  harga: number;
  keterangan: string;
  posisi?: string;
  jenisHarga?: string;
}

export interface TransaksiKeuangan {
  id: string;
  date: string;
  tipe: TipeMutasi;
  nominal: number;
  keterangan: string;
  kategori?: string;
  metodePembayaran?: 'CASH' | 'TRANSFER' | 'KREDIT';
  namaBank?: string;
}

export interface Customer {
  id: string;
  namaCustomer: string;
  alamat?: string;
  pic: string;
  noTelp?: string;
  metodePembayaran?: string;
  keterangan?: string;
}

export interface ItemPengiriman {
  idProduk: string;
  namaProduk: string;
  quantity: number;
  satuan: string;
  harga: number;
}

export interface ItemPO {
  idProduk: string;
  sku?: string;
  namaProduk: string;
  quantity: number | string;
  satuan: string;
  harga: number | string;
  jenisHarga?: 'Eceran' | 'Grosir' | 'Partai' | 'Custom' | string;
}

export interface PurchaseOrder {
  id: string;
  noPO?: string;
  tanggal: string;
  customer?: string;
  namaSupplier?: string;
  noTelpSupplier?: string;
  alamatSupplier?: string;
  posisi?: string;
  admin?: string;
  items: ItemPO[];
  totalQty?: number;
  totalHarga?: number;
  catatan?: string;
  status?: 'DRAFT' | 'DIPESAN' | 'DITERIMA' | 'BATAL';
}

export interface Pengiriman {
  id: string;
  noNota?: string;
  tanggal: string;
  idCustomer?: string;
  namaCustomer: string;
  alamat?: string;
  noTelp?: string;
  pic?: string;
  items: ItemPengiriman[];
  totalHarga?: number;
  catatan?: string;
  status?: 'PROSES' | 'TERKIRIM' | 'BATAL';
  metodePembayaran?: 'CASH' | 'KREDIT';
  autoRecordKeuangan?: boolean;
}

export interface AccountPermission {
  username: string;
  role: string;
  allowedTabs: string[];
  posisi?: string;
}

export interface AppDatabase {
  produk: Produk[];
  stok: MutasiStok[];
  keuangan: TransaksiKeuangan[];
  customer?: Customer[];
  pengiriman?: Pengiriman[];
  purchaseOrder?: PurchaseOrder[];
  customKategori?: string[];
  accounts?: AccountPermission[];
  metodePembayaranList?: string[];
  posisiList?: string[];
}

export type ViewTab = 'dashboard' | 'produk' | 'stok' | 'keuangan' | 'customer' | 'pengiriman' | 'purchase_order' | 'laporan';

export interface GoogleSheetsConfig {
  webAppUrl: string;
  spreadsheetUrl?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

