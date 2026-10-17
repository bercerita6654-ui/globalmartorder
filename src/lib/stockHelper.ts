import { Produk, MutasiStok } from '../types';

export interface ProductStockInfo {
  toko: number;
  gudang: number;
  piranha: number;
  total: number;
}

/**
 * Normalizes a location name to 'TOKO', 'GUDANG', or 'PIRANHA'
 */
export function normalizePosition(pos: string): 'TOKO' | 'GUDANG' | 'PIRANHA' {
  const upper = (pos || '').toUpperCase().trim();
  if (upper.includes('GUDANG')) return 'GUDANG';
  if (upper.includes('PIRANHA')) return 'PIRANHA';
  return 'TOKO';
}

/**
 * Calculates accurate stock quantities per position:
 * - TOKO (from column QTY TOKO)
 * - GUDANG (from column QTY GUDANG)
 * - PIRANHA (from column QTY PIRANHA)
 * factoring in any subsequent MutasiStok MASUK and KELUAR.
 */
export function getProductStockInfo(p: Produk, stokLogs: MutasiStok[] = []): ProductStockInfo {
  const getPosStok = (posName: 'TOKO' | 'GUDANG' | 'PIRANHA', baseQty: number): number => {
    const posLogs = stokLogs.filter(
      (s) => s.idProduk === p.id && normalizePosition(s.posisi || '') === posName
    );
    const hasInitialLog = posLogs.some(
      (s) => s.id.includes('STK-INIT') || (s.keterangan || '').includes('[INITIAL]')
    );
    const masuk = posLogs
      .filter((s) => s.tipe === 'MASUK')
      .reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
    const keluar = posLogs
      .filter((s) => s.tipe === 'KELUAR')
      .reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);

    if (hasInitialLog) {
      return Math.max(0, masuk - keluar);
    }
    return Math.max(0, baseQty + masuk - keluar);
  };

  const toko = getPosStok('TOKO', p.qtyToko ?? 0);
  const gudang = getPosStok('GUDANG', p.qtyGudang ?? 0);
  const piranha = getPosStok('PIRANHA', p.qtyPiranha ?? 0);
  const total = toko + gudang + piranha;

  return { toko, gudang, piranha, total };
}

/**
 * Returns available stock for a product at a designated location ('TOKO' | 'GUDANG' | 'PIRANHA')
 */
export function getStockAtLocation(p: Produk, pos: string, stokLogs: MutasiStok[] = []): number {
  const norm = normalizePosition(pos);
  const info = getProductStockInfo(p, stokLogs);
  if (norm === 'GUDANG') return info.gudang;
  if (norm === 'PIRANHA') return info.piranha;
  return info.toko;
}

export function formatStockNum(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

