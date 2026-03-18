import React from 'react';
import { IconRail } from '../../components/workspace/IconRail';
import classes from './layout.module.css';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={classes.container}>
      <IconRail />
      <main className={classes.main}>{children}</main>
    </div>
  );
}
