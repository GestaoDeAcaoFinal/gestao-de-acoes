import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Papel } from './auth.models';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const roles = (route.data['roles'] ?? []) as Papel[];
  return roles.some(role => auth.hasRole(role))
    ? true
    : inject(Router).createUrlTree(['/']);
};
