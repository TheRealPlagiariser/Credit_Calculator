import { Component, signal } from '@angular/core';
import { CreditCalculatorComponent } from './components/credit-calculator.component';

@Component({
  selector: 'app-root',
  imports: [CreditCalculatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('creditcalculator');
}
