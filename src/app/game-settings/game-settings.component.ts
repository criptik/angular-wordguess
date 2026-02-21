import { Component, inject, Input, Output, ViewChild, OnInit, OnChanges, AfterViewInit, EventEmitter } from '@angular/core';
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
export class GameSettingsComponent implements OnChanges, OnInit, AfterViewInit {
    @ViewChild('gameSettingsDialog') gameSettingsDialog!: ElementRef<HTMLDialogElement>;
    @Input() gameSettingsObj: SettingsObj = defaultSettings
    @Input() settingsCount: number = 0;
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
            showElimPct: [this.gameSettingsObj.showElimPct], 
        });

        this.onNoMarkGuessCharsChange()
    }

    onNoMarkGuessCharsChange(): void {
        this.gameSettingsForm.get('noMarkGuessChars')?.valueChanges.subscribe((noMark:boolean) => {
            // 1. Fetch data for the hintUsePolicy choices based on the selected noMark value
            this.gameSettingsObj.noMarkGuessChars = noMark;
            this.genHintUsePolicySetting();
            
            // 2. Reset the child dropdown's value when the parent changes
            const oldHintUseVal: number = this.gameSettingsForm!.value.hintUsePolicy;
            let newHintUseVal: number = oldHintUseVal;
            if (noMark && newHintUseVal === EXACTBIT + WRONGBIT) {
                newHintUseVal += NOTUSEBIT;
            }
            this.gameSettingsForm.get('hintUsePolicy')?.setValue(newHintUseVal);
        });
    }
    
    showModal() {
        this.ngOnInit();
        this.gameSettingsDialog.nativeElement.showModal();
    }
    
    ngAfterViewInit() {
        // console.log('in AfterViewInit', this);
        // console.log('dialog', this.gameSettingsDialog); // Logs the native HTML input element
        // console.log('nativeElement', this.gameSettingsDialog.nativeElement); // Logs the native HTML input element
        // this.showModal();
    }
    
    ngOnChanges() {
        console.log('in OnChanges', this.settingsCount);
        // console.log('dialog', this.gameSettingsDialog); // Logs the native HTML input element
        // console.log(this.gameSettingsDialog.nativeElement); // Logs the native HTML input element
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
        this.hintUseOpts = this.gameSettingsObj.noMarkGuessChars ? choicesAryNonMark : choicesAryMark;
        // console.log('hintUseOpts', this.hintUseOpts);
    }

    onSettingsFormSubmit() {
        console.log('onSubmit', this.gameSettingsForm.value);
        // tell the parent
        this.submitComplete.emit(this.gameSettingsForm.value);
        this.gameSettingsDialog.nativeElement.close();
    }
    
}
