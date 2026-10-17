import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemMovimientoComponent } from './item-movimiento';

describe('ItemMovimientoComponent', () => {
  let component: ItemMovimientoComponent;
  let fixture: ComponentFixture<ItemMovimientoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemMovimientoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemMovimientoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
