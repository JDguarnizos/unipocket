import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonGenericoComponent } from './boton-generico';

describe('BotonGenericoComponent', () => {
  let component: BotonGenericoComponent;
  let fixture: ComponentFixture<BotonGenericoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotonGenericoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BotonGenericoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
