import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotonGenerico } from './boton-generico';

describe('BotonGenerico', () => {
  let component: BotonGenerico;
  let fixture: ComponentFixture<BotonGenerico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotonGenerico],
    }).compileComponents();

    fixture = TestBed.createComponent(BotonGenerico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
