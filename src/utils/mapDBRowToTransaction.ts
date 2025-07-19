import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';

export function mapDbRowToTransaction(tx: any): Transaction | null {
  const commonData = {
    id: tx.id,
    date: tx.created_at,
    customerName: tx.customer_name,
    total_amount: tx.total_amount,
  };

  const details = tx.details || {};

  switch (tx.type) {
    case 'sale':
      return {
        ...commonData,
        type: 'sale',
        grandTotal: commonData.total_amount,
        paymentMethod: details.paymentMethod,
        items: details.items ?? [],
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
        progressNotes: details.progressNotes ?? [],
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
