import { Outlet } from 'react-router';

import AppNav from './AppNav';
import styles from './AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <AppNav />
      <Outlet />
    </div>
  );
}
