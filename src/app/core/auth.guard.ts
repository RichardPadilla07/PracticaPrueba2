import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase';
import { map, take } from 'rxjs/operators';

export const authGuard = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.user$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};