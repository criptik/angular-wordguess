import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GameLogicComponent } from './game-logic.component';

describe('GameLogicComponent', () => {
  let component: GameLogicComponent;
  let fixture: ComponentFixture<GameLogicComponent>;

  beforeEach(async () => {
      await TestBed.configureTestingModule({
          imports: [GameLogicComponent],
          providers: [
              provideHttpClient(),
          ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameLogicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
