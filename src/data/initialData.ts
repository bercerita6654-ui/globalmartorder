import { AppDatabase } from '../types';

export const INITIAL_DATABASE: AppDatabase = {
  produk: [
    {
      id: 'PROD-14502',
      sku: '14502',
      barcode: '',
      nama: 'ISI STAPLES V-TRO CAP BADAK NO. 10',
      kategori: 'STAPLES',
      subKategori: '',
      merk: 'V-TRO',
      satuan: 'PCS',
      harga: 1300,
      isiKarton: 1,
      minStok: 100,
      hpp: 845,
      eceran: 1300,
      grosir: 925,
      partai: 910,
      qty: 574266,
      qtyToko: 13579,
      qtyGudang: 310687,
      qtyPiranha: 250000,
      foto: 'https://lh3.googleusercontent.com/d/1NxLEhhy4h1zchFjJY4dEx_ISaJZ3271M'
    },
    {
      id: 'PROD-06723',
      sku: '06723',
      barcode: '',
      nama: 'TELESTRUK 1 PLY 75*60 GRACIA',
      kategori: 'KERTAS',
      subKategori: '',
      merk: 'GRACIA',
      satuan: 'ROLL',
      harga: 4000,
      isiKarton: 1,
      minStok: 20,
      hpp: 2700,
      eceran: 4000,
      grosir: 3300,
      partai: 3200,
      qty: 0,
      qtyToko: 0,
      qtyGudang: 0,
      qtyPiranha: 0
    },
    {
      id: 'PROD-06724',
      sku: '06724',
      barcode: '',
      nama: 'TELESTRUK 2 PLY 75*60 GRACIA',
      kategori: 'KERTAS',
      subKategori: '',
      merk: 'GRACIA',
      satuan: 'ROLL',
      harga: 5500,
      isiKarton: 1,
      minStok: 20,
      hpp: 3850,
      eceran: 5500,
      grosir: 4600,
      partai: 4400,
      qty: 0,
      qtyToko: 0,
      qtyGudang: 0,
      qtyPiranha: 0
    },
    {
      id: 'PROD-01981',
      sku: '01981',
      barcode: '',
      nama: 'TELESTRUK 3 PLY 75*60 GRACIA',
      kategori: 'KERTAS',
      subKategori: '',
      merk: 'GRACIA',
      satuan: 'ROLL',
      harga: 5600,
      isiKarton: 1,
      minStok: 20,
      hpp: 3950,
      eceran: 5600,
      grosir: 4950,
      partai: 4700,
      qty: 0,
      qtyToko: 0,
      qtyGudang: 0,
      qtyPiranha: 0
    }
  ],
  stok: [
    {
      id: 'STK-INIT-TOKO-14502',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      idProduk: 'PROD-14502',
      tipe: 'MASUK',
      jumlah: 13579,
      harga: 845,
      posisi: 'TOKO',
      keterangan: '[INITIAL] Stok awal TOKO dari Google Sheet STOCK LIST (1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ)'
    },
    {
      id: 'STK-INIT-GUDANG-14502',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      idProduk: 'PROD-14502',
      tipe: 'MASUK',
      jumlah: 310687,
      harga: 845,
      posisi: 'GUDANG',
      keterangan: '[INITIAL] Stok awal GUDANG dari Google Sheet STOCK LIST (1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ)'
    },
    {
      id: 'STK-INIT-PIRANHA-14502',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      idProduk: 'PROD-14502',
      tipe: 'MASUK',
      jumlah: 250000,
      harga: 845,
      posisi: 'PIRANHA',
      keterangan: '[INITIAL] Stok awal PIRANHA dari Google Sheet STOCK LIST (1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ)'
    }
  ],
  keuangan: [
    {
      id: 'KEU-001',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      tipe: 'MASUK',
      nominal: 10000000,
      keterangan: 'Modal Awal Kas Toko Vidica Dewata',
      kategori: 'Modal'
    },
    {
      id: 'KEU-002',
      date: new Date(Date.now() - 6 * 86400000).toISOString(),
      tipe: 'KELUAR',
      nominal: 1920000,
      keterangan: 'Pembelian Stok Teh Botol Sosro (20 Dus)',
      kategori: 'Pembelian Stok'
    },
    {
      id: 'KEU-003',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      tipe: 'KELUAR',
      nominal: 3920000,
      keterangan: 'Pembelian Stok Indomie Goreng (35 Karton)',
      kategori: 'Pembelian Stok'
    },
    {
      id: 'KEU-004',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      tipe: 'MASUK',
      nominal: 540000,
      keterangan: 'Hasil Penjualan Harian Toko',
      kategori: 'Penjualan'
    },
    {
      id: 'KEU-005',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      tipe: 'KELUAR',
      nominal: 420000,
      keterangan: 'Pembelian Minyak Goreng Bimoli',
      kategori: 'Pembelian Stok'
    },
    {
      id: 'KEU-006',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      tipe: 'MASUK',
      nominal: 1250000,
      keterangan: 'Penjualan Sembako & Minuman',
      kategori: 'Penjualan'
    },
    {
      id: 'KEU-007',
      date: new Date().toISOString(),
      tipe: 'MASUK',
      nominal: 980000,
      keterangan: 'Penjualan Kasir Hari Ini',
      kategori: 'Penjualan'
    }
  ],
  customer: [
    {
      id: 'CUST-001',
      namaCustomer: 'Toko Berkah Utama',
      alamat: 'Jl. Raya Denpasar No. 45, Denpasar Barat',
      pic: 'Pak Made',
      noTelp: '081234567890'
    },
    {
      id: 'CUST-002',
      namaCustomer: 'Warung Bu Sri',
      alamat: 'Jl. Sunset Road No. 88, Kuta',
      pic: 'Ibu Sri',
      noTelp: '081987654321'
    }
  ],
  pengiriman: [
    {
      id: 'KRM-001',
      noNota: 'NOTA-0001',
      tanggal: new Date().toISOString().split('T')[0],
      idCustomer: 'CUST-001',
      namaCustomer: 'Toko Berkah Utama',
      alamat: 'Jl. Raya Denpasar No. 45, Denpasar Barat',
      noTelp: '081234567890',
      pic: 'Pak Made',
      items: [
        {
          idProduk: 'PROD-101',
          namaProduk: 'Teh Botol Sosro 450ml',
          quantity: 2,
          satuan: 'Karton',
          harga: 145000
        },
        {
          idProduk: 'PROD-102',
          namaProduk: 'Indomie Goreng Original 85g',
          quantity: 5,
          satuan: 'Karton',
          harga: 112000
        }
      ],
      totalHarga: 850000,
      catatan: 'Kirim sebelum jam 3 sore',
      status: 'PROSES'
    }
  ],
  purchaseOrder: [
    {
      id: 'PO-001',
      noPO: 'PO-0001',
      tanggal: new Date().toISOString().split('T')[0],
      namaSupplier: 'PT. Sumber Makmur Utama',
      noTelpSupplier: '0812-9876-5432',
      alamatSupplier: 'Jl. Cargo Permai No. 12, Denpasar',
      items: [
        {
          idProduk: 'PROD-101',
          namaProduk: 'Teh Botol Sosro 450ml',
          quantity: 10,
          satuan: 'Karton',
          harga: 140000
        },
        {
          idProduk: 'PROD-105',
          namaProduk: 'Air Mineral Aqua 600ml',
          quantity: 15,
          satuan: 'Karton',
          harga: 80000
        }
      ],
      totalHarga: 2600000,
      catatan: 'Mohon dikirim beserta faktur pajak asli.',
      status: 'DIPESAN'
    }
  ],
  customKategori: ['Makanan', 'Minuman', 'Rokok', 'Sembako', 'Elektronik', 'Lainnya']
};

