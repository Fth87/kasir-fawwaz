import { useState, useCallback } from 'react';
import { ReceiptData } from '../types/receipt';
import { ESCPOSPrinter } from '../utils/printer';

export function usePrinter() {
  const [isLoading, setIsLoading] = useState(false);

  const printReceipt = useCallback((data: ReceiptData) => {
    setIsLoading(true);
    
    try {
      const bytes = ESCPOSPrinter.build(data, 32);
      const base64Data = ESCPOSPrinter.toBase64(bytes);
      const rawbtUrl = `rawbt:base64,${base64Data}`;
      const intentUrl = `intent:${encodeURI(`data:application/octet-stream;base64,${base64Data}`)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
      
      // Try RawBT first
      window.location.href = rawbtUrl;
      
      // Fallback to intent after delay
      setTimeout(() => {
        window.location.href = intentUrl;
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Print error:', error);
      setIsLoading(false);
    }
  }, []);

  return { printReceipt, isLoading };
}