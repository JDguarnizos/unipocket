import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemMovimiento } from './item-movimiento';

describe('ItemMovimiento', () => {
  let component: ItemMovimiento;
  let fixture: ComponentFixture<ItemMovimiento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemMovimiento],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemMovimiento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
