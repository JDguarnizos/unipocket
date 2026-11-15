export interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export interface BudgetData {
  totalIncome: number;
  totalExpenses: number;
  remainingBudget: number;
  transactions: Transaction[];
}