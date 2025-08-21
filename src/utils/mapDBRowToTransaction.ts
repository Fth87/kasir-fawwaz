import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbRowToTransaction(tx: any): Transaction | null {
  const customer = tx.customer || tx.customers || {};

  const commonData = {
    id: tx.id,
    date: tx.created_at,
    customerName: tx.customer_name || customer.name,
    customerId: tx.customer_id,
    total_amount: tx.total_amount,
  };

  const details = tx.details || {};

  switch (tx.type) {
    case 'sale':
      return {
        ...commonData,
        type: 'sale',
        grandTotal: commonData.total_amount,
        paymentMethod: tx.payment_method || details.paymentMethod,
        items: details.items ?? [],
        discountType: tx.discount_type || details.discountType,
        discountValue: tx.discount_value || details.discountValue,
        discountAmount: tx.discount_amount || details.discountAmount,
        cashTendered: tx.cash_tendered || details.cashTendered,
        change: tx.change || details.change,
      } as SaleTransaction;

    case 'service':
      return {
        ...commonData,
        type: 'service',
        serviceFee: commonData.total_amount,
        serviceName: details.serviceName,
        device: details.device,
        issueDescription: details.issueDescription,
        status: details.status,
        partsCost:
          typeof details.partsCost === 'string'
            ? parseFloat(details.partsCost)
            : (details.partsCost ?? 0),
        progressNotes: details.progressNotes ?? [],
        customerPhone: customer.phone || details.customerPhone,
        customerAddress: customer.address || details.customerAddress,
      } as ServiceTransaction;

    case 'expense':
      return {
        ...commonData,
        type: 'expense',
        amount: commonData.total_amount,
        description: details.description,
        category: details.category,
      } as ExpenseTransaction;

    default:
      console.warn(`Unknown transaction type: ${tx.type}`);
      return null;
  }
}
