import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface CreditCalculation {
  totalBillingDays: number;
  daysWithoutService: number;
  dailyRate: number;
  creditAmount: number;
  taxOnCredit: number;
  totalCreditWithTax: number;
}

@Component({
  selector: 'app-credit-calculator',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './credit-calculator.component.html',
  styleUrl: './credit-calculator.component.scss'
})
export class CreditCalculatorComponent {
  // Form data signals
  invoiceStartDate = signal('');
  invoiceEndDate = signal('');
  pricePaid = signal(0);
  actualServiceStartDate = signal('');
  taxRate = signal(13.0);
  
  // Calculation results
  isCalculating = signal(false);
  calculationResult = signal<CreditCalculation | null>(null);

  constructor() {
    // Load sample data for testing
    this.loadSampleData();
  }

  loadSampleData() {
    // Set sample dates - invoice period vs actual service start
    const today = new Date();
    const invoiceStart = new Date(today.getFullYear(), today.getMonth(), 1); // First of month
    const invoiceEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last of month
    const serviceStart = new Date(today.getFullYear(), today.getMonth(), 10); // Service started 10th

    this.invoiceStartDate.set(invoiceStart.toISOString().split('T')[0]);
    this.invoiceEndDate.set(invoiceEnd.toISOString().split('T')[0]);
    this.actualServiceStartDate.set(serviceStart.toISOString().split('T')[0]);
    this.pricePaid.set(79.99);
  }

  calculateCredit() {
    if (!this.invoiceStartDate() || !this.invoiceEndDate() || !this.actualServiceStartDate() || this.pricePaid() <= 0) {
      alert('Please fill in all required fields.');
      return;
    }

    const invoiceStart = new Date(this.invoiceStartDate());
    const invoiceEnd = new Date(this.invoiceEndDate());
    const serviceStart = new Date(this.actualServiceStartDate());

    // Validate dates
    if (invoiceStart >= invoiceEnd) {
      alert('Invoice end date must be after start date.');
      return;
    }

    if (serviceStart < invoiceStart) {
      alert('Service start date cannot be before invoice start date.');
      return;
    }

    if (serviceStart > invoiceEnd) {
      alert('Service start date cannot be after invoice end date.');
      return;
    }

    this.isCalculating.set(true);

    // Calculate total billing period days
    const totalBillingDays = this.calculateDaysBetween(invoiceStart, invoiceEnd);

    // Calculate days without service (from invoice start to actual service start)
    const daysWithoutService = this.calculateDaysBetween(invoiceStart, serviceStart) - 1; // -1 because service started on the service start date

    // Calculate daily rate
    const dailyRate = this.pricePaid() / totalBillingDays;

    // Calculate credit amount for days without service
    const creditAmount = dailyRate * Math.max(0, daysWithoutService);

    // Calculate tax on credit
    const taxOnCredit = creditAmount * (this.taxRate() / 100);

    // Total credit with tax
    const totalCreditWithTax = creditAmount + taxOnCredit;

    const result: CreditCalculation = {
      totalBillingDays,
      daysWithoutService: Math.max(0, daysWithoutService),
      dailyRate,
      creditAmount,
      taxOnCredit,
      totalCreditWithTax
    };

    this.calculationResult.set(result);
    this.isCalculating.set(false);
  }

  clearCalculation() {
    this.calculationResult.set(null);
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}