'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { ServiceWorkerRegister } from './sw-register';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ServiceWorkerRegister />
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
