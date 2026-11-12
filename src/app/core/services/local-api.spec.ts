import { TestBed } from '@angular/core/testing';
import { LocalApi } from './local-api';

describe('LocalApi', () => {
  let service: LocalApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
