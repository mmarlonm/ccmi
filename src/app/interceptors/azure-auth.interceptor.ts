import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ConfigService } from '../services/config.service';

export const azureAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const configService = inject(ConfigService);
  const config = configService.getConfig();

  if (config && config.azure.pat && (req.url.includes('dev.azure.com') || req.url.includes('visualstudio.com'))) {
    // Basic Auth with empty username and PAT as password
    const authHeader = 'Basic ' + btoa(':' + config.azure.pat);
    const authReq = req.clone({
      setHeaders: {
        Authorization: authHeader
      }
    });
    return next(authReq);
  }

  return next(req);
};
