/**
 * GOOGLE APPS SCRIPT CODE UNTUK INPUT PENJUALAN KE SHEET 'PENJUALAN' & 'STOCK LIST'
 * 
 * SPREADSHEET TARGET: 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Spreadsheet Anda (1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ).
 * 2. Klik menu "Ekstensi" > "Apps Script" (Extensions > Apps Script).
 * 3. Hapus semua kode bawaan, lalu salin (copy) seluruh kode di bawah ini dan tempel (paste).
 * 4. Klik "Simpan" (Ctrl+S / Cmd+S).
 * 5. Klik tombol "Terapkan" > "Aplikasi Web Baru" (Deploy > New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web app).
 * 7. Akses: "Siapa Saja" (Anyone) -> Kritis agar web app dapat mengirim data penjualan tanpa terhalang CORS.
 * 8. Klik "Terapkan" (Deploy), berikan izin akses (Authorize access), lalu salin URL Web App yang dihasilkan.
 * 9. Tempelkan URL Web App tersebut ke menu Pengaturan di aplikasi web Anda.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT AUTOMATION FOR 'PENJUALAN', 'BARANG MASUK', 'BARANG KELUAR', & 'STOCK LIST'
 * Spreadsheet ID: 1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ
 */

function doPost(e) {
  try {
    var rawData = "";
    if (e && e.postData && e.postData.contents) {
      rawData = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      rawData = e.parameter.data;
    } else if (e && typeof e === 'string') {
      rawData = e;
    }

    if (!rawData) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Payload kosong" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data;
    try {
      data = JSON.parse(rawData);
    } catch (parseErr) {
      try {
        data = JSON.parse(decodeURIComponent(rawData));
      } catch (e2) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Gagal parse JSON: " + parseErr.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    var ss = getSS(data);
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Spreadsheet tidak ditemukan" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Map Produk
    var prodMap = {};
    if (data.produk && Array.isArray(data.produk)) {
      for (var pIdx = 0; pIdx < data.produk.length; pIdx++) {
        var pObj = data.produk[pIdx];
        if (pObj) {
          if (pObj.id) prodMap[String(pObj.id)] = pObj;
          if (pObj.sku) prodMap[String(pObj.sku)] = pObj;
          if (pObj.nama) prodMap[String(pObj.nama)] = pObj;
        }
      }
    }
    
    // 1. PROSES REKAP KE SHEET 'PENJUALAN'
    var poList = data.purchaseOrder || data.penjualan;
    if (poList && Array.isArray(poList)) {
      syncPenjualanSheet(ss, poList);
    }
    
    // 2. PROSES UPDATE STOK KE SHEET 'STOCK LIST'
    if (data.produk && Array.isArray(data.produk)) {
      syncStockListSheet(ss, data.produk);
    }
    
    // 3. PROSES REKAP SHEET 'BARANG MASUK' & SHEET 'BARANG KELUAR'
    var stokList = (data.stok && Array.isArray(data.stok) && data.stok.length > 0)
      ? data.stok
      : (data.barangMasuk || []).concat(data.barangKeluar || []);
    if (stokList && Array.isArray(stokList) && stokList.length > 0) {
      syncBarangMasukSheet(ss, stokList, prodMap);
      syncBarangKeluarSheet(ss, stokList, prodMap);
      syncMutasiSheet(ss, stokList);
    }
    
    // 4. PROSES REKAP CUSTOMER
    if (data.customer && Array.isArray(data.customer)) {
      syncCustomerSheet(ss, data.customer);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil tersinkronisasi ke sheet PENJUALAN, BARANG MASUK, BARANG KELUAR, dan STOCK LIST!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Apps Script Web App Penjualan Global Mart Siap Digunakan!"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * MENGISI SHEET 'PENJUALAN' DENGAN 12 KOLOM PERSIS SESUAI SPESIFIKASI:
 * ID | CUSTOMER | POSISI | ADMIN | HARI/TANGGAL | SKU | NAMA PRODUK | QTY | HARGA | JENIS HARGA | TOTAL QTY | TOTAL HARGA
 */
function syncPenjualanSheet(ss, poList) {
  var sheetName = "PENJUALAN";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  var headers = [
    "ID",
    "CUSTOMER",
    "POSISI",
    "ADMIN",
    "HARI/TANGGAL",
    "SKU",
    "NAMA PRODUK",
    "QTY",
    "HARGA",
    "JENIS HARGA",
    "TOTAL QTY",
    "TOTAL HARGA"
  ];
  
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#0F172A")
    .setFontColor("#FFFFFF");
    
  var rows = [];
  
  for (var i = 0; i < poList.length; i++) {
    var p = poList[i];
    var idPenjualan = p.noPO || p.id || ("PJ-" + (i + 1));
    var customer = p.customer || p.namaSupplier || "-";
    var posisi = String(p.posisi || "TOKO").toUpperCase();
    var admin = p.admin || "Admin";
    var tanggal = p.tanggal ? formatDateStr(p.tanggal) : formatDateStr(new Date());
    
    var items = p.items || [];
    var totalQty = p.totalQty || 0;
    var totalHarga = p.totalHarga || 0;
    
    if (totalQty === 0 && items.length > 0) {
      for (var k = 0; k < items.length; k++) {
        totalQty += (Number(items[k].quantity) || 0);
        totalHarga += ((Number(items[k].quantity) || 0) * (Number(items[k].harga) || 0));
      }
    }
    
    if (items.length === 0) {
      rows.push([
        idPenjualan, customer, posisi, admin, tanggal,
        "-", "-", 0, 0, "-", totalQty, totalHarga
      ]);
    } else {
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        rows.push([
          idPenjualan,
          customer,
          posisi,
          admin,
          tanggal,
          it.sku || "-",
          it.namaProduk || "-",
          Number(it.quantity) || 0,
          Number(it.harga) || 0,
          it.jenisHarga || "Eceran",
          totalQty,
          totalHarga
        ]);
      }
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * UPDATE SHEET 'STOCK LIST' PER LOKASI (QTY TOKO, QTY GUDANG, QTY PIRANHA) secara BULK MEMORY
 */
function syncStockListSheet(ss, produkList) {
  var sheet = ss.getSheetByName("STOCK LIST");
  if (!sheet) return;
  
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (!values || values.length <= 1) return;
  
  var headers = values[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
  
  var colCode = findColIndex(headers, ["CODE", "SKU"]);
  var colDesc = findColIndex(headers, ["DESCRIPTION", "NAMA PRODUK"]);
  var colQtyToko = findColIndex(headers, ["QTY TOKO", "TOKO"]);
  var colQtyGudang = findColIndex(headers, ["QTY GUDANG", "GUDANG"]);
  var colQtyPiranha = findColIndex(headers, ["QTY PIRANHA", "PIRANHA"]);
  
  var prodMap = {};
  for (var i = 0; i < produkList.length; i++) {
    var p = produkList[i];
    var keySku = (p.sku || "").toString().trim().toUpperCase();
    var keyNama = (p.nama || "").toString().trim().toUpperCase();
    if (keySku) prodMap[keySku] = p;
    if (keyNama) prodMap[keyNama] = p;
  }
  
  var modified = false;
  for (var r = 1; r < values.length; r++) {
    var rowSku = (values[r][colCode] || "").toString().trim().toUpperCase();
    var rowDesc = (values[r][colDesc] || "").toString().trim().toUpperCase();
    
    var matchProd = prodMap[rowSku] || prodMap[rowDesc];
    if (matchProd) {
      if (colQtyToko >= 0 && matchProd.qtyToko !== undefined) {
        values[r][colQtyToko] = Number(matchProd.qtyToko) || 0;
        modified = true;
      }
      if (colQtyGudang >= 0 && matchProd.qtyGudang !== undefined) {
        values[r][colQtyGudang] = Number(matchProd.qtyGudang) || 0;
        modified = true;
      }
      if (colQtyPiranha >= 0 && matchProd.qtyPiranha !== undefined) {
        values[r][colQtyPiranha] = Number(matchProd.qtyPiranha) || 0;
        modified = true;
      }
    }
  }
  
  if (modified) {
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
}

/**
 * REKAP SHEET 'BARANG MASUK'
 */
function syncBarangMasukSheet(ss, stokList, prodMap) {
  var sheetName = "BARANG MASUK";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  var headers = [
    "ID",
    "WAKTU",
    "SKU / CODE",
    "NAMA PRODUK",
    "POSISI / LOKASI",
    "QTY MASUK",
    "HARGA SATUAN",
    "TOTAL HARGA",
    "KETERANGAN"
  ];
  
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#065F46")
    .setFontColor("#FFFFFF");
    
  var rows = [];
  for (var i = 0; i < stokList.length; i++) {
    var s = stokList[i];
    if (String(s.tipe || "").toUpperCase() === "MASUK") {
      var matchP = (prodMap && (prodMap[s.idProduk] || prodMap[s.sku])) || {};
      var sku = s.sku || matchP.sku || s.idProduk || "-";
      var nama = s.namaProduk || matchP.nama || s.idProduk || "-";
      var qty = Number(s.jumlah) || 0;
      var harga = Number(s.harga) || Number(matchP.harga) || 0;
      var total = qty * harga;
      var waktu = s.date ? formatDateStr(s.date) : formatDateStr(new Date());

      rows.push([
        s.id || ("BM-" + (i + 1)),
        waktu,
        sku,
        nama,
        s.posisi || "TOKO",
        qty,
        harga,
        total,
        s.keterangan || "-"
      ]);
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * REKAP SHEET 'BARANG KELUAR'
 */
function syncBarangKeluarSheet(ss, stokList, prodMap) {
  var sheetName = "BARANG KELUAR";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  var headers = [
    "ID",
    "WAKTU",
    "SKU / CODE",
    "NAMA PRODUK",
    "POSISI / LOKASI",
    "QTY KELUAR",
    "HARGA SATUAN",
    "TOTAL HARGA",
    "KETERANGAN"
  ];
  
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#9F1239")
    .setFontColor("#FFFFFF");
    
  var rows = [];
  for (var i = 0; i < stokList.length; i++) {
    var s = stokList[i];
    if (String(s.tipe || "").toUpperCase() === "KELUAR") {
      var matchP = (prodMap && (prodMap[s.idProduk] || prodMap[s.sku])) || {};
      var sku = s.sku || matchP.sku || s.idProduk || "-";
      var nama = s.namaProduk || matchP.nama || s.idProduk || "-";
      var qty = Number(s.jumlah) || 0;
      var harga = Number(s.harga) || Number(matchP.harga) || 0;
      var total = qty * harga;
      var waktu = s.date ? formatDateStr(s.date) : formatDateStr(new Date());

      rows.push([
        s.id || ("BK-" + (i + 1)),
        waktu,
        sku,
        nama,
        s.posisi || "TOKO",
        qty,
        harga,
        total,
        s.keterangan || "-"
      ]);
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * REKAP MUTASI STOK
 */
function syncMutasiSheet(ss, stokList) {
  var sheet = ss.getSheetByName("Mutasi & Stock") || ss.getSheetByName("MUTASI STOK");
  if (!sheet) return;
  
  var headers = ["ID", "Waktu", "ID Produk", "Posisi", "Tipe", "Jumlah", "Harga", "Total", "Keterangan"];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  
  var rows = [];
  for (var i = 0; i < stokList.length; i++) {
    var s = stokList[i];
    rows.push([
      s.id || ("MUT-" + (i + 1)),
      s.date ? formatDateStr(s.date) : formatDateStr(new Date()),
      s.idProduk || "-",
      s.posisi || "TOKO",
      s.tipe || "KELUAR",
      Number(s.jumlah) || 0,
      Number(s.harga) || 0,
      (Number(s.jumlah) || 0) * (Number(s.harga) || 0),
      s.keterangan || ""
    ]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * REKAP DAFTAR CUSTOMER
 */
function syncCustomerSheet(ss, customerList) {
  var sheet = ss.getSheetByName("CUSTOMER") || ss.getSheetByName("Daftar Customer");
  if (!sheet) return;
  
  var headers = ["DATA CUSTOMER", "PIC", "METODE PEMBAYARAN", "KETERANGAN"];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  
  var rows = [];
  for (var i = 0; i < customerList.length; i++) {
    var c = customerList[i];
    rows.push([
      c.namaCustomer || "-",
      c.pic || "-",
      c.metodePembayaran || "Cash",
      c.keterangan || ""
    ]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function findColIndex(headers, targets) {
  for (var i = 0; i < headers.length; i++) {
    for (var j = 0; j < targets.length; j++) {
      if (headers[i].indexOf(targets[j]) >= 0) return i;
    }
  }
  return -1;
}

function formatDateStr(isoStr) {
  if (!isoStr) return "";
  try {
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    try {
      var tz = Session.getScriptTimeZone();
      if (tz) return Utilities.formatDate(d, tz, "yyyy-MM-dd HH:mm:ss");
    } catch (eTz) {}
    try {
      return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd HH:mm:ss");
    } catch (eGmt) {}
    return d.getFullYear() + "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("0" + d.getDate()).slice(-2) + " " +
      ("0" + d.getHours()).slice(-2) + ":" +
      ("0" + d.getMinutes()).slice(-2) + ":" +
      ("0" + d.getSeconds()).slice(-2);
  } catch (e) {
    return String(isoStr);
  }
}

function getSS(data) {
  if (data && data.spreadsheetId) {
    try {
      var ssById = SpreadsheetApp.openById(data.spreadsheetId);
      if (ssById) return ssById;
    } catch (e0) {}
  }
  try {
    var ssDefault = SpreadsheetApp.openById("1VjqsxWfMJDJwjmR_Z4QjhgEfhFJZIBQJLLr21wZL_rQ");
    if (ssDefault) return ssDefault;
  } catch (e1) {}
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e2) {}
  return null;
}
`;

