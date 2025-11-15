import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useHelpPanelState } from '../../hooks/useHelpPanel';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const helpPanel = useHelpPanelState();

  return (
    <div className={styles.layout}>
      <Header onHelpClick={() => helpPanel.open()} />
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
};
