import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSettingsComponent } from './game-settings.component';
import { defaultSettings }  from '../game-logic/game-logic.component';

describe('GameSettingsComponent', () => {
    let component: GameSettingsComponent;
    let fixture: ComponentFixture<GameSettingsComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                GameSettingsComponent,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(GameSettingsComponent);
        component = fixture.componentInstance;
        component.gameSettingsObj = defaultSettings;
        fixture.detectChanges();
    });
    
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
