import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TarjetaResumenComponent } from './tarjeta-resumen';

describe('TarjetaResumenComponent', () => {
  let component: TarjetaResumenComponent;
  let fixture: ComponentFixture<TarjetaResumenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaResumenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaResumenComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
