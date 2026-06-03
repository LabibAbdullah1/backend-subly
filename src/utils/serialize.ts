/**
 * Konversi field berjenis BigInt menjadi string agar valid saat diserialisasi ke JSON.
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
