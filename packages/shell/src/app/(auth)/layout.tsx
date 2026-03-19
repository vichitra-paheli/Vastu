import React from 'react';
import { BrandingPanel } from '@/components/auth/BrandingPanel';
import classes from './layout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={classes.container}>
      <div className={classes.brandingPanel}>
        <BrandingPanel />
      </div>
      <div className={classes.formPanel}>
        <div className={classes.formContent}>{children}</div>
      </div>
    </div>
  );
}
