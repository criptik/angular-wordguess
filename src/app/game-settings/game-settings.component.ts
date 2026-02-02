import { Component, inject, Input, Output, ViewChild, OnInit, AfterViewInit, EventEmitter } from '@angular/core';
import { Directive, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { EXACTBIT, WRONGBIT, NOTUSEBIT, SettingsObj, defaultSettings } from '../game-logic/game-logic.component'

const nbsp = String.fromCharCode(160);

type HintUseObj = {
    label: string;
    val: number;
}

@Component({
    selector: 'app-game-settings',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './game-settings.component.html',
    styleUrl: './game-settings.component.css'
})
export class GameSettingsComponent implements AfterViewInit, OnInit {
    @ViewChild('gameSettingsDialog') gameSettingsDialog!: ElementRef<HTMLDialogElement>;
    @Input() gameSettingsObj: SettingsObj = defaultSettings
    @Output() submitComplete = new EventEmitter<string>();

    nbspchar: string = nbsp;
    
    private fb = inject(FormBuilder);
    gameSettingsForm!: FormGroup;
    wordlenOpts: number[] = [5,6,7,8];
    hintUseOpts: HintUseObj[] = [];

    constructor() {
        console.log('in constructor');
    }
    
    onGameSettingsFormSubmit() {
    }

    ngOnInit() {
        this.genHintUsePolicySetting();
        this.gameSettingsForm = this.fb.group({
            // Set the default value when creating the control
            wordlen: [this.gameSettingsObj.wordlen],
            guessMustBeWord: [this.gameSettingsObj.guessMustBeWord] ,
            noMarkGuessChars: [this.gameSettingsObj.noMarkGuessChars] ,
            startWithReveal: [this.gameSettingsObj.startWithReveal] ,
            hintUsePolicy: [this.gameSettingsObj.hintUsePolicy], 
        });
    }
    
    ngAfterViewInit() {
        console.log('in AfterViewInit');
        // console.log(this.gameSettingsDialog.nativeElement); // Logs the native HTML input element
        this.gameSettingsDialog.nativeElement.showModal();
    }

    genHintUsePolicySetting() {
        const choicesAryMark = [
                    {label:'None (most flexible)', val:0},
                    {label:'Must Reuse Green (slightly harder)', val:EXACTBIT},
                    {label:'Must Reuse Green and Yellow (harder)', val:EXACTBIT+WRONGBIT},
                    {label:'Must Reuse All Hints (restrictive but can be helpful)', val:EXACTBIT+WRONGBIT+NOTUSEBIT}
        ];
        const choicesAryNonMark = [
                    {label:'None (most flexible)', val:0},
                    {label:'Green Totals Must Match (slightly harder)', val:EXACTBIT},
                    {label:'All Totals Must Match (restrictive but can be helpful)', val:EXACTBIT+WRONGBIT+NOTUSEBIT}
        ];            
        const choicesAry = this.gameSettingsObj.noMarkGuessChars ? choicesAryNonMark : choicesAryMark;
        
        this.hintUseOpts = choicesAry;
        // console.log('hintUseOpts', this.hintUseOpts);
    }

    onSettingsFormSubmit() {
        console.log('onSubmit', this.gameSettingsForm.value);
        // tell the parent
        this.submitComplete.emit(this.gameSettingsForm.value);
        this.gameSettingsDialog.nativeElement.close();
    }
    
}
