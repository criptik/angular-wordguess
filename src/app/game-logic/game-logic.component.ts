import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // or just NgStyle
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { HintHandler } from './HintHandler'
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

export const [EXACT, WRONG, NOTUSE, UNKNOWN] = [1,2,3,4];
export const [EXACTBIT, WRONGBIT, NOTUSEBIT] = [2,4,8];
export const WILDCHAR = '?';
const savedGameStorageName = 'wordguessSavedGame';

export type SettingsObj = {
    wordlen: number,
    guessMustBeWord: boolean,
    noMarkGuessChars: boolean,            
    hintUsePolicy: number,
    useVirtKeyboard: boolean,
    allowPlurals: boolean,
    startWithReveal: boolean,
}

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
const savedGameFields = [
    'settings',
    'answer',
    'guessList',
    'gameOver',
    'message',
    'totalGuesses',
    'input',
];

@Component({
  selector: 'app-game-logic',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './game-logic.component.html',
  styleUrl: './game-logic.component.css'
})
export class GameLogicComponent  implements OnInit {

    inputChars: string[] = [];
    input: string = '';
    curAnswerLen: number = 0;
    answer: string = '';
    totalGuesses: number = 0;
    illegalGuessCount: number = 0;
    wordList: string[] = [];
    possibleList: string[] = [];
    prevDataLength: number = 0;
    gameOver: boolean = false;
    message: MessageObj = emptyMessage;
    hintHandler: HintHandler;
    settings: SettingsObj = {
        wordlen: 5,
        guessMustBeWord : false,
        noMarkGuessChars : true,            
        hintUsePolicy : EXACTBIT,
        useVirtKeyboard: false,
        allowPlurals: true,
        startWithReveal: false,
    };
    guessList: GuessObj[] = [];
    guessLines: GuessLineObj[] = [];
    yellowString: string = ' ';
    greenString: string = ' ';
    greyString: string = ' ';
    notInPool: Map<string, number> = new Map();
    
    state: UnknownKeyObj = {};
    
    constructor(private _fileService: FileService) {
        this.hintHandler = HintHandler.getHintHandler(this);
        this.setInputs('');
    }

    async ngOnInit(): Promise<void> {
        console.log('ngOnInit');
        await this.startNewGame();
        this.setInputs('');
        this.hintHandler = HintHandler.getHintHandler(this);  // in case it got changed on settings change
    }
    
    async startNewGame(): Promise<void> {
        this.guessList = [];
        this.setInputs('');
        if (true) {
            // this.hintHandler = HintHandler.getHintHandler(this);
            await this.buildWordList(this.settings.wordlen);
            console.log('back from buildWordList');
            this.possibleList = Array.from(this.wordList);
            this.answer = this.wordList[Math.floor(Math.random() * this.wordList.length)].toUpperCase();
        }
        else {
            this.answer = 'FRIZZ';
        }
        this.totalGuesses = 0;
        // if (this.settings.startWithReveal) {
        //     const inputAry = Array(this.settings.wordlen).fill(WILDCHAR);
        //     const revealPos = this.findRevealPos();
        //     inputAry[revealPos] = this.answer[revealPos];
        //     this.setInputs(inputAry.join(''));
        //     const posMap = this.doCompare(this.input, this.answer);
        //     this.guessList.push({
        //         guess: this.input,
        //         index : this.guessList.length,
        //         posMap,
        //     });
        //     this.possibleList = this.getNewPossibleList(this.input, posMap);
        //     this.setInputs('');
        //     this.totalGuesses = 1;
        // }
        // console.log('this.answer =', this.answer);
        this.gameOver = false;
        this.setState({
            input: this.input,
            guessList: this.guessList,
            gameOver: false,
            totalGuesses: this.totalGuesses,
            message: null,
        });
        this.prevDataLength = 0;
    }


    async buildWordList(wordlen: number, allowPlurals=this.settings.allowPlurals): Promise<void> {
        if (wordlen === this.curAnswerLen) return;
        this.curAnswerLen = wordlen;
        const URL = `/assets/ospd${allowPlurals ? '' : 'np'}${wordlen}.txt`;
        console.log('URL', URL);
        let text: string = '';
        console.log('before call to getTextFile');
        text = await firstValueFrom(this._fileService.getTextFileContent(URL));
        // .subscribe({
        // next: (data) => {
        //     // Assign the response text to a component property
        //     console.log('File content loaded successfully');
        //     console.log(`dataLength = ${data.length}`);
        //     text = data;
        // },
        // error: (error) => {
        //     console.error('Error fetching text file:', error);
        // },
        // complete: () => {
        //     console.log('Request completed');
        //     console.log('before text.split');
        // }
        //         });
        console.log('after call to getTextFile');
        this.wordList = text.split('\n');
        this.wordList = this.wordList.map(word => word.toUpperCase());
        console.log(`wordlist for len ${wordlen} built with ${this.wordList.length} words`);
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
            else if (bchars[index] === WILDCHAR || gchar === WILDCHAR) {
                posMap[index] = UNKNOWN;
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
        return posMap;
    }

    

    setInputs(str: string) {
        this.input = str;
        _.range(this.curAnswerLen).forEach( (n) => {
            this.inputChars[n] = (n < this.input.length ? this.input[n] : nbsp)
        });
    }

    setState(newFields: UnknownKeyObj) {
        Object.entries(newFields).forEach( ([fieldName, val]) => {
            console.log('setState', fieldName, val);
            this.state[fieldName] = val;
        });
    }
    
    onGuessEntryInputKeyDown(x: any) {
        let key: string = x.key;
        if (this.state.gameOver) return;
        if (key === '?') console.log(`this.answer = ${this.answer}, len=${this.answer.length}`);
        if (key === 'Backspace' && this.state.message != null) {
            this.setState({message: null});
        }
        if (['Enter', '{enter}'].includes(key)) {
            if (this.input.length === this.answer.length) {
                this.doInputSubmit();
            } else {
                this.setState({message: `guess ${this.input} is too short, ignoring Enter`});
            }
        }
        else if (key === 'Backspace' && this.input.length > 0) {
            this.setInputs(this.input.slice(0, -1));
        }
        else {
            key = key.toUpperCase();
            if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(key)) {
                if (this.input.length < this.curAnswerLen) {
                    this.setInputs(this.input + key);
                }
                else {
                    this.setState({message: `too long, ignoring ${key}`});
                }
            }
        }
    }

    async doInputSubmit() {
        const msg = `in submit, input=${this.input}`;
        this.setState({message: msg});
        console.log(msg);
        let legalGuess = true;  // assume this
        if (this.input.length !== this.answer.length) return;
        this.totalGuesses++;
        const posMap = this.doCompare(this.input, this.answer);
        
        if (this.settings.guessMustBeWord && !this.wordList.includes(this.input)) {
            // await this.tempAlert('Guess must be a Legal Scrabble Word', 1500);
            const addon = (this.input.endsWith('S') && !this.settings.allowPlurals ? ', plurals are disabled' : '');
            this.setMessage(`Guess must be in wordlist${addon}`);
            legalGuess = false;
        }
        // else if (this.settings.hintUsePolicy !== 0 && this.guessList.length > 0) {
        //     const messageJsx = this.hintHandler.checkUseAllHints(this.input);
        //     if (messageJsx) {
        //         // console.log('messageJsx', messageJsx);
        //         this.setMessage(messageJsx, 'rgb(230,230,230)');
        //         legalGuess = false;
        //     }
        // }
        if (legalGuess) {    
            // guess is legal, see how right it is
            const posMap = this.doCompare(this.input, this.answer);
            console.log(`posMap: ${posMap}`);
            this.guessList.push({
                guess: this.input,
                index : this.guessList.length,
                posMap,
            });
            if (false) {
                this.possibleList = this.getNewPossibleList(this.input, posMap);
            }
            // console.log(this.possibleList);
            
            if (posMap.every(val => val === EXACT)) {
                this.gameOver = true;
                this.message = await this.buildGameOverMessage();
                this.setState(
                    {gameOver:true,
                     message: this.message,
                });
            }
            else {
                this.message = emptyMessage;
                this.setState(
                    {gameOver:false,
                     message: this.message,
                });
            }
        }
        // clean up input for the next time thru
        if (legalGuess) {
            this.setInputs('');
        }
        else {
            this.illegalGuessCount++;
            this.setState({
                totalGuesses: this.totalGuesses,
            });
        }
        this.setState({
            input: this.input,
            guessList: this.guessList,
        });

        // do the guess formatting
        this.guessLines = [];
        this.guessList.forEach( (guess) => {
            this.guessLines.push(this.formatGuess(guess, true));
        });
        this.setState({
            guessLines: this.guessLines,
        });
        if (false) {
            // handle the fact that embedded objects need their fields in the list
            // the last fields are from guessList objects (shown explicitly in case the list is empty)
            const filteredFieldNames =  [...savedGameFields, ...Object.keys(this.settings), 'guess', 'index', 'posMap', 'html', 'def', 'bgcolor'];
            const JSONstring = JSON.stringify(this, filteredFieldNames);
            window.localStorage[savedGameStorageName] = JSONstring;
            // console.log('JSONstring:', JSON.stringify(this, filteredFieldNames, 2));
            // console.log(`message: ${this.message}`);
        }
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
        // const numGuesses = this.state.guessList.length;
        var html = `Match!!`;
        const defs = await this.getDefinition();
        return {html: html,
                defs: defs,
                bgcolor: 'white',
               };
    }

    async getDefinition(): Promise<string[]> {
        var defs = [];
        defs.push('Fake Definition 1');
        defs.push('Fake Definition 2');
        return defs;
    }
        
    getNewPossibleList(inputStr: string, posMap: number[] ): string[] {
        return [];
    }

    setMessage(html: string, bgcolor:string='pink') {
        const msgObj: MessageObj = {html, bgcolor, defs:[]};
        this.message = msgObj;
        this.setState({
            message: msgObj,
        });
    }
}

