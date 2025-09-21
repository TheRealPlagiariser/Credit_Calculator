import { Injectable } from '@angular/core';
import { 
  Invoice, 
  InvoiceItem, 
  CreditRequest, 
  CreditCalculation, 
  CreditResult, 
  BillingPeriod 
} from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class CreditCalculationService {

  /**
   * Calculate credit for a customer based on their request
   */
  calculateCredit(invoice: Invoice, creditRequest: CreditRequest): CreditResult {
    const calculations: CreditCalculation[] = [];
    
    // Process each item to be credited
    for (const itemId of creditRequest.itemsToCredit) {
      const item = invoice.items.find(i => i.id === itemId);
      if (item) {
        const calculation = this.calculateItemCredit(item, creditRequest, invoice.taxRate);
        calculations.push(calculation);
      }
    }

    const totalCredit = calculations.reduce((sum, calc) => sum + calc.creditAmount, 0);
    const totalTax = calculations.reduce((sum, calc) => sum + calc.taxOnCredit, 0);
    const finalCreditAmount = totalCredit + totalTax;

    return {
      request: creditRequest,
      calculations,
      totalCredit,
      totalTax,
      finalCreditAmount,
      calculationDate: new Date()
    };
  }

  /**
   * Calculate credit for a single invoice item
   */
  private calculateItemCredit(
    item: InvoiceItem, 
    creditRequest: CreditRequest, 
    taxRate: number
  ): CreditCalculation {
    const originalAmount = item.unitPrice * item.quantity;
    
    let creditAmount: number;
    let proratedAmount: number;
    let creditPercentage: number;
    let daysInBillingPeriod: number;
    let daysCredited: number;

    if (creditRequest.isPartialCredit && creditRequest.creditStartDate && creditRequest.creditEndDate) {
      // Calculate prorated credit
      const billingPeriodDays = this.calculateDaysBetween(item.serviceStartDate, item.serviceEndDate);
      const creditDays = this.calculateDaysBetween(creditRequest.creditStartDate, creditRequest.creditEndDate);
      
      daysInBillingPeriod = billingPeriodDays;
      daysCredited = creditDays;
      creditPercentage = creditDays / billingPeriodDays;
      proratedAmount = originalAmount * creditPercentage;
      creditAmount = proratedAmount;
    } else {
      // Full credit
      daysInBillingPeriod = this.calculateDaysBetween(item.serviceStartDate, item.serviceEndDate);
      daysCredited = daysInBillingPeriod;
      creditPercentage = 1;
      proratedAmount = originalAmount;
      creditAmount = originalAmount;
    }

    const taxOnCredit = creditAmount * (taxRate / 100);

    return {
      originalAmount,
      proratedAmount,
      creditAmount,
      taxOnCredit,
      totalCreditWithTax: creditAmount + taxOnCredit,
      creditPercentage,
      daysInBillingPeriod,
      daysCredited
    };
  }

  /**
   * Calculate prorated amount for a service based on actual usage period
   */
  calculateProratedAmount(
    monthlyRate: number,
    serviceStartDate: Date,
    serviceEndDate: Date,
    billingPeriod: BillingPeriod = BillingPeriod.MONTHLY
  ): number {
    const totalDays = this.calculateDaysBetween(serviceStartDate, serviceEndDate);
    const periodDays = this.getBillingPeriodDays(billingPeriod, serviceStartDate);
    
    const dailyRate = monthlyRate / periodDays;
    return dailyRate * totalDays;
  }

  /**
   * Calculate tax amount for a given amount
   */
  calculateTax(amount: number, taxRate: number): number {
    return amount * (taxRate / 100);
  }

  /**
   * Calculate days between two dates (inclusive)
   */
  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  }

  /**
   * Get number of days in a billing period
   */
  private getBillingPeriodDays(period: BillingPeriod, referenceDate: Date): number {
    const date = new Date(referenceDate);
    
    switch (period) {
      case BillingPeriod.DAILY:
        return 1;
      case BillingPeriod.MONTHLY:
        return this.getDaysInMonth(date.getFullYear(), date.getMonth());
      case BillingPeriod.QUARTERLY:
        return this.getDaysInQuarter(date);
      case BillingPeriod.YEARLY:
        return this.isLeapYear(date.getFullYear()) ? 366 : 365;
      default:
        return 30; // Default to 30 days
    }
  }

  /**
   * Get days in a specific month
   */
  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Get days in a quarter for a given date
   */
  private getDaysInQuarter(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3);
    
    const quarterStartMonth = quarter * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    let days = 0;
    for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
      days += this.getDaysInMonth(year, m);
    }
    
    return days;
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Create a sample invoice for testing purposes
   */
  createSampleInvoice(): Invoice {
    const serviceStartDate = new Date('2024-01-01');
    const serviceEndDate = new Date('2024-01-31');
    
    return {
      id: 'INV-001',
      customer: {
        id: 'CUST-001',
        name: 'Sample Customer',
        email: '',
        accountNumber: ''
      },
      invoiceNumber: 'SAMPLE-001',
      invoiceDate: new Date('2024-01-01'),
      dueDate: new Date('2024-01-15'),
      items: [
        {
          id: 'ITEM-001',
          description: 'High-Speed Internet Service - 100 Mbps',
          unitPrice: 79.99,
          quantity: 1,
          serviceStartDate,
          serviceEndDate,
          isProrated: false
        },
        {
          id: 'ITEM-002',
          description: 'Static IP Address',
          unitPrice: 15.00,
          quantity: 1,
          serviceStartDate,
          serviceEndDate,
          isProrated: false
        }
      ],
      subtotal: 94.99,
      taxRate: 13.0,
      taxAmount: 8.07,
      total: 103.06
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(decimal: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(decimal);
  }
}