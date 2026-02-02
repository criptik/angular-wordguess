import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GameLogicComponent, GuessObj, GuessLineObj, EXACT, WRONG, NOTUSE, UNKNOWN } from './game-logic.component';
import { HintHandler } from './HintHandler';

describe('GameLogicComponent', () => {
    let component: GameLogicComponent;
    let fixture: ComponentFixture<GameLogicComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameLogicComponent],
            providers: [
                provideHttpClient(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameLogicComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('NotInPool Tests', () => {
        let posMap: number[] = [];
        let guessObj: GuessObj | undefined = undefined;
        let guessLine: GuessLineObj | undefined = undefined;
        beforeEach(async () => {
            const c: GameLogicComponent = component;
            c.revealPos = 4;
            c.revealChar = 'E';
            let guess = 'BROKE';
            c.notInPool = new Map();
        });

        it('Simple posMap values test',  () => {
            const c: GameLogicComponent = component;
            c.answer = 'FLAME';
            c.revealPos = 4;
            c.revealChar = 'E';
            const guess = 'BROKE';
            posMap = c.doCompare(guess, c.answer);
            expect(posMap).toEqual([NOTUSE, NOTUSE, NOTUSE, NOTUSE, EXACT]);
        });
        it('Simple formatGuess test',  () => {
            const c: GameLogicComponent = component;
            c.answer = 'FLAME';
            c.revealPos = 4;
            c.revealChar = 'E';
            const guess = 'BROKE';
            posMap = c.doCompare(guess, c.answer);
            guessObj = {guess: guess, index: 0, posMap:posMap};
            guessLine = c.formatGuess(guessObj!, true);
            expect(guessLine!.chars.length).toEqual(guess.length);
        });
        type TestObj = {
            notmark: boolean,
            ans: string,
            guess: string,
            rpos: number,
            expnots: string,
        };
            
        const tests: TestObj[] = [
            {notmark: false, ans: 'FLAME', guess: 'BROKE', rpos:4, expnots: 'BROK'},
            {notmark: true,  ans: 'FLAME', guess: 'BROKE', rpos:4, expnots: 'BROK'},
            {notmark: false, ans: 'FLAME', guess: 'BEROK', rpos:4, expnots: 'BROK'},
            {notmark: true,  ans: 'FLAME', guess: 'BEROK', rpos:4, expnots: 'BROK'},
            {notmark: false, ans: 'FLAME', guess: 'FRAME', rpos:4, expnots: 'R'},
            {notmark: false, ans: 'FLAME', guess: 'BEEOK', rpos:4, expnots: 'BOK'},
            {notmark: true,  ans: 'FLAME', guess: 'BEEOK', rpos:4, expnots: 'BOK'},
            {notmark: true,  ans: 'FLAME', guess: 'BEROK', rpos:4, expnots: 'BROK'},
            {notmark: true,  ans: 'FLAME', guess: 'FRAME', rpos:4, expnots: ''},
            {notmark: false, ans: 'CREME', guess: 'BEEOK', rpos:4, expnots: 'BOK'},
            {notmark: true,  ans: 'CREME', guess: 'BEEOK', rpos:4, expnots: ''},
            {notmark: false, ans: 'FLAME', guess: 'BROKE', rpos:-1, expnots: 'BROK'},
            {notmark: true,  ans: 'FLAME', guess: 'BROKE', rpos:-1, expnots: ''},
        ];
        
            
        tests.slice(12, 13).forEach( (test) => {
            console.log('test', JSON.stringify(test));
            it(`notInPool test for ${JSON.stringify(test)} to be correct`,  () => {
                const c: GameLogicComponent = component;
                c.answer = test.ans;
                c.revealPos = test.rpos;
                c.revealChar = (test.rpos === -1 ? '' : test.ans[test.rpos]);
                c.settings.noMarkGuessChars = test.notmark;
                c.hintHandler = HintHandler.getHintHandler(c);
                posMap = c.doCompare(test.guess, component.answer);
                guessObj = {guess: test.guess, index: 0, posMap:posMap};
                console.log('guess: ', JSON.stringify(guessObj));
                guessLine = c.formatGuess(guessObj!, true);
                console.log('guessLine: ', JSON.stringify(guessLine));
                expect(c.notInPool.size).toBe(test.expnots.length);
                console.log('map Keys:', Array.from(c.notInPool.keys()));
                [...test.expnots].forEach( (ch) => {
                    expect(c.notInPool.get(ch)).toBe(1);
                });
            });
        });
    });
});
