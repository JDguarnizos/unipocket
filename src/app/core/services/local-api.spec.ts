import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalApi } from './local-api';

describe('LocalApi', () => {
  let service: LocalApi;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocalApi);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads the goal before adding contributions and marks it completed at its target', () => {
    service.registrarAporteMetaAhorro(1, 'fondo de emergencia', 25);

    httpTestingController.expectOne('local-auth-api/metas.json').flush([
      {
        idUsuario: 1,
        nombre: 'Fondo de emergencia',
        listaAportes: [150],
        valorObjetivo: 200,
        fechaLimite: '2027-01-01T00:00:00.000Z',
        completado: false,
      },
    ]);

    expect(service.metasAhorro()[0].listaAportes).toEqual([150, 25]);
    expect(service.metasAhorro()[0].completado).toBe(false);

    service.registrarAporteMetaAhorro(1, 'FONDO DE EMERGENCIA', 25);

    expect(service.metasAhorro()[0].listaAportes).toEqual([150, 25, 25]);
    expect(service.metasAhorro()[0].completado).toBe(true);
    httpTestingController.verify();
  });
});
