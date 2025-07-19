import { useState, useEffect } from 'react';

/**
 * Custom hook untuk menunda pembaruan nilai.
 * @param value Nilai yang ingin ditunda (misalnya, query pencarian).
 * @param delay Waktu tunda dalam milidetik (misalnya, 300ms).
 * @returns Nilai yang sudah ditunda.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Atur timer untuk update nilai setelah delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bersihkan timer setiap kali 'value' berubah (pengguna mengetik lagi)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}