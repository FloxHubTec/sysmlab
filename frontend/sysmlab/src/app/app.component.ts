import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardTvComponent } from './acessos/dashboard-tv/dashboard-tv.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'sysmlab';
}
