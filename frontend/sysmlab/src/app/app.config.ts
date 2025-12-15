import { ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HttpClientModule,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { AuthService } from './acessos/auth/auth.service';
import { switchMap } from 'rxjs/operators';
import { from } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      HttpClientModule,
      FormsModule,
      ReactiveFormsModule
    ),

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // ✅ REGISTRA O INTERCEPTOR AQUI
    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const injector = inject(AuthService);
          return from(injector.getSession()).pipe(
            switchMap(session => {
              if (!session?.access_token) {
                return next(req);
              }

              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${session.access_token}`
                  }
                })
              );
            })
          );
        }
      ])
    )
  ]
};
