import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GameLogicComponent, GuessObj, GuessLineObj, EXACT, WRONG, NOTUSE, UNKNOWN } from './game-logic.component';
import { EXACTBIT, WRONGBIT, NOTUSEBIT } from './game-logic.component';
import { HintHandler } from './HintHandler';

describe('GameLogicComponent', () => {
    let c: GameLogicComponent;
    let fixture: ComponentFixture<GameLogicComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameLogicComponent],
            providers: [
                provideHttpClient(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameLogicComponent);
        c = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(c).toBeTruthy();
    });

    describe('NotInPool Tests', () => {
        beforeEach(() => {
        });

        it('Simple posMap values test',  () => {
            c.answer = 'FLAME';
            c.revealPos = 4;
            c.revealChar = 'E';
            const guess: string = 'ELROY';
            const posMap: number[] = c.doCompare(guess, c.answer);
            expect(posMap).toEqual([WRONG, EXACT, NOTUSE, NOTUSE, NOTUSE]);
        });
        
        it('Simple formatGuess test',  () => {
            c.answer = 'FLAME';
            c.revealPos = 4;
            c.revealChar = 'E';
            const guess = 'BROKE';
            const posMap: number[] = c.doCompare(guess, c.answer);
            const guessObj: GuessObj = {guess: guess, index: 0, posMap:posMap};
            const guessLine: GuessLineObj = c.formatGuess(guessObj, true);
            expect(guessLine.chars.length).toEqual(guess.length);
        });

        class PoolTest {
            constructor(readonly notmark: boolean,
                        readonly ans: string,
                        readonly guess: string,
                        readonly rpos: number,
                        readonly expnots: string
            ) {}
        }
            
        const tests: PoolTest[] = [
            new PoolTest(false, 'FLAME', 'BROKE', 4, 'BROK'),
            new PoolTest(true,  'FLAME', 'BROKE', 4, 'BROK'),
            new PoolTest(false, 'FLAME', 'BEROK', 4, 'BROK'),
            new PoolTest(true,  'FLAME', 'BEROK', 4, 'BROK'),
            new PoolTest(false, 'FLAME', 'FRAME', 4, 'R'),
            new PoolTest(false, 'FLAME', 'BEEOK', 4, 'BOK'),
            new PoolTest(true,  'FLAME', 'BEEOK', 4, 'BOK'),
            new PoolTest(true,  'FLAME', 'BEROK', 4, 'BROK'),
            new PoolTest(true,  'FLAME', 'FRAME', 4, ''),
            new PoolTest(false, 'CREME', 'BEEOK', 4, 'BOK'),
            new PoolTest(true,  'CREME', 'BEEOK', 4, ''),
            new PoolTest(false, 'FLAME', 'BROKE', -1, 'BROK'),
            new PoolTest(true,  'FLAME', 'BROKE', -1, ''),
        ];
        
            
        tests.slice(0).forEach( (test) => {
            console.log('test', JSON.stringify(test));
            it(`notInPool test for ${JSON.stringify(test)} to be correct`,  () => {
                c.notInPool = new Map();
                c.answer = test.ans;
                c.revealPos = test.rpos;
                c.revealChar = (test.rpos === -1 ? '' : test.ans[test.rpos]);
                c.settings.noMarkGuessChars = test.notmark;
                c.hintHandler = HintHandler.getHintHandler(c);
                const posMap: number[] = c.doCompare(test.guess, c.answer);
                const guessObj: GuessObj = {guess: test.guess, index: 0, posMap:posMap};
                console.log('guess: ', JSON.stringify(guessObj));
                const guessLine: GuessLineObj = c.formatGuess(guessObj!, true);
                console.log('guessLine: ', JSON.stringify(guessLine));
                expect(c.notInPool.size).toBe(test.expnots.length);
                console.log('map Keys:', Array.from(c.notInPool.keys()));
                [...test.expnots].forEach( (ch) => {
                    expect(c.notInPool.get(ch)).toBe(1);
                });
            });
        });
    });

    describe('Legality Tests', () => {
        beforeEach(() => {
        });

        class LegalTest {
            constructor(readonly notmark: boolean,
                        readonly hintUse: number,
                        readonly ans: string,
                        readonly oldGuess: string,
                        readonly guess: string,
                        readonly rpos: number,
                        readonly exp: boolean
            ) {}
        }

        const E = EXACTBIT;
        const EW = EXACTBIT+WRONGBIT;
        const EWN = EXACTBIT+WRONGBIT + NOTUSEBIT;
        
        const legalTests: LegalTest[] = [
            // easy one with no hint policy everything passes
            new LegalTest(false, 0, 'FLAME', 'BROKE', 'BLOKE', 4, true),
            new LegalTest(true,  0, 'FLAME', 'BROKE', 'BLOKE', 4, true),
            new LegalTest(true,  0, 'FLAME', 'BROKE', 'BROKY', 4, true),
            // EXACTBIT policy
            new LegalTest(false, E, 'FLAME', 'BROKE', 'BLOKE', 4, true),
            new LegalTest(false, E, 'FLAME', 'BROKE', 'BLECK', 4, false),
            // this one passes because "must re-use green" doesn't apply to letter B for BRAKE/BLAME compare
            // because B was not green in BRAKE
            new LegalTest(false, E, 'FLAME', 'BRAKE', 'BLAME', 4, true),
            new LegalTest(true,  E, 'FLAME', 'BROKE', 'BLOKE', 4, false),
            // 1 green for each (the fact that the revealchar is moved is not significant, does not affect green count)
            new LegalTest(true,  E, 'FLAME', 'BROKE', 'BLECK', 4, true),
            // too many greens in this one
            // it is slightly strange that this fails but if marking guess characters it passes (see above)
            new LegalTest(true,  E, 'FLAME', 'BRAKE', 'BLAME', 4, false),
            // get rid of B green, then it passes
            new LegalTest(true,  E, 'FLAME', 'BRAKE', 'CLAME', 4, true),
            // correct answer must always be legal
            new LegalTest(true,  E, 'FLAME', 'BRAKE', 'FLAME', 4, true),
            
            
            // EXACTBIT+WRONGBIT (Green+Yellow) policy (only applies to notmark=false)
            new LegalTest(false, EW, 'FLAME', 'BROKE', 'BLOKE', 4, true),
            new LegalTest(false, EW, 'FLAME', 'BROKE', 'BLECK', 4, false),
            new LegalTest(false, EW, 'FLAME', 'BRAKE', 'BLAME', 4, true),
            // here F in BRAFE will be yellow so must be reused, which it is not in BLAME
            new LegalTest(false, EW, 'FLAME', 'BRAFE', 'BLAME', 4, false),
            // here F is reused so OK (doesn't matter that it is still in wrong place)
            new LegalTest(false, EW, 'FLAME', 'BRAFE', 'BFADE', 4, true),
            // here also (and now in right place)
            new LegalTest(false, EW, 'FLAME', 'BRAFE', 'FRADE', 4, true),
            new LegalTest(false, EW, 'FLAME', 'PARKE', 'AWRAE', 4, true),
            // char 2 must not be A
            new LegalTest(false, EW, 'FLAME', 'PARKE', 'PARDE', 4, false),
            
            // ALLBITS (Green+Yellow+White) policy
            new LegalTest(false, EWN, 'FLAME', 'BROKE', 'FLAME', 4, true),
            // chr 1 must not be B, chr 3 must not be O, chr 4 must not be K, see BROKE
            new LegalTest(false, EWN, 'FLAME', 'BROKE', 'BLOKE', 4, false),
            new LegalTest(false, EWN, 'FLAME', 'BROKE', 'BLECK', 4, false),
            new LegalTest(false, EWN, 'FLAME', 'BRAKE', 'BLAME', 4, false),
            // here F in BRAFE will be yellow so must be reused, which it is not in BLAME
            new LegalTest(false, EWN, 'FLAME', 'BRAFE', 'BLAME', 4, false),
            // here F is reused so (still in wrong place but that's OK), but chr 1 cannot be B
            new LegalTest(false, EWN, 'FLAME', 'BRAFE', 'BFADE', 4, false),
            // char 2 must not be R    (no R in answer)
            new LegalTest(false, EWN, 'FLAME', 'BRAFE', 'FRADE', 4, false),
            // char 3 must not be A
            new LegalTest(false, EWN, 'FLAME', 'PARKE', 'AWRAE', 4, false),
            // char 2 must not be A
            new LegalTest(false, EWN, 'FLAME', 'PARKE', 'PARDE', 4, false),
            // try some things that should be legal
            new LegalTest(false, EWN, 'FLAME', 'BROKE', 'CADGE', 4, true),
            
            // ALLBITS (Green+Yellow+White) policy, with noMark true
            new LegalTest(true, EWN, 'FLAME', 'BROKE', 'FLAME', 4, true),
            // chr 1 must not be B, chr 3 must not be O, chr 4 must not be K, see BROKE
            new LegalTest(true, EWN, 'FLAME', 'BROKE', 'BLOKE', 4, false),
            new LegalTest(true, EWN, 'FLAME', 'BROKE', 'BLECK', 4, false),
            new LegalTest(true, EWN, 'FLAME', 'BRAKE', 'BLAME', 4, false),
            // guess BRAFE requires green count to be 2, not 3 and yellow count to be 1, not 0
            new LegalTest(true, EWN, 'FLAME', 'BRAFE', 'BLAME', 4, false),
            // guess BRAFE requires green count to be 2, not 3
            new LegalTest(true, EWN, 'FLAME', 'BRAFE', 'BFADE', 4, false),
            // guess BRAFE requires green count to be 2, not 3

            new LegalTest(true, EWN, 'FLAME', 'BRAFE', 'FRADE', 4, false),
            // char 3 must not be A
            new LegalTest(true, EWN, 'FLAME', 'PARKE', 'AWRAE', 4, false),
            // char 2 must not be A
            new LegalTest(true, EWN, 'FLAME', 'PARKE', 'PARDE', 4, false),
            // try some things that should be legal
            new LegalTest(true, EWN, 'FLAME', 'BROKE', 'CADGE', 4, true),

        ];
        
        legalTests.slice(0).forEach( (test) => {
            fit(`Clue Legality test for ${JSON.stringify(test)} to be correct`,  () => {
                c.answer = test.ans;
                c.revealPos = test.rpos;
                c.revealChar = (test.rpos === -1 ? '' : test.ans[test.rpos]);
                c.settings.noMarkGuessChars = test.notmark;
                c.settings.hintUsePolicy = test.hintUse;
                c.hintHandler = HintHandler.getHintHandler(c);
                const oldPosMap: number[] = c.doCompare(test.oldGuess, c.answer);
                const oldGuessObj: GuessObj = {guess: test.oldGuess, index: 0, posMap:oldPosMap};
                c.guessList.push(oldGuessObj);
                // just so we can display later (this also gets computed in checkUseAllHints)
                const posMapOldVsNew: number[] = c.doCompare(test.oldGuess, test.guess);

                const message: string | null = c.hintHandler.checkUseAllHints(test.guess);
                const isLegal: boolean = (message === null);
                expect(isLegal).toBe(test.exp);
                if (!isLegal) console.log('legality message', message!);
                if (isLegal !== test.exp) console.log(`PosMaps: old=${oldPosMap}, oldvnew=${posMapOldVsNew}`);
            });
        });
    });

});
