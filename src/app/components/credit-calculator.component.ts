import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface ServiceItem {
  id: number;
  serviceName: string;
  invoiceStartDate: string;
  invoiceEndDate: string;
  pricePaid: number;
  actualServiceStartDate: string;
}

interface CreditCalculation {
  id: number;
  serviceName: string;
  totalBillingDays: number;
  daysWithoutService: number;
  dailyRate: number;
  creditAmount: number;
  taxOnCredit: number;
  totalCreditWithTax: number;
}

interface CombinedCreditResult {
  services: CreditCalculation[];
  totalCreditAmount: number;
  totalTaxOnCredit: number;
  grandTotalWithTax: number;
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
  taxRate = signal(13.0);
  
  // Services array
  services = signal<ServiceItem[]>([]);
  nextServiceId = signal(1);
  
  // Calculation results
  isCalculating = signal(false);
  calculationResult = signal<CombinedCreditResult | null>(null);

  constructor() {
    // Load sample data for testing
    this.loadSampleData();
  }

  loadSampleData() {
    // Set sample dates - different invoice periods for demonstration
    const today = new Date();
    
    // Service 1: Monthly internet service
    const invoiceStart1 = new Date(today.getFullYear(), today.getMonth(), 1); // First of current month
    const invoiceEnd1 = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last of current month
    const serviceStart1 = new Date(today.getFullYear(), today.getMonth(), 10); // Service started 10th

    // Add a sample service showing monthly billing
    this.addService(
      'Internet Service', 
      invoiceStart1.toISOString().split('T')[0],
      invoiceEnd1.toISOString().split('T')[0],
      79.99, 
      serviceStart1.toISOString().split('T')[0]
    );
  }

  addService(
    serviceName: string = '', 
    invoiceStartDate: string = '',
    invoiceEndDate: string = '',
    pricePaid: number = 0, 
    actualServiceStartDate: string = ''
  ) {
    // Get the last service to use as defaults
    const lastService = this.services().length > 0 ? this.services()[this.services().length - 1] : null;
    
    const newService: ServiceItem = {
      id: this.nextServiceId(),
      serviceName: serviceName || '',
      invoiceStartDate: invoiceStartDate || (lastService?.invoiceStartDate || ''),
      invoiceEndDate: invoiceEndDate || (lastService?.invoiceEndDate || ''),
      pricePaid: pricePaid || (lastService?.pricePaid || 0),
      actualServiceStartDate: actualServiceStartDate || (lastService?.actualServiceStartDate || '')
    };
    
    this.services.update(services => [...services, newService]);
    this.nextServiceId.update(id => id + 1);
  }

  removeService(serviceId: number) {
    this.services.update(services => services.filter(s => s.id !== serviceId));
  }

  updateService(serviceId: number, field: keyof ServiceItem, value: any) {
    const currentServices = this.services();
    const updatedServices = currentServices.map(service => 
      service.id === serviceId ? { ...service, [field]: value } : service
    );
    this.services.set(updatedServices);
  }

  // TrackBy function to prevent unnecessary re-rendering
  trackByServiceId(index: number, service: ServiceItem): number {
    return service.id;
  }

  calculateCredit() {
    if (this.services().length === 0) {
      alert('Please add at least one service to calculate credits.');
      return;
    }

    // Validate that all services have required data
    for (const service of this.services()) {
      if (!service.serviceName || !service.invoiceStartDate || !service.invoiceEndDate || 
          !service.actualServiceStartDate || service.pricePaid <= 0) {
        alert(`Please fill in all fields for service: ${service.serviceName || 'Unnamed Service'}`);
        return;
      }

      const invoiceStart = new Date(service.invoiceStartDate);
      const invoiceEnd = new Date(service.invoiceEndDate);

      // Validate dates for this service
      if (invoiceStart >= invoiceEnd) {
        alert(`Invoice end date must be after start date for service: ${service.serviceName}`);
        return;
      }
    }

    this.isCalculating.set(true);

    const serviceCalculations: CreditCalculation[] = [];
    let totalCreditAmount = 0;
    let totalTaxOnCredit = 0;

    // Calculate credit for each service
    for (const service of this.services()) {
      const invoiceStart = new Date(service.invoiceStartDate);
      const invoiceEnd = new Date(service.invoiceEndDate);
      const serviceStart = new Date(service.actualServiceStartDate);

      // Validate service start date against this service's invoice period
      if (serviceStart < invoiceStart) {
        alert(`Service start date for ${service.serviceName} cannot be before its invoice start date.`);
        this.isCalculating.set(false);
        return;
      }

      if (serviceStart > invoiceEnd) {
        alert(`Service start date for ${service.serviceName} cannot be after its invoice end date.`);
        this.isCalculating.set(false);
        return;
      }

      // Calculate total billing period days for this service
      const totalBillingDays = this.calculateDaysBetween(invoiceStart, invoiceEnd);

      // Calculate days without service (from invoice start to actual service start)
      const daysWithoutService = this.calculateDaysBetween(invoiceStart, serviceStart) - 1; // -1 because service started on the service start date

      // Calculate daily rate
      const dailyRate = service.pricePaid / totalBillingDays;

      // Calculate credit amount for days without service
      const creditAmount = dailyRate * Math.max(0, daysWithoutService);

      // Calculate tax on credit
      const taxOnCredit = creditAmount * (this.taxRate() / 100);

      // Total credit with tax for this service
      const totalCreditWithTax = creditAmount + taxOnCredit;

      const serviceCalculation: CreditCalculation = {
        id: service.id,
        serviceName: service.serviceName,
        totalBillingDays,
        daysWithoutService: Math.max(0, daysWithoutService),
        dailyRate,
        creditAmount,
        taxOnCredit,
        totalCreditWithTax
      };

      serviceCalculations.push(serviceCalculation);
      totalCreditAmount += creditAmount;
      totalTaxOnCredit += taxOnCredit;
    }

    const result: CombinedCreditResult = {
      services: serviceCalculations,
      totalCreditAmount,
      totalTaxOnCredit,
      grandTotalWithTax: totalCreditAmount + totalTaxOnCredit
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

  // Helper method for template
  parseFloat(value: string): number {
    return parseFloat(value) || 0;
  }

  getServiceById(id: number): ServiceItem | undefined {
    return this.services().find(s => s.id === id);
  }
}