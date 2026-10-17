import { AppDatabase, Produk, MutasiStok, TransaksiKeuangan, Customer, Pengiriman, ItemPengiriman, PurchaseOrder, ItemPO, AccountPermission, TipeMutasi } from '../types';

export const TARGET_SPREADSHEET_ID = '1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ';
export const TARGET_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${TARGET_SPREADSHEET_ID}/edit?gid=0#gid=0`;
export const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxgMOXNNpiZUwTUPWRK-hxHt8fdbYZDoDT2heRTVopfeAIqGoSMnkKcplDWaeq9X7w-/exec';

const parseNum = (val: any, fallback = 0): number => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  let cleaned = str.replace(/[Rp\s]/gi, '');
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  const parsed = parseFloat(cleaned.replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};

export async function syncToWebApp(db: AppDatabase, webAppUrl = DEFAULT_WEB_APP_URL): Promise<{ success: boolean; message: string }> {
  try {
    const url = webAppUrl.trim() || DEFAULT_WEB_APP_URL;
    const stokList = db.stok || [];
    const payload = {
      ...db,
      penjualan: db.purchaseOrder || [],
      purchaseOrder: db.purchaseOrder || [],
      stok: stokList,
      barangMasuk: stokList.filter((s) => String(s.tipe || '').toUpperCase() === 'MASUK'),
      barangKeluar: stokList.filter((s) => String(s.tipe || '').toUpperCase() === 'KELUAR'),
      produk: db.produk || [],
      customer: db.customer || []
    };
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    return {
      success: true,
      message: 'Data berhasil dikirim ke Google Apps Script Web App!'
    };
  } catch (err: any) {
    console.error('Web App sync error:', err);
    return {
      success: false,
      message: err.message || 'Gagal mengirim data ke Apps Script Web App.'
    };
  }
}

export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return TARGET_SPREADSHEET_ID;
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }
  return TARGET_SPREADSHEET_ID;
}

const formatDate = (isoStr?: string) => {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString('id-ID');
  } catch (e) {
    return isoStr;
  }
};

export async function syncDatabaseDirectToSheets(
  db: AppDatabase,
  accessToken: string,
  spreadsheetId = TARGET_SPREADSHEET_ID
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanId = extractSpreadsheetId(spreadsheetId);

    // 1. Check existing sheets
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties.title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getRes.ok) {
      const errJson = await getRes.json().catch(() => ({}));
      if (getRes.status === 401) {
        throw new Error('Sesi login Google telah kadaluarsa. Silakan login kembali.');
      }
      if (getRes.status === 403) {
        throw new Error('Izin ditolak. Pastikan akun Google Anda memiliki akses edit ke spreadsheet ini.');
      }
      if (getRes.status === 404) {
        throw new Error('Spreadsheet tidak ditemukan. Periksa kembali ID atau URL spreadsheet.');
      }
      throw new Error(errJson.error?.message || `Gagal mengakses Google Sheets (Status ${getRes.status}).`);
    }

    const spreadsheetInfo = await getRes.json();
    const existingTitles: string[] = (spreadsheetInfo.sheets || []).map(
      (s: any) => s.properties?.title
    );

    const requiredSheets = [
      'Katalog Produk',
      'Mutasi Stok',
      'Buku Kas Keuangan',
      'Daftar Customer',
      'Data Pengiriman',
      'Purchase Order',
      'PENJUALAN',
      'Ringkasan Dashboard'
    ];

    // 2. Add missing sheets if needed
    const addSheetRequests = requiredSheets
      .filter((title) => !existingTitles.includes(title))
      .map((title) => ({
        addSheet: {
          properties: { title }
        }
      }));

    if (addSheetRequests.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: addSheetRequests })
        }
      );
    }

    // 3. Clear existing values across all 4 sheets
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ranges: requiredSheets.map((title) => `'${title}'!A1:Z10000`)
        })
      }
    );

    // 4. Prepare data for sheets
    // Katalog Produk
    const rowsProduk = [
      ['ID Produk', 'SKU', 'Nama Produk', 'Kategori', 'Harga Dasar (Rp)', 'Satuan', 'Isi per Kemasan', 'Min. Stok'],
      ...db.produk.map((p) => [
        p.id,
        p.sku,
        p.nama,
        p.kategori,
        p.harga,
        p.satuan,
        p.isiKarton,
        p.minStok || 0
      ])
    ];

    // Mutasi Stok
    const prodMap = new Map(db.produk.map((p) => [p.id, p.nama]));
    const rowsStok = [
      ['ID Mutasi', 'Waktu', 'ID Produk', 'Nama Produk', 'Tipe', 'Jumlah Unit', 'Harga Satuan (Rp)', 'Total Nilai (Rp)', 'Keterangan'],
      ...db.stok.map((s) => [
        s.id,
        formatDate(s.date),
        s.idProduk,
        prodMap.get(s.idProduk) || s.idProduk,
        s.tipe,
        s.jumlah,
        s.harga,
        s.harga * s.jumlah,
        s.keterangan || ''
      ])
    ];

    // Buku Kas Keuangan
    const rowsKeuangan = [
      ['ID Transaksi', 'Waktu', 'Tipe', 'Kategori', 'Keterangan', 'Pemasukan / Debit (Rp)', 'Pengeluaran / Kredit (Rp)'],
      ...db.keuangan.map((k) => [
        k.id,
        formatDate(k.date),
        k.tipe,
        k.kategori || '-',
        k.keterangan,
        k.tipe === 'MASUK' ? k.nominal : 0,
        k.tipe === 'KELUAR' ? k.nominal : 0
      ])
    ];

    // Daftar Customer
    const rowsCustomer = [
      ['ID Customer', 'Nama Customer', 'Alamat', 'PIC / Kontak', 'No. Telepon'],
      ...(db.customer || []).map((c) => [
        c.id,
        c.namaCustomer,
        c.alamat,
        c.pic,
        c.noTelp
      ])
    ];

    // Data Pengiriman
    const rowsPengiriman = [
      ['ID Pengiriman', 'No Nota', 'Tanggal', 'Nama Customer', 'Metode Bayar', 'Item & Qty', 'Total Nilai (Rp)', 'Status', 'Catatan'],
      ...(db.pengiriman || []).map((p) => [
        p.id,
        p.noNota || '-',
        formatDate(p.tanggal),
        p.namaCustomer,
        p.metodePembayaran === 'KREDIT' ? 'KREDIT' : 'CASH',
        (p.items || []).map((i) => `${i.namaProduk} (${i.quantity} ${i.satuan})`).join('; '),
        p.totalHarga || (p.items || []).reduce((acc, i) => acc + (i.harga * i.quantity), 0),
        p.status || 'PROSES',
        p.catatan || ''
      ])
    ];

    // Purchase Order
    const rowsPO = [
      ['ID PO', 'No PO', 'Tanggal', 'Nama Supplier', 'Item & Qty', 'Status', 'Catatan'],
      ...(db.purchaseOrder || []).map((p) => [
        p.id,
        p.noPO || '-',
        formatDate(p.tanggal),
        p.namaSupplier,
        (p.items || []).map((i) => `${i.namaProduk} (${i.quantity} ${i.satuan})`).join('; '),
        p.status || 'DIPESAN',
        p.catatan || ''
      ])
    ];

    // Sheet PENJUALAN (Kolom: ID, CUSTOMER, POSISI, ADMIN, HARI/TANGGAL, SKU, NAMA PRODUK, QTY, HARGA, JENIS HARGA, TOTAL QTY, TOTAL HARGA)
    const rowsPenjualan = [
      ['ID', 'CUSTOMER', 'POSISI', 'ADMIN', 'HARI/TANGGAL', 'SKU', 'NAMA PRODUK', 'QTY', 'HARGA', 'JENIS HARGA', 'TOTAL QTY', 'TOTAL HARGA'],
      ...(db.purchaseOrder || []).flatMap((p) => {
        const totalQty = p.totalQty ?? (p.items || []).reduce((acc: number, it) => acc + (Number(it.quantity) || 0), 0);
        const totalHarga = p.totalHarga ?? (p.items || []).reduce((acc: number, it) => acc + ((Number(it.quantity) || 0) * (Number(it.harga) || 0)), 0);
        const dateStr = formatDate(p.tanggal);

        if (!p.items || p.items.length === 0) {
          return [[
            p.noPO || p.id,
            p.customer || p.namaSupplier || '-',
            p.posisi || 'TOKO',
            p.admin || 'Admin',
            dateStr,
            '-',
            '-',
            0,
            0,
            '-',
            totalQty,
            totalHarga
          ]];
        }

        return p.items.map((it) => [
          p.noPO || p.id,
          p.customer || p.namaSupplier || '-',
          p.posisi || 'TOKO',
          p.admin || 'Admin',
          dateStr,
          it.sku || '-',
          it.namaProduk || '-',
          it.quantity || 0,
          it.harga || 0,
          it.jenisHarga || 'Eceran',
          totalQty,
          totalHarga
        ]);
      })
    ];

    // Ringkasan Dashboard
    const totalPemasukan = db.keuangan
      .filter((k) => k.tipe === 'MASUK')
      .reduce((a, b) => a + (b.nominal || 0), 0);
    const totalPengeluaran = db.keuangan
      .filter((k) => k.tipe === 'KELUAR')
      .reduce((a, b) => a + (b.nominal || 0), 0);
    const saldoNet = totalPemasukan - totalPengeluaran;

    const rowsSummary = [
      ['INDIKATOR REKAPITULASI', 'NILAI / JUMLAH'],
      ['Waktu Terakhir Rekap', new Date().toLocaleString('id-ID')],
      ['Total Jenis Produk', db.produk.length],
      ['Total Log Mutasi Stok', db.stok.length],
      ['Total Transaksi Kas', db.keuangan.length],
      ['Total Pelanggan Registered', (db.customer || []).length],
      ['Total Surat Pengiriman', (db.pengiriman || []).length],
      ['Total Purchase Order / Penjualan', (db.purchaseOrder || []).length],
      ['Total Akumulasi Pemasukan (Rp)', totalPemasukan],
      ['Total Akumulasi Pengeluaran (Rp)', totalPengeluaran],
      ['Saldo Bersih Kas (Rp)', saldoNet]
    ];

    // 5. Batch update all ranges
    const batchUpdateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            { range: "'Katalog Produk'!A1", values: rowsProduk },
            { range: "'Mutasi Stok'!A1", values: rowsStok },
            { range: "'Buku Kas Keuangan'!A1", values: rowsKeuangan },
            { range: "'Daftar Customer'!A1", values: rowsCustomer },
            { range: "'Data Pengiriman'!A1", values: rowsPengiriman },
            { range: "'Purchase Order'!A1", values: rowsPO },
            { range: "'PENJUALAN'!A1", values: rowsPenjualan },
            { range: "'Ringkasan Dashboard'!A1", values: rowsSummary }
          ]
        })
      }
    );

    if (!batchUpdateRes.ok) {
      const errData = await batchUpdateRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Gagal menulis data ke Google Sheets.');
    }

    // Sync Mutasi Stok to 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ ('Mutasi & Stock')
    try {
      const mutasiMetaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}?fields=sheets.properties.title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (mutasiMetaRes.ok) {
        const mutasiInfo = await mutasiMetaRes.json();
        const mutasiTitles = (mutasiInfo.sheets || []).map((s: any) => s.properties?.title);
        if (!mutasiTitles.includes('Mutasi & Stock')) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: 'Mutasi & Stock' } } }]
              })
            }
          );
        }

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'Mutasi & Stock'!A1:Z10000:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'Mutasi & Stock'!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: "'Mutasi & Stock'!A1",
              majorDimension: 'ROWS',
              values: rowsStok
            })
          }
        );

        // Also sync CUSTOMER sheet to MUTASI_STOCK_SPREADSHEET_ID ('CUSTOMER')
        if (!mutasiTitles.includes('CUSTOMER')) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: 'CUSTOMER' } } }]
              })
            }
          );
        }

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'CUSTOMER'!A1:Z10000:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const rowsCustomerExport = [
          ['DATA CUSTOMER', 'PIC', 'METODE PEMBAYARAN', 'KETERANGAN'],
          ...(db.customer || []).map((c) => [
            c.namaCustomer,
            c.pic || '',
            c.metodePembayaran || '',
            c.keterangan || ''
          ])
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'CUSTOMER'!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: "'CUSTOMER'!A1",
              majorDimension: 'ROWS',
              values: rowsCustomerExport
            })
          }
        );

        // Also sync ADMIN sheet to MUTASI_STOCK_SPREADSHEET_ID ('ADMIN')
        if (!mutasiTitles.includes('ADMIN')) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: 'ADMIN' } } }]
              })
            }
          );
        }

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'ADMIN'!A1:Z10000:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const rowsAdminExport = [
          ['USERNAME', 'ROLE', 'AKSES'],
          ...(db.accounts || []).map((a) => [
            a.username,
            a.role,
            a.allowedTabs.join(', ')
          ])
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'ADMIN'!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: "'ADMIN'!A1",
              majorDimension: 'ROWS',
              values: rowsAdminExport
            })
          }
        );

        // Also sync PENJUALAN sheet to MUTASI_STOCK_SPREADSHEET_ID ('PENJUALAN')
        if (!mutasiTitles.includes('PENJUALAN')) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: 'PENJUALAN' } } }]
              })
            }
          );
        }

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'PENJUALAN'!A1:Z10000:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/'PENJUALAN'!A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: "'PENJUALAN'!A1",
              majorDimension: 'ROWS',
              values: rowsPenjualan
            })
          }
        );
      }
    } catch (err) {
      console.warn('Failed to sync Mutasi & Stock / Customer to dedicated spreadsheet:', err);
    }

    return {
      success: true,
      message: 'Database berhasil direkap langsung ke Google Spreadsheet!'
    };
  } catch (err: any) {
    console.error('Direct Google Sheets sync error:', err);
    return {
      success: false,
      message: err.message || 'Gagal menyinkronkan data ke Google Sheets.'
    };
  }
}

export const CATALOG_SPREADSHEET_ID = '1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ';
export const MUTASI_STOCK_SPREADSHEET_ID = '1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ';

export async function fetchSheetCsv(spreadsheetId: string, sheetName: string): Promise<any[][]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return parseCsvText(text);
  } catch (err) {
    console.error(`Error fetching CSV for ${spreadsheetId} / ${sheetName}:`, err);
    return [];
  }
}

function parseCsvText(text: string): any[][] {
  const lines = text.split(/\r?\n/);
  const result: any[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.replace(/^"|"$/g, '').trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    row.push(currentVal.replace(/^"|"$/g, '').trim());
    result.push(row);
  }
  return result;
}

export async function fetchDatabaseFromSheets(
  accessToken: string | null = null,
  spreadsheetId = TARGET_SPREADSHEET_ID
): Promise<{ success: boolean; data?: AppDatabase; message?: string }> {
  try {
    const cleanId = extractSpreadsheetId(spreadsheetId);

    // 1. Fetch Katalog Produk (STOCK LIST dari 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ)
    let produkRows: any[][] = [];
    let stockListHeaders: string[] = [];
    if (accessToken) {
      try {
        const catalogRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${CATALOG_SPREADSHEET_ID}/values/${encodeURIComponent("'STOCK LIST'!A1:Z5000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (catalogRes.ok) {
          const catJson = await catalogRes.json();
          const allVals = catJson.values || [];
          if (allVals.length > 1) {
            stockListHeaders = (allVals[0] || []).map((h: any) => String(h || '').trim().toUpperCase());
            produkRows = allVals.slice(1);
          } else {
            produkRows = allVals;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    if (produkRows.length === 0) {
      const csvRows = await fetchSheetCsv(CATALOG_SPREADSHEET_ID, 'STOCK LIST');
      if (csvRows.length > 1) {
        stockListHeaders = (csvRows[0] || []).map((h: any) => String(h || '').trim().toUpperCase());
        produkRows = csvRows.slice(1);
      } else {
        produkRows = csvRows;
      }
    }

    // 2. Fetch Mutasi & Stock (Mutasi & Stock)
    let stokRows: any[][] = [];
    if (accessToken) {
      try {
        const mutasiFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'Mutasi & Stock'!A2:I1000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (mutasiFetchRes.ok) {
          const mutasiJson = await mutasiFetchRes.json();
          stokRows = mutasiJson.values || [];
        }
      } catch (e) {
        // ignore
      }
    }
    if (stokRows.length === 0) {
      const csvMutasi = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'Mutasi & Stock');
      stokRows = csvMutasi.length > 1 ? csvMutasi.slice(1) : csvMutasi;
    }

    // 3. Fetch other ranges (Buku Kas Keuangan, Data Pengiriman, Purchase Order)
    let keuanganRows: any[][] = [];
    let pengirimanRows: any[][] = [];
    let poRows: any[][] = [];

    if (accessToken) {
      try {
        const ranges = [
          "'Buku Kas Keuangan'!A2:G1000",
          "'Data Pengiriman'!A2:H1000",
          "'Purchase Order'!A2:H1000"
        ];
        const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangeParams}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (res.ok) {
          const json = await res.json();
          const vr = json.valueRanges || [];
          keuanganRows = vr[0]?.values || [];
          pengirimanRows = vr[1]?.values || [];
          poRows = vr[2]?.values || [];
        }
      } catch (e) {
        // ignore
      }
    }

    // Fetch Customer from MUTASI_STOCK_SPREADSHEET_ID ('CUSTOMER')
    let customerRows: any[][] = [];
    if (accessToken) {
      try {
        const custFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'CUSTOMER'!A2:E1000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (custFetchRes.ok) {
          const custJson = await custFetchRes.json();
          customerRows = custJson.values || [];
        }
      } catch (e) {}
    }
    if (customerRows.length === 0) {
      const csvCust = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'CUSTOMER');
      customerRows = csvCust.length > 1 ? csvCust.slice(1) : csvCust;
    }

    // Fetch Metode Pembayaran from MUTASI_STOCK_SPREADSHEET_ID ('METODE PEMBAYARAN')
    let metodePembayaranRows: any[][] = [];
    if (accessToken) {
      try {
        const metFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'METODE PEMBAYARAN'!A2:B1000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (metFetchRes.ok) {
          const metJson = await metFetchRes.json();
          metodePembayaranRows = metJson.values || [];
        }
      } catch (e) {}
    }
    if (metodePembayaranRows.length === 0) {
      try {
        const csvMet = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'METODE PEMBAYARAN');
        metodePembayaranRows = csvMet.length > 1 ? csvMet.slice(1) : csvMet;
      } catch (e) {}
    }

    // Fetch ADMIN from MUTASI_STOCK_SPREADSHEET_ID ('ADMIN')
    let adminRows: any[][] = [];
    if (accessToken) {
      try {
        const adminFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'ADMIN'!A2:F1000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (adminFetchRes.ok) {
          const adminJson = await adminFetchRes.json();
          adminRows = adminJson.values || [];
        }
      } catch (e) {}
    }
    if (adminRows.length === 0) {
      try {
        const csvAdmin = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'ADMIN');
        adminRows = csvAdmin.length > 1 ? csvAdmin.slice(1) : csvAdmin;
      } catch (e) {}
    }

    // Fetch POSISI from MUTASI_STOCK_SPREADSHEET_ID ('POSISI')
    let posisiRows: any[][] = [];
    if (accessToken) {
      try {
        const posFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'POSISI'!A2:B1000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (posFetchRes.ok) {
          const posJson = await posFetchRes.json();
          posisiRows = posJson.values || [];
        }
      } catch (e) {}
    }
    if (posisiRows.length === 0) {
      try {
        const csvPos = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'POSISI');
        posisiRows = csvPos.length > 1 ? csvPos.slice(1) : csvPos;
      } catch (e) {}
    }

    // Fetch PENJUALAN from MUTASI_STOCK_SPREADSHEET_ID ('PENJUALAN')
    let penjualanRows: any[][] = [];
    if (accessToken) {
      try {
        const penjFetchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${MUTASI_STOCK_SPREADSHEET_ID}/values/${encodeURIComponent("'PENJUALAN'!A2:L2000")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (penjFetchRes.ok) {
          const penjJson = await penjFetchRes.json();
          penjualanRows = penjJson.values || [];
        }
      } catch (e) {}
    }
    if (penjualanRows.length === 0) {
      try {
        const csvPenj = await fetchSheetCsv(MUTASI_STOCK_SPREADSHEET_ID, 'PENJUALAN');
        penjualanRows = csvPenj.length > 1 ? csvPenj.slice(1) : csvPenj;
      } catch (e) {}
    }

    if (keuanganRows.length === 0) {
      const csv = await fetchSheetCsv(cleanId, 'Buku Kas Keuangan');
      if (csv.length > 1) keuanganRows = csv.slice(1);
    }
    if (pengirimanRows.length === 0) {
      const csv = await fetchSheetCsv(cleanId, 'Data Pengiriman');
      if (csv.length > 1) pengirimanRows = csv.slice(1);
    }
    if (poRows.length === 0) {
      const csv = await fetchSheetCsv(cleanId, 'Purchase Order');
      if (csv.length > 1) poRows = csv.slice(1);
    }

    // 1. Parse Produk from STOCK LIST (Sheet: 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ)
    // Posisi Stock:
    // TOKO (di kolom QTY TOKO)
    // GUDANG (di kolom QTY GUDANG)
    // PIRANHA (di kolom QTY PIRANHA)
    const findStockCol = (name: string, fallbackIdx: number) => {
      if (!stockListHeaders || stockListHeaders.length === 0) return fallbackIdx;
      const idx = stockListHeaders.findIndex((h) => h === name.toUpperCase() || h.includes(name.toUpperCase()));
      return idx >= 0 ? idx : fallbackIdx;
    };

    const colCode = findStockCol('CODE', 0);
    const colBarcode = findStockCol('BARCODE', 1);
    const colDesc = findStockCol('DESCRIPTION', 2);
    const colUnit = findStockCol('UNIT', 3);
    const colKategori = findStockCol('KATEGORI', 4);
    const colSubKategori = findStockCol('SUB KATEGORI', 5);
    const colMerk = findStockCol('MERK', 6);
    const colHpp = findStockCol('HPP AKHIR', 7);
    const colEceran = findStockCol('ECERAN', 10);
    const colGrosir = findStockCol('GROSIR', 11);
    const colPartai = findStockCol('PARTAI', 12);
    const colQtyToko = findStockCol('QTY TOKO', 14);
    const colQtyGudang = findStockCol('QTY GUDANG', 15);
    const colQtyPiranha = findStockCol('QTY PIRANHA', 16);
    const colFoto = findStockCol('FOTO PRODUK', 22);

    const produk: Produk[] = produkRows.map((r, idx) => {
      const sku = String(r[colCode] || '').trim();
      const barcode = String(r[colBarcode] || '').trim();
      const nama = String(r[colDesc] || '').trim();
      const satuan = String(r[colUnit] || 'Pcs').trim();
      const kategori = String(r[colKategori] || 'Umum').trim();
      const subKategori = String(r[colSubKategori] || '').trim();
      const merk = String(r[colMerk] || '').trim();
      const hpp = parseNum(r[colHpp], 0);
      const eceran = parseNum(r[colEceran], 0);
      const grosir = parseNum(r[colGrosir], 0);
      const partai = parseNum(r[colPartai], 0);
      const qtyToko = parseNum(r[colQtyToko], 0);
      const qtyGudang = parseNum(r[colQtyGudang], 0);
      const qtyPiranha = parseNum(r[colQtyPiranha], 0);
      const totalQty = qtyToko + qtyGudang + qtyPiranha;

      const fotoRaw = String(r[colFoto] || r[22] || r[23] || '').trim();
      const foto = fotoRaw
        ? fotoRaw.startsWith('http')
          ? fotoRaw
          : `https://lh3.googleusercontent.com/d/${fotoRaw}`
        : '';

      const prodId = sku ? `PROD-${sku}` : `BRG-${idx + 1}`;

      return {
        id: prodId,
        sku: sku || `SKU-${idx + 1}`,
        barcode,
        nama: nama || `Produk ${idx + 1}`,
        kategori: kategori || 'Umum',
        subKategori,
        harga: eceran > 0 ? eceran : hpp,
        satuan: satuan || 'Pcs',
        isiKarton: 1,
        minStok: 5,
        merk,
        hpp,
        eceran,
        grosir,
        partai,
        qty: totalQty,
        qtyToko,
        qtyGudang,
        qtyPiranha,
        foto
      };
    }).filter((p) => p.nama && p.nama.toLowerCase() !== 'description' && p.nama.toLowerCase() !== 'nama produk');

    // 2. Parse Mutasi Stok
    let stok: MutasiStok[] = stokRows.map((r, idx) => {
      // Check if format is the 11-column sheet header: WAKTU, TIPE TRANSAKSI, POSISI, SKU, NAMA PRODUK, QTY, HARGA, JENIS HARGA, TOTAL, KETERANGAN, ADMIN
      const isNewFormat = r[1] === 'MASUK' || r[1] === 'KELUAR';
      if (isNewFormat) {
        const skuVal = String(r[3] || '').trim();
        const matchedProd = produk.find((p) => p.sku === skuVal || p.id === skuVal || p.nama === r[4]);
        return {
          id: `MUT-${idx + 1}`,
          date: String(r[0] || new Date().toISOString()),
          idProduk: matchedProd?.id || skuVal || `PROD-${idx + 1}`,
          tipe: (r[1] === 'KELUAR' ? 'KELUAR' : 'MASUK') as TipeMutasi,
          posisi: String(r[2] || 'TOKO').toUpperCase(),
          jumlah: parseNum(r[5], 0),
          harga: parseNum(r[6], 0),
          jenisHarga: String(r[7] || ''),
          keterangan: String(r[9] || r[4] || '')
        };
      }

      return {
        id: String(r[0] || `MUT-${idx + 1}`),
        date: String(r[1] || new Date().toISOString()),
        idProduk: String(r[2] || ''),
        tipe: (r[4] === 'KELUAR' ? 'KELUAR' : 'MASUK') as TipeMutasi,
        jumlah: parseNum(r[5], 0),
        harga: parseNum(r[6], 0),
        keterangan: String(r[8] || r[7] || ''),
        posisi: String(r[3] || 'TOKO').toUpperCase()
      };
    });

    // Seed initial stock breakdown per position: TOKO (QTY TOKO), GUDANG (QTY GUDANG), PIRANHA (QTY PIRANHA)
    produk.forEach((p, idx) => {
      const hasMutation = stok.some((s) => s.idProduk === p.id);
      if (!hasMutation) {
        if ((p.qtyToko ?? 0) > 0) {
          stok.unshift({
            id: `STK-INIT-TOKO-${idx}`,
            date: new Date().toISOString(),
            idProduk: p.id,
            tipe: 'MASUK',
            jumlah: p.qtyToko ?? 0,
            harga: p.hpp || p.harga || 0,
            posisi: 'TOKO',
            keterangan: '[INITIAL] Stok awal TOKO dari Google Sheet STOCK LIST'
          });
        }
        if ((p.qtyGudang ?? 0) > 0) {
          stok.unshift({
            id: `STK-INIT-GUDANG-${idx}`,
            date: new Date().toISOString(),
            idProduk: p.id,
            tipe: 'MASUK',
            jumlah: p.qtyGudang ?? 0,
            harga: p.hpp || p.harga || 0,
            posisi: 'GUDANG',
            keterangan: '[INITIAL] Stok awal GUDANG dari Google Sheet STOCK LIST'
          });
        }
        if ((p.qtyPiranha ?? 0) > 0) {
          stok.unshift({
            id: `STK-INIT-PIRANHA-${idx}`,
            date: new Date().toISOString(),
            idProduk: p.id,
            tipe: 'MASUK',
            jumlah: p.qtyPiranha ?? 0,
            harga: p.hpp || p.harga || 0,
            posisi: 'PIRANHA',
            keterangan: '[INITIAL] Stok awal PIRANHA dari Google Sheet STOCK LIST'
          });
        }
        // Fallback if all 3 position columns were 0 but total qty > 0
        if ((p.qtyToko ?? 0) === 0 && (p.qtyGudang ?? 0) === 0 && (p.qtyPiranha ?? 0) === 0 && (p.qty ?? 0) > 0) {
          stok.unshift({
            id: `STK-INIT-TOKO-${idx}`,
            date: new Date().toISOString(),
            idProduk: p.id,
            tipe: 'MASUK',
            jumlah: p.qty ?? 0,
            harga: p.hpp || p.harga || 0,
            posisi: 'TOKO',
            keterangan: '[INITIAL] Stok awal TOKO dari Google Sheet STOCK LIST'
          });
        }
      }
    });

    // 3. Parse Keuangan
    const keuangan: TransaksiKeuangan[] = keuanganRows.map((r, idx) => {
      const tipe = r[2] === 'KELUAR' ? 'KELUAR' : 'MASUK';
      const debit = parseNum(r[5], 0);
      const kredit = parseNum(r[6], 0);
      const nominal = tipe === 'MASUK' ? (debit || parseNum(r[4], 0)) : (kredit || parseNum(r[4], 0));

      return {
        id: String(r[0] || `KAS-${idx + 1}`),
        date: String(r[1] || new Date().toISOString()),
        tipe,
        kategori: String(r[3] || 'Umum'),
        keterangan: String(r[4] || ''),
        nominal
      };
    });

    // 4. Parse Customer
    // Kolom 1 (index 0): DATA CUSTOMER
    // Kolom 2 (index 1): PIC
    // Kolom 3 (index 2): METODE PEMBAYARAN
    // Kolom 4 (index 3): KETERANGAN
    const customer: Customer[] = customerRows.map((r, idx) => {
      const name = String(r[0] || '').trim();
      return {
        id: `CUST-${idx + 1}-${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        namaCustomer: name,
        pic: String(r[1] || '').trim(),
        metodePembayaran: String(r[2] || '').trim(),
        keterangan: String(r[3] || '').trim()
      };
    }).filter((c) => c.namaCustomer && c.namaCustomer.toUpperCase() !== 'DATA CUSTOMER' && c.namaCustomer.toUpperCase() !== 'NAMA CUSTOMER' && c.namaCustomer.toUpperCase() !== 'DATA PELANGGAN');

    // 5. Parse Pengiriman
    const pengiriman: Pengiriman[] = pengirimanRows.map((r, idx) => {
      const itemStr = String(r[4] || '');
      const items: ItemPengiriman[] = itemStr
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((itemPiece) => {
          const match = itemPiece.match(/^(.*?)\s*\((?:(\d+)\s*)?(.*?)\)$/);
          if (match) {
            return {
              idProduk: '',
              namaProduk: match[1]?.trim() || itemPiece,
              quantity: parseInt(match[2] || '1', 10) || 1,
              satuan: match[3]?.trim() || 'Pcs',
              harga: 0
            };
          }
          return {
            idProduk: '',
            namaProduk: itemPiece,
            quantity: 1,
            satuan: 'Pcs',
            harga: 0
          };
        });

      let statusVal: 'PROSES' | 'TERKIRIM' | 'BATAL' = 'PROSES';
      if (r[6] === 'TERKIRIM' || r[6] === 'SELESAI' || r[6] === 'KIRIM') statusVal = 'TERKIRIM';
      if (r[6] === 'BATAL') statusVal = 'BATAL';

      return {
        id: String(r[0] || `PENG-${idx + 1}`),
        noNota: String(r[1] || ''),
        tanggal: String(r[2] || new Date().toISOString()),
        namaCustomer: String(r[3] || ''),
        items,
        totalHarga: parseNum(r[5], 0),
        status: statusVal,
        catatan: String(r[7] || '')
      };
    });

    // 6. Parse Purchase Order & PENJUALAN
    let purchaseOrder: PurchaseOrder[] = [];

    if (penjualanRows.length > 0) {
      const poGroupMap = new Map<string, any[]>();
      penjualanRows.forEach((r) => {
        const idVal = String(r[0] || '').trim();
        if (!idVal || idVal.toUpperCase() === 'ID') return;
        if (!poGroupMap.has(idVal)) poGroupMap.set(idVal, []);
        poGroupMap.get(idVal)!.push(r);
      });

      poGroupMap.forEach((rowsInGroup, groupKey) => {
        const first = rowsInGroup[0];
        const items: ItemPO[] = rowsInGroup.map((r) => {
          const skuVal = String(r[5] || '').trim();
          const prodNameVal = String(r[6] || '').trim();
          const matchedProd = produk.find(p => p.sku === skuVal || p.nama === prodNameVal);
          return {
            idProduk: matchedProd?.id || '',
            sku: skuVal,
            namaProduk: prodNameVal,
            quantity: parseNum(r[7], 1),
            harga: parseNum(r[8], 0),
            jenisHarga: String(r[9] || 'Eceran'),
            satuan: matchedProd?.satuan || 'Pcs'
          };
        }).filter((it) => it.namaProduk && it.namaProduk !== '-');

        const totalQtyVal = parseNum(first[10], items.reduce((a: number, b) => a + Number(b.quantity || 0), 0));
        const totalHargaVal = parseNum(first[11], items.reduce((a: number, b) => a + (Number(b.quantity || 0) * Number(b.harga || 0)), 0));

        purchaseOrder.push({
          id: groupKey,
          noPO: groupKey,
          customer: String(first[1] || ''),
          namaSupplier: String(first[1] || ''),
          posisi: String(first[2] || 'TOKO').toUpperCase(),
          admin: String(first[3] || 'Admin'),
          tanggal: String(first[4] || new Date().toISOString()),
          items,
          totalQty: totalQtyVal,
          totalHarga: totalHargaVal,
          status: 'DITERIMA',
          catatan: ''
        });
      });
    }

    if (purchaseOrder.length === 0) {
      purchaseOrder = poRows.map((r, idx) => {
        const itemStr = String(r[4] || '');
        const items: ItemPO[] = itemStr
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((itemPiece) => {
            const match = itemPiece.match(/^(.*?)\s*\((?:(\d+)\s*)?(.*?)\)$/);
            if (match) {
              return {
                idProduk: '',
                namaProduk: match[1]?.trim() || itemPiece,
                quantity: parseInt(match[2] || '1', 10) || 1,
                satuan: match[3]?.trim() || 'Pcs',
                harga: 0
              };
            }
            return {
              idProduk: '',
              namaProduk: itemPiece,
              quantity: 1,
              satuan: 'Pcs',
              harga: 0
            };
          });

        let statusVal: 'DRAFT' | 'DIPESAN' | 'DITERIMA' | 'BATAL' = 'DIPESAN';
        const rawStatus = String(r[5] || r[6] || '').toUpperCase();
        if (rawStatus === 'DITERIMA' || rawStatus === 'SELESAI') statusVal = 'DITERIMA';
        if (rawStatus === 'BATAL') statusVal = 'BATAL';
        if (rawStatus === 'DRAFT') statusVal = 'DRAFT';

        return {
          id: String(r[0] || `PO-${idx + 1}`),
          noPO: String(r[1] || ''),
          tanggal: String(r[2] || new Date().toISOString()),
          namaSupplier: String(r[3] || ''),
          items,
          totalHarga: 0,
          status: statusVal,
          catatan: String(r[6] || r[7] || '')
        };
      });
    }

    const excludedCategories = ['makanan', 'minuman', 'rokok', 'sembako'];
    const customKategori = Array.from(
      new Set(
        produk
          .map((p) => p.kategori)
          .filter((cat) => cat && !excludedCategories.includes(cat.toLowerCase()))
      )
    );

    const metodePembayaranList = Array.from(
      new Set(
        metodePembayaranRows
          .map((r) => String(r[0] || '').trim())
          .filter((m) => m && m.toUpperCase() !== 'METODE PEMBAYARAN' && m.toUpperCase() !== 'METODE')
      )
    );

    const defaultAccounts: AccountPermission[] = [
      { username: 'SERVER', role: 'Super Admin (Full Access)', allowedTabs: ['dashboard', 'produk', 'stok', 'keuangan', 'customer', 'pengiriman', 'purchase_order', 'laporan'], posisi: 'TOKO' },
      { username: 'admin', role: 'Administrator', allowedTabs: ['dashboard', 'produk', 'stok', 'keuangan', 'customer', 'pengiriman', 'purchase_order', 'laporan'], posisi: 'TOKO' },
      { username: 'kasir', role: 'Kasir & Penjualan', allowedTabs: ['dashboard', 'produk', 'purchase_order', 'customer'], posisi: 'TOKO' },
      { username: 'toko', role: 'Staff Toko', allowedTabs: ['dashboard', 'produk', 'purchase_order', 'customer'], posisi: 'TOKO' },
      { username: 'gudang', role: 'Staff Gudang & Stok', allowedTabs: ['dashboard', 'produk', 'stok'], posisi: 'GUDANG' }
    ];

    const parsedAccounts: AccountPermission[] = adminRows.map((r) => {
      const username = String(r[0] || '').trim();
      const role = String(r[1] || 'Staff').trim();
      const aksesStr = String(r[2] || '').trim();
      let posFromSheet = String(r[3] || '').trim();

      if (!username || username.toUpperCase() === 'USERNAME' || username.toUpperCase() === 'AKUN') return null;

      if (!posFromSheet) {
        if (role.toUpperCase().includes('GUDANG') || username.toUpperCase().includes('GUDANG')) {
          posFromSheet = 'GUDANG';
        } else if (role.toUpperCase().includes('TOKO') || username.toUpperCase().includes('TOKO') || username.toLowerCase() === 'kasir' || username.toLowerCase() === 'admin') {
          posFromSheet = 'TOKO';
        } else {
          posFromSheet = 'TOKO';
        }
      }

      let allowedTabs: string[];
      if (username.toUpperCase() === 'SERVER' || username.toUpperCase() === 'ADMIN' || aksesStr.toUpperCase() === 'ALL' || aksesStr.toLowerCase().includes('full')) {
        allowedTabs = ['dashboard', 'produk', 'stok', 'keuangan', 'customer', 'pengiriman', 'purchase_order', 'laporan'];
      } else if (aksesStr) {
        allowedTabs = aksesStr.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      } else {
        allowedTabs = ['dashboard', 'produk'];
      }

      return {
        username,
        role: role || 'Staff',
        allowedTabs,
        posisi: posFromSheet
      };
    }).filter(Boolean) as AccountPermission[];

    const finalAccounts = parsedAccounts.length > 0 ? parsedAccounts : defaultAccounts;
    try {
      localStorage.setItem('globalMartAccountsPermissions', JSON.stringify(finalAccounts));
    } catch (e) {}

    const posisiList = Array.from(
      new Set(
        posisiRows
          .map((r) => String(r[0] || '').trim())
          .filter((p) => p && p.toUpperCase() !== 'POSISI' && p.toUpperCase() !== 'LOKASI' && p.toUpperCase() !== 'NAMA POSISI')
      )
    );

    const parsedDb: AppDatabase = {
      produk,
      stok,
      keuangan,
      customer,
      pengiriman,
      purchaseOrder,
      customKategori,
      accounts: finalAccounts,
      metodePembayaranList: metodePembayaranList.length > 0 ? metodePembayaranList : ['Cash', 'Transfer', 'Kredit', 'Tempo'],
      posisiList: posisiList.length > 0 ? posisiList : ['Gudang Utama', 'Toko', 'Display', 'Transit', 'Gudang 2']
    };

    return {
      success: true,
      data: parsedDb,
      message: 'Berhasil menarik data dari Google Spreadsheet!'
    };
  } catch (err: any) {
    console.error('fetchDatabaseFromSheets error:', err);
    return {
      success: false,
      message: err.message || 'Gagal mengambil data dari Google Spreadsheet.'
    };
  }
}
