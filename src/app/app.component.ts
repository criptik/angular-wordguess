import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameLogicComponent } from './game-logic/game-logic.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GameLogicComponent ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'wordguess';
}
