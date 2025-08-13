import { ReceiptData, SalesReceiptData, ServiceReceiptData } from '@/types/receipt';

export class ESCPOSPrinter {
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;

  private static enc(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  private static cat(...arrays: Uint8Array[]): Uint8Array {
    const result = arrays.reduce((acc, arr) => {
      acc.push(...arr);
      return acc;
    }, [] as number[]);
    return new Uint8Array(result);
  }

  static init(): Uint8Array {
    return Uint8Array.from([this.ESC, 0x40]);
  }

  static codepage(n: number): Uint8Array {
    return Uint8Array.from([this.ESC, 0x74, n]);
  }

  // 0: Kiri, 1: Tengah, 2: Kanan
  static align(n: number): Uint8Array {
    return Uint8Array.from([this.ESC, 0x61, n]);
  }

  static bold(on: boolean): Uint8Array {
    return Uint8Array.from([this.ESC, 0x45, on ? 1 : 0]);
  }

  static size(w: number, h: number): Uint8Array {
    return Uint8Array.from([this.GS, 0x21, (w << 4) | h]);
  }

  static lf(): Uint8Array {
    return Uint8Array.from([0x0a]);
  }

  static feed(n: number): Uint8Array {
    return Uint8Array.from([this.ESC, 0x64, n]);
  }

  static cut(): Uint8Array {
    return Uint8Array.from([this.GS, 0x56, 0x00]);
  }

  static hr(width = 32): Uint8Array {
    return this.enc('-'.repeat(width));
  }

  static formatCurrency(amount: number): string {
    return 'Rp ' + amount.toLocaleString('id-ID');
  }

  static qrALT(text: string, size = 5, ec: 'L' | 'M' | 'Q' | 'H' = 'M'): Uint8Array {
    const ecMap = { L: 48, M: 49, Q: 50, H: 51 };
    const ecValue = ecMap[ec] ?? 49;
    const qrSize = Math.min(10, Math.max(3, size));
    const data = this.enc(text);

    const model = Uint8Array.from([this.GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    const setSize = Uint8Array.from([this.GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x43, qrSize, 0x00]);
    const setEC = Uint8Array.from([this.GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x45, ecValue, 0x00]);

    const len = data.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    const store = this.cat(Uint8Array.from([this.GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]), data);
    const print = Uint8Array.from([this.GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

    return this.cat(this.lf(), model, setSize, setEC, store, print, this.lf());
  }

  static buildService(data: ServiceReceiptData, width = 32): Uint8Array {
    let output = this.init();
    output = this.cat(output, this.codepage(0));

    // Header dengan icon dan nama toko
    output = this.cat(output, this.align(1), this.bold(true), this.size(0, 1));
    output = this.cat(output, this.enc(`${data.store.name}`), this.lf());
    output = this.cat(output, this.bold(false), this.size(0, 0), this.enc(data.store.addr), this.lf());
    if (data.store.phone) {
      output = this.cat(output, this.enc(data.store.phone), this.lf());
    }
    output = this.cat(output, this.hr(width), this.lf());

    // Tanggal Transaksi
    output = this.cat(output, this.align(0), this.bold(true), this.enc('TANGGAL TRANSAKSI'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.invoice.datetime), this.lf());
    output = this.cat(output, this.bold(true), this.enc('ID TRANSAKSI'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.invoice.id), this.lf());

    output = this.cat(output, this.hr(width), this.lf());

    // Pelanggan
    output = this.cat(output, this.bold(true), this.enc('PELANGGAN'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.customer.name), this.lf(), this.lf());

    // Layanan Servis
    output = this.cat(output, this.bold(true), this.enc('LAYANAN SERVIS'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.service.name), this.lf());
    if (data.service.description) {
      output = this.cat(output, this.enc(data.service.description), this.lf());
    }

    output = this.cat(output, this.hr(width), this.lf());

    // Biaya Servis
    // output = this.cat(output, this.bold(true), this.size(0, 1));
    // const costLine = 'Biaya Servis';
    // const costAmount = this.formatCurrency(data.service.cost);
    // const spaces = Math.max(1, width - costLine.length - costAmount.length);
    // output = this.cat(output, this.enc(costLine + ' '.repeat(spaces) + costAmount), this.lf());
    // output = this.cat(output, this.bold(false), this.size(0, 0), this.lf());
    // output = this.cat(output, this.hr(width), this.lf());

    // Status tracking section
    output = this.cat(output, this.align(1), this.bold(true), this.enc('LACAK STATUS SERVIS'), this.lf(), this.bold(false));

    // QR Code
    if (data.tracking?.url) {
      output = this.cat(output, this.qrALT(data.tracking.url, data.qr?.size || 5, data.qr?.ec || 'M'));
    }

    // URL tracking
    // if (data.tracking?.url) {
    //   output = this.cat(output, this.align(1), this.enc(data.tracking.url), this.lf(), this.lf());
    // }

    output = this.cat(output, this.hr(width), this.lf());

    // Footer
    output = this.cat(output, this.align(1), this.enc(data.footer || 'Terima kasih atas kepercayaan Anda!'), this.lf());

    output = this.cat(output, this.feed(3), this.cut());
    return output;
  }

  static buildSales(data: SalesReceiptData, width = 32): Uint8Array {
    let output = this.init();
    output = this.cat(output, this.codepage(0));

       // Header dengan icon dan nama toko
    output = this.cat(output, this.align(1), this.bold(true), this.size(0, 1));
    output = this.cat(output, this.enc(`${data.store.name}`), this.lf());
    output = this.cat(output, this.bold(false), this.size(0, 0), this.enc(data.store.addr), this.lf());
    if (data.store.phone) {
      output = this.cat(output, this.enc(data.store.phone), this.lf());
    }
    output = this.cat(output, this.hr(width), this.lf());

    // Tanggal Transaksi
    output = this.cat(output, this.align(0), this.bold(true), this.enc('TANGGAL TRANSAKSI'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.invoice.datetime), this.lf());
    output = this.cat(output, this.bold(true), this.enc('ID TRANSAKSI'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.invoice.id), this.lf());

    output = this.cat(output, this.hr(width), this.lf());


    // Pelanggan
    output = this.cat(output, this.bold(true), this.enc('PELANGGAN'), this.lf());
    output = this.cat(output, this.bold(false), this.enc(data.customer.name), this.lf(), this.lf());

    // Barang/Items
    output = this.cat(output, this.bold(true), this.enc('BARANG'), this.lf());
    output = this.cat(output, this.bold(false));

    for (const item of data.items) {
      const itemLine = `${item.name} (x${item.qty})`;
      const itemPrice = this.formatCurrency(item.price * item.qty);
      const spaces = Math.max(1, width - itemLine.length - itemPrice.length);
      output = this.cat(output, this.enc(itemLine + ' '.repeat(spaces) + itemPrice), this.lf());
    }

    output = this.cat(output, this.lf());
    output = this.cat(output, this.hr(width), this.lf());

    // Grand Total
    output = this.cat(output, this.bold(true), this.size(0, 1));
    const totalLine = 'Grand Total';
    const totalAmount = this.formatCurrency(data.totals.total);
    const totalSpaces = Math.max(1, width - totalLine.length - totalAmount.length);
    output = this.cat(output, this.enc(totalLine + ' '.repeat(totalSpaces) + totalAmount), this.lf());
    output = this.cat(output, this.bold(false), this.size(0, 0), this.lf());

    output = this.cat(output, this.hr(width), this.lf());

    // Payment info (if cash payment)
    if (data.payment?.cash) {
      output = this.cat(output, this.enc(`Tunai: ${this.formatCurrency(data.payment.cash)}`), this.lf());
      if (data.payment.change) {
        output = this.cat(output, this.enc(`Kembali: ${this.formatCurrency(data.payment.change)}`), this.lf());
      }
      output = this.cat(output, this.lf());
    }

    // Footer
    output = this.cat(output, this.align(1), this.enc(data.footer || 'Terima kasih atas kepercayaan Anda!'), this.lf());

    output = this.cat(output, this.feed(3), this.cut());
    return output;
  }

  static build(data: ReceiptData, width = 32): Uint8Array {
    if ('service' in data) {
      return this.buildService(data as ServiceReceiptData, width);
    } else {
      return this.buildSales(data as SalesReceiptData, width);
    }
  }

  static toBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }
}
