import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common'; // or just NgStyle
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { HintHandler } from './HintHandler'
import { GameSettingsComponent } from '../game-settings/game-settings.component';

@Injectable({
  providedIn: 'root'
})
export class FileService {

    constructor(private http: HttpClient) {
    }

    /**
     * Fetches the content of a text file.
     * Sets the responseType to 'text' to prevent JSON parsing errors.
     */
    getTextFileContent(URL: string): Observable<string> {
        return this.http.get(URL, { responseType: 'text' });
    }
}

const nbsp = String.fromCharCode(160);

type UnknownKeyObj = {
  [key: string]: unknown;
};

export const [EXACT, WRONG, NOTUSE] = [1,2,3];
export const [EXACTBIT, WRONGBIT, NOTUSEBIT] = [2,4,8];
const savedGameStorageName = 'wordguessSavedGame';

export type SettingsObj = {
    wordlen: number,
    guessMustBeWord: boolean,
    noMarkGuessChars: boolean,            
    startWithReveal: boolean,
    hintUsePolicy: number,
    showElimPct: boolean,
}

export const defaultSettings: SettingsObj = {
    wordlen: 5,
    guessMustBeWord : true,
    noMarkGuessChars : false,            
    hintUsePolicy : EXACTBIT,
    startWithReveal: false,
    showElimPct: false,
};

export type GuessObj = {
    guess: string,
    index: number,
    posMap: number[],
}

type GuessCharObj = {
    chval: string,
    bgcolor: string,
}

type GuessTotalObj = {
    numval: number,
    bgcolor: string,
}

export type GuessLineObj = {
    chars: GuessCharObj[],
    totals: GuessTotalObj[],
}

type MessageObj = {
    html: string;
    defs: string[];
    bgcolor: string;
}

const emptyMessage: MessageObj = {
    html: '',
    defs: [],
    bgcolor: 'white'
};

type StringOrNull = string | null;

type SavedGameObj = {

    message: MessageObj;
}

const savedGameFields = [
    'settings',
    'answer',
    'guessList',
    'gameOver',
    'message',
    'totalGuessCount',
    'legalGuessCount',
];

@Component({
  selector: 'app-game-logic',
  standalone: true,
  imports: [CommonModule, GameSettingsComponent], 
  templateUrl: './game-logic.component.html',
  styleUrl: './game-logic.component.css'
})
export class GameLogicComponent  implements OnInit {

    @ViewChild('guessInput') guessInputRef!: ElementRef<HTMLInputElement>;
    @ViewChild(GameSettingsComponent) childSettingsComp!: GameSettingsComponent;

    inputChars: string[] = [];
    input: string = '';
    answer: string = '';
    totalGuessCount: number = 0;
    legalGuessCount: number = 0;
    wordList: string[] = [];
    possibleList: string[] = [];
    possibleMsg: string[] = [];
    gameOver: boolean = false;
    message: MessageObj = emptyMessage;
    hintHandler: HintHandler;
    settings: SettingsObj = defaultSettings;
    curWordListWordLen: number = 0;
    wordlenBeforeSettingsDialog: number = 0;
    guessList: GuessObj[] = [];
    guessLines: GuessLineObj[] = [];
    yellowString: string = ' ';
    greenString: string = ' ';
    greyString: string = ' ';
    notInPool: Map<string, number> = new Map();
    poolLine: string = '';
    nbspchar: string = nbsp;
    enableSettings: boolean = false;
    enableSettingsCount: number = 0;
    defStrings: string[] = [];
    revealPos: number = 0;
    revealChar: string = '';
    usedDefaultGameState: boolean = true;
    
    constructor(private _fileService: FileService) {
        this.setInitGameState();
        this.hintHandler = HintHandler.getHintHandler(this);
        this.setInputs('');
    }

    async ngOnInit(): Promise<void> {
        console.log('ngOnInit');
        await this.startNewGame();
        this.setInputs('');
        this.hintHandler = HintHandler.getHintHandler(this);  // in case it got changed on settings change
        this.focusToInput();
    }
    
    async startNewGame(): Promise<void> {
        this.guessList = [];
        this.guessLines = [];
        this.setInputs('');
        this.setPoolLine();
        this.message = emptyMessage;
        this.hintHandler = HintHandler.getHintHandler(this);
        this.totalGuessCount = 0;
        this.legalGuessCount = 0;
        await this.buildWordList(this.settings.wordlen);
        this.possibleList = Array.from(this.wordList);
        this.setTopMsg();
        if (true) {
            this.answer = this.wordList[Math.floor(Math.random() * this.wordList.length)].toUpperCase();
            this.defStrings = await this.getDefinition();
        }
        else {
            this.answer = 'FLAME';
            this.defStrings = [];
        }
        this.totalGuessCount = 0;
        if (!this.settings.startWithReveal) {
            this.revealPos = -1;
            this.revealChar = '';
        } else {
            const inputAry: string[] = Array(this.settings.wordlen).fill(nbsp);
            this.revealPos = this.findRevealPos();
            this.revealChar = this.answer[this.revealPos];
            inputAry[this.revealPos] = this.revealChar;
            this.setInputs(inputAry.join(''));
            // console.log('input after reveal', this.input);
            const posMap = this.doCompare(this.input, this.answer);
            this.guessList.push({
                guess: this.input,
                index : this.guessList.length,
                posMap,
            });
            this.doGuessFormatting();
            this.possibleList = this.getNewPossibleList(this.input, posMap);
            this.setTopMsg();
            this.setInputs('');
        }
        this.gameOver = false;
        this.focusToInput();
        // console.log('end of startNewGame, component', this);
    }

    findRevealPos(): number {
        let maxLength: number = 0;
        let revealPos: number = 0;
        [...this.answer].forEach( (ch, index) => {
            // skip if in mark chars mode and char is already green
            const shouldSkip: boolean = (!this.settings.noMarkGuessChars &&
                                this.guessList.length > 0 &&
                                this.guessList[this.guessList.length - 1].posMap[index] === EXACT);
            if (!shouldSkip) {
                // find which character yields the longest possibleList
                const newList: string[] = this.possibleList.filter( (word) => word[index] === ch);
                // console.log(`knowing ${ch} at pos ${index} reduces possibleList from ${this.possibleList.length} to ${newList.length}`);
                if (newList.length > maxLength) {
                    maxLength = newList.length;
                    revealPos = index;
                }
            }
        });
        return revealPos;
    }

    async buildWordList(wordlen: number): Promise<void> {
        if (wordlen === this.curWordListWordLen) return;
        this.curWordListWordLen = wordlen;
        const URL = `/assets/ospd${wordlen}.txt`;
        console.log('URL', URL);
        let text: string = '';
        // console.log('before call to getTextFile');
        text = await firstValueFrom(this._fileService.getTextFileContent(URL));
        // console.log('after call to getTextFile');
        this.wordList = text.split('\n');
        this.wordList = this.wordList.map(word => word.toUpperCase());
        console.log(`wordlist for len ${wordlen} built with ${this.wordList.length} words`);
        // console.log('ALIEN-FLUID', this.doCompare('ALIEN', 'FLUID'));
        // console.log('FLUID-ALIEN', this.doCompare('FLUID', 'ALIEN'));
    }

    doCompare(guess: string, base: string): number[] {
        const gchars: StringOrNull [] = [...guess];
        const bchars: StringOrNull [] = [...base];
        let posMap: number[] = new Array(this.settings.wordlen).fill(NOTUSE);
        // first do exact matches
        gchars.forEach( (gchar, index) => {
            if (gchar === bchars[index]) {
                bchars[index] = null;
                gchars[index] = null;
                posMap[index] = EXACT;
            }
        });
        // then do any more matches
        gchars.forEach( (gchar, index) => {
            if (gchar !== null) {
                const pos = bchars.indexOf(gchar);
                if (pos >= 0) {
                    bchars[pos] = null;
                    posMap[index] = WRONG;
                }
            }
        });
        // console.log(`doCompare ${guess} vs. ${base}, posMap is ${posMap}`); 
        return posMap;
    }

    

    setInputs(str: string) {
        this.input = str;
        if (this.gameOver) {
            this.inputChars = [];
        } else { 
            // build up array first, then assign
            const tmpary: string[] = [];
            _.range(this.settings.wordlen).forEach( (n) => {
                tmpary.push((n < this.input.length ? this.input[n] : nbsp));
            });
            this.inputChars = tmpary;
        }
    }

    onGuessEntryInputKeyDown(x: any) {
        let key: string = x.key;
        if (this.gameOver) return;
        if (key === '?') console.log(`this.answer = ${this.answer}, len=${this.answer.length}`);
        if (key === '!') console.log('logic component', this);
        if (key === '%') console.log('best Guess', this.computeOptimalGuess());
        if (key === '*') console.log('possibleList', this.possibleList);
        if (key === '#') console.log(`avgElimPct for ${this.input}: `, this.getAvgElimPct(this.input, this.possibleList).toFixed(1));
        if (key === '=') console.log(`gameLogic component`, this);
        if (key === 'Backspace' && this.message != null) {
            this.message = emptyMessage;
        }
        if (['Enter', '{enter}'].includes(key)) {
            if (this.input.length === this.answer.length) {
                this.doInputSubmit();
            } else {
                this.setMessage(`guess ${this.input} is too short, ignoring Enter`);
            }
        }
        else if (key === 'Backspace' && this.input.length > 0) {
            this.setInputs(this.input.slice(0, -1));
        }
        else {
            key = key.toUpperCase();
            if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(key)) {
                if (this.input.length < this.settings.wordlen) {
                    this.setInputs(this.input + key);
                    if (this.settings.showElimPct && this.totalGuessCount > 0 && this.input.length === this.answer.length) {
                        this.setMessage(`Avg Elimination Pct for ${this.input}: ${this.getAvgElimPct(this.input, this.possibleList).toFixed(1)}`);
                    }
                }
                else {
                    this.setMessage(`too long, ignoring ${key}`);
                }
            }
        }
    }

    setTopMsg() {
        const listlen = this.possibleList.length;
        this.possibleMsg = [];
        this.possibleMsg.push(`Guesses: ${this.totalGuessCount}, Legal: ${this.legalGuessCount}`);
        this.possibleMsg.push(`${listlen} ${(listlen === 1 ? 'word meets' : 'words meet')} the criteria`);
    }
    
    async doInputSubmit() {
        let legalGuess = true;  // assume this
        if (this.input.length !== this.answer.length) return;
        this.totalGuessCount++;
        const posMap = this.doCompare(this.input, this.answer);
        
        if (this.settings.guessMustBeWord && !this.wordList.includes(this.input)) {
            // await this.tempAlert('Guess must be a Legal Scrabble Word', 1500);
            this.setMessage(`Guess must be in wordlist`);
            legalGuess = false;
        }
        else if (this.settings.hintUsePolicy !== 0 && this.guessList.length > 0) {
            const message = this.hintHandler.checkUseAllHints(this.input);
            if (message) {
                // console.log('hintUseMessage', message);
                this.setMessage(message, 'rgb(230,230,230)');
                legalGuess = false;
            }
        }
        if (legalGuess) {    
            this.legalGuessCount++;
            // guess is legal, see how right it is
            const posMap = this.doCompare(this.input, this.answer);
            // console.log(`posMap: ${posMap}`);
            this.guessList.push({
                guess: this.input,
                index : this.guessList.length,
                posMap,
            });
            this.possibleList = this.getNewPossibleList(this.input, posMap);
            this.setTopMsg();
            // console.log(this.possibleList);
            this.notInPool = new Map<string, number>();
            
            if (posMap.every(val => val === EXACT)) {
                this.gameOver = true;
                this.message = await this.buildGameOverMessage();
            }
            else {
                this.message = emptyMessage;
            }
            // clean up input for the next time thru
            this.setInputs('');
        }
        this.doGuessFormatting();

        this.saveGameState();
    }

    saveGameState() {
        // for now, just save the settings.  Come back to this later
        
        // handle the fact that embedded objects need their fields in the list
        // the last fields are from guessList objects (shown explicitly in case the list is empty)
        let filteredFieldNames = [];
        let JSONstring = '';
        if (true) {
            filteredFieldNames =  [...Object.keys(this.settings)];
            JSONstring = JSON.stringify(this.settings, filteredFieldNames);
        } else {
            filteredFieldNames =  [...savedGameFields, ...Object.keys(this.settings), 'guess', 'index', 'posMap', 'html', 'def', 'bgcolor'];
            JSONstring = JSON.stringify(this, filteredFieldNames);
        }
        window.localStorage[savedGameStorageName] = JSONstring;
        // console.log('JSONstring:', JSON.stringify(this, filteredFieldNames, 2));
        // console.log(`message: ${this.message}`);

    }
    
    doGuessFormatting() {
        // do the guess formatting
        this.guessLines = [];
        this.guessList.forEach( (guess) => {
            this.guessLines.push(this.formatGuess(guess, true));
        });
        this.setPoolLine();
    }
    
    formatGuess(guessObj: GuessObj, submitted: boolean = false): GuessLineObj {
        let guessLine: GuessLineObj = {chars: [], totals: []};
        const guess = guessObj.guess;
        for (let n=0; n < this.answer.length; n++) {
            const chval = (n < guess.length ? guess[n] : nbsp);
            // console.log('guessObj', guessObj);
            const bgcolor = this.hintHandler.computeGuessCharColor(guessObj, n, chval, submitted);
            guessLine.chars.push({chval:chval, bgcolor:bgcolor});
        };
        
        // conditionally  show total exact and wrongplace totals
        if (submitted) {
            this.hintHandler.formatGuessTotals(guessObj, guessLine);
        }
        return guessLine;
    }
    
    async buildGameOverMessage(): Promise<MessageObj> {
        var html = `Match!! after ${this.totalGuessCount} Guesses,  ${this.legalGuessCount} Legal`;
        return {html: html,
                defs: this.defStrings,
                bgcolor: 'white',
               };
    }

    getNewPossibleList(inputStr: string, basePosMap: number[] ): string[] {
        return this.possibleList.filter(word => {
            const tstPosMap = this.doCompare(inputStr, word);
            const ok = this.hintHandler.possibleListFilter(tstPosMap, basePosMap);
            // if (ok) console.log(word, tstPosMap, basePosMap);
            return ok;
        });
    }

    setMessage(html: string, bgcolor:string='pink') {
        const msgObj: MessageObj = {html, bgcolor, defs:[]};
        this.message = msgObj;
    }

    getPoolChars() {
        return [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((c) => this.notInPool.get(c) !== 1);
    }

    setPoolLine() {
        this.poolLine = '';
        if (!this.gameOver) {
            this.poolLine = `Pool: ${this.getPoolChars().join(' ')}`;
        }
    }

    async getDefinition(): Promise<string[]> {
        const word = this.answer;
        // make a req to the api
        const result = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
        );
        let defs: string[]  = [];
        if (!result.ok) {
            // alert("No definition found");
            defs.push('No definition found');
            return defs;
        }
        const data = await result.json();
        // console.log(data);
        data.forEach((d: any, dindex: number) => {
            d.meanings.forEach((m: any, mindex: number) => {
                const pspeech = m.partOfSpeech;
                m.definitions.forEach((def: any, defindex: number) => {
                    if (defindex == 0) defs.push(`(${pspeech}): ${def.definition}`)
                });
            });
        });
        return defs;
    }

    onSettingsButtonClick(event: any) {
        this.wordlenBeforeSettingsDialog = this.settings.wordlen;
        this.enableSettingsCount++;
        this.childSettingsComp.showModal();
        this.focusToInput();
    }

    async onNewGameButtonClick(event: any) {
        await this.startNewGame();
        this.focusToInput();
    }
    
    async settingsDialogComplete(formValue: any) {
        this.enableSettings = false;
        this.settings.wordlen = formValue.wordlen;
        this.settings.guessMustBeWord = formValue.guessMustBeWord;
        this.settings.noMarkGuessChars = formValue.noMarkGuessChars;
        this.settings.startWithReveal = formValue.startWithReveal;
        this.settings.hintUsePolicy = formValue.hintUsePolicy;
        this.settings.showElimPct = formValue.showElimPct;
        // see if we have to start a new game
        if (this.settings.wordlen !== this.wordlenBeforeSettingsDialog) {
            await this.startNewGame();
            this.setMessage('starting new game because wordlen changed');
        }
        this.saveGameState();
        this.focusToInput();

    }

    focusToInput() {
        const inputElement: HTMLInputElement = this.guessInputRef.nativeElement;
        inputElement.focus();
    }


    setInitGameState() {
        const savedGameJSON = window.localStorage.getItem(savedGameStorageName);
        // console.log('savedGameJSON:', savedGameJSON);
        if (savedGameJSON) {
            this.restoreSavedState(savedGameJSON);
        } else {
            this.setDefaultGameState();
        }
    }

    restoreSavedState(jsonStr: string) {
        const savedSettings:SettingsObj = JSON.parse(jsonStr);
        // console.log('restore', savedSettings);
        this.settings = savedSettings;
        // console.log('restored settings are: ', this.settings);
    }
    
    
    setDefaultGameState() {
        // console.log('setting default game state');
        // default settings
        this.settings = defaultSettings;
        this.answer = '';
        this.usedDefaultGameState = true;
        this.message = emptyMessage;
    }

    getAvgElimPct(guessWord: string, oldPossibleList: string[]): number {
        let elimSum = 0;
        oldPossibleList.forEach( (ansWord) => {
            const guessPosMap = this.doCompare(guessWord, ansWord);
            let tmpPossibleList: string[] = [];
            if (ansWord !== guessWord) {
                tmpPossibleList = this.getNewPossibleList(guessWord, guessPosMap);
            }
            elimSum += (oldPossibleList.length - tmpPossibleList.length);
            // console.log(`after ${ansWord}, elimSum=${elimSum}, tmpList.len=${tmpPossibleList.length}`);
        });
        return (100 * elimSum / (oldPossibleList.length * oldPossibleList.length));
    }
    
    computeOptimalGuess(): string {
        const oldPossibleList = [...this.possibleList];
        let bestAvgElimPct = 0;
        let bestGuess = '';
        oldPossibleList.forEach( (guessWord, guessIdx) => {
            const avgElimPct = this.getAvgElimPct(guessWord, oldPossibleList);
            if (avgElimPct > bestAvgElimPct) {
                bestAvgElimPct = avgElimPct;
                bestGuess = guessWord;
                console.log(`newBestGuess: ${bestGuess}, ${bestAvgElimPct.toFixed(1)}, #${guessIdx+1} out of ${oldPossibleList.length}`);
            }
        });
        console.log(`bestGuess is ${bestGuess}, ${bestAvgElimPct.toFixed(1)}`);
        return bestGuess;
    }
    
}

