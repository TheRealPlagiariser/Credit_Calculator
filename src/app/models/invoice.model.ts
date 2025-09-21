export interface Customer {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  serviceStartDate: Date;
  serviceEndDate: Date;
  isProrated?: boolean;
}

export interface Invoice {
  id: string;
  customer: Customer;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface CreditRequest {
  invoiceId: string;
  customerId: string;
  creditReason: string;
  requestDate: Date;
  itemsToCredit: string[]; // Array of InvoiceItem IDs
  creditStartDate?: Date;
  creditEndDate?: Date;
  isPartialCredit: boolean;
}

export interface CreditCalculation {
  originalAmount: number;
  proratedAmount: number;
  creditAmount: number;
  taxOnCredit: number;
  totalCreditWithTax: number;
  creditPercentage: number;
  daysInBillingPeriod: number;
  daysCredited: number;
}

export interface CreditResult {
  request: CreditRequest;
  calculations: CreditCalculation[];
  totalCredit: number;
  totalTax: number;
  finalCreditAmount: number;
  calculationDate: Date;
}

export enum BillingPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  DAILY = 'daily'
}

export interface ServicePlan {
  id: string;
  name: string;
  monthlyRate: number;
  billingPeriod: BillingPeriod;
  taxable: boolean;
}