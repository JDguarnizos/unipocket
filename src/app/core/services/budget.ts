import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BudgetData } from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class Budget {
  // Ajusta la URL de la API local o archivo JSON que te compartió Juan
  private apiUrl = 'http://localhost:3000/api/budget'; 

  constructor(private http: HttpClient) {}

  // Método que retorna un Observable puro sin async/await
  getBudgetData(): Observable<BudgetData> {
    return this.http.get<BudgetData>(this.apiUrl);
  }
}