import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

const nbsp = String.fromCharCode(160);

type UnknownKeyObj = {
  [key: string]: unknown;
};

const [EXACT, WRONG, NOTUSE, UNKNOWN] = [1,2,3,4];
const [EXACTBIT, WRONGBIT, NOTUSEBIT] = [2,4,8];
const WILDCHAR = '?';

type SettingsObj = {
    wordlen: number,
    guessMustBeWord: boolean,
    noMarkGuessChars: boolean,            
    hintUsePolicy: number,
    useVirtKeyboard: boolean,
    allowPlurals: boolean,
    startWithReveal: boolean,
}

type GuessObj = {
    guess: string,
    index: number,
    
}

type StringOrNull = string | null;

@Component({
  selector: 'app-game-logic',
  standalone: true,
  imports: [],
  templateUrl: './game-logic.component.html',
  styleUrl: './game-logic.component.css'
})
export class GameLogicComponent  implements OnInit {

    inputChars: string[] = [];
    input: string = '';
    curAnswerLen: number = 5;
    answer: string = 'BROOM';
    totalGuesses: number = 0;
    wordList: string[] = [];
    possibleList: string[] = [];
    prevDataLength: number = 0;
    gameOver: boolean = false;
    
    settings: SettingsObj = {
        wordlen: 5,
        guessMustBeWord : true,
        noMarkGuessChars : false,            
        hintUsePolicy : EXACTBIT,
        useVirtKeyboard: false,
        allowPlurals: false,
        startWithReveal: false,
    };
    guessList: GuessObj[] = [];
    
    state: UnknownKeyObj = {};
    
    constructor() {
        this.setInputs('');
    }

    ngOnInit() {
        this.startNewGame();
    }
    
    async startNewGame() {
        this.guessList = [];
        this.setInputs('');
        if (false) {
            // this.hintHandler = HintHandler.getHintHandler(this);
            await this.buildWordList(this.settings.wordlen);
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
    
    async buildWordList(wordlen: number, allowPlurals=this.settings.allowPlurals) {
        if (wordlen === this.curAnswerLen) return;
        this.curAnswerLen = wordlen;
        const URL = `/wordguess/ospd${allowPlurals ? '' : 'np'}${wordlen}.txt`;
        // console.log('URL', URL);
        const data = await fetch(URL);
        console.log('fetch complete');
        const text = await data.text();
        // console.log('data.text() complete');
        // console.log(text);
        this.wordList = await text.split('\n');
        this.wordList = await this.wordList.map(word => word.toUpperCase());
        console.log(`wordlist for len ${wordlen} built`);
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
        if (key === '?') console.log('this.answer =', this.answer);
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
        console.log(`posMap: ${posMap}`);
        
        // if (this.settings.guessMustBeWord && !this.wordList.includes(this.input)) {
        //     // await this.tempAlert('Guess must be a Legal Scrabble Word', 1500);
        //     const addon = (this.input.endsWith('S') && !this.settings.allowPlurals ? ', plurals are disabled' : '');
        //     this.setMessage(`Guess must be in wordlist${addon}`);
        //     legalGuess = false;
        // }
        // else if (this.settings.hintUsePolicy !== 0 && this.guessList.length > 0) {
        //     const messageJsx = this.hintHandler.checkUseAllHints(this.input);
        //     if (messageJsx) {
        //         // console.log('messageJsx', messageJsx);
        //         this.setMessage(messageJsx, 'rgb(230,230,230)');
        //         legalGuess = false;
        //     }
        // }
        // if (legalGuess) {    
        //     // guess is legal, see how right it is
        //     const posMap = this.doCompare(this.input, this.answer);
        //     this.guessList.push({
        //         guess: this.input,
        //         index : this.guessList.length,
        //         posMap,
        //     });
        //     this.possibleList = this.getNewPossibleList(this.input, posMap);
        //     // console.log(this.possibleList);
        //     
        //     if (posMap.every(val => val === EXACT)) {
        //         this.gameOver = true;
        //         this.message = await this.buildGameOverMessage();
        //         this.setState(
        //             {gameOver:true,
        //              message: this.message,
        //             });
        //     }
        //     else {
        //         this.message = '';
        //         this.setState(
        //             {gameOver:false,
        //              message: this.message,
        //             });
        //     }
        // }
        // // clean up input for the next time thru
        // if (legalGuess) {
        //     this.setInputs('');
        //     if (this.settings.useVirtKeyboard) this.keyboard.clearInput();
        // }
        // else {
        //     this.illegalGuessCount++;
        //     this.setState({
        //         totalGuesses: this.totalGuesses,
        //     });
        // }
        // this.setState({
        //     input: this.input,
        //     guessList: this.guessList,
        // });
        // 
        // // handle the fact that embedded objects need their fields in the list
        // // the last fields are from guessList objects (shown explicitly in case the list is empty)
        // const filteredFieldNames =  [...savedGameFields, ...Object.keys(this.settings), 'guess', 'index', 'posMap', 'html', 'def', 'bgcolor'];
        // const JSONstring = JSON.stringify(this, filteredFieldNames);
        // window.localStorage[savedGameStorageName] = JSONstring;
        // // console.log('JSONstring:', JSON.stringify(this, filteredFieldNames, 2));
        // // console.log(`message: ${this.message}`);
    }
   

}
