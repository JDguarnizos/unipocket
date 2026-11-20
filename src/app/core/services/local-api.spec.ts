import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalApi } from './local-api';

// Las pruebas de metas de ahorro se movieron a metas-api.spec.ts junto con su lógica.
describe('LocalApi', () => {
  let service: LocalApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocalApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
