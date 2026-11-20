import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MetasApi } from './metas-api';

// Pruebas movidas desde local-api.spec.ts (misma prueba, ahora sobre MetasApi).
describe('MetasApi', () => {
  let service: MetasApi;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetasApi);
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
        listaAportes: [{ monto: 150, fechaAporte: null }],
        valorObjetivo: 200,
        fechaLimite: '2027-01-01T00:00:00.000Z',
        completado: false,
      },
    ]);

    expect(service.metasAhorro()[0].listaAportes.map(({ monto }) => monto)).toEqual([150, 25]);
    expect(typeof service.metasAhorro()[0].listaAportes[1].fechaAporte).toBe('string');
    expect(service.metasAhorro()[0].completado).toBe(false);
    service.calcularProgresoMetaAhorro(1, 'Fondo de emergencia').subscribe((progreso) => {
      expect(progreso).toBe(87.5);
    });

    service.registrarAporteMetaAhorro(1, 'FONDO DE EMERGENCIA', 25);

    expect(service.metasAhorro()[0].listaAportes.map(({ monto }) => monto)).toEqual([150, 25, 25]);
    expect(
      service.metasAhorro()[0].listaAportes.slice(1).every(({ fechaAporte }) => typeof fechaAporte === 'string'),
    ).toBe(true);
    expect(service.metasAhorro()[0].completado).toBe(true);
    httpTestingController.verify();
  });
});
