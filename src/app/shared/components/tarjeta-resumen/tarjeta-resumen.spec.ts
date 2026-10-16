import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TarjetaResumen } from './tarjeta-resumen';

describe('TarjetaResumen', () => {
  let component: TarjetaResumen;
  let fixture: ComponentFixture<TarjetaResumen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaResumen],
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaResumen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
