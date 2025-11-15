import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { queryClient } from './lib/query-client';
import { router } from './lib/router';
import { HelpPanel } from './components/help/HelpPanel';
import { GuidedTour } from './components/help/GuidedTour';
import { useHelpPanelState } from './hooks/useHelpPanel';

function App(): React.ReactElement {
  const helpPanel = useHelpPanelState();
  const [showTour, setShowTour] = React.useState(false);

  // Global keyboard shortcut for help (?)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Check if we're not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          helpPanel.toggle();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [helpPanel]);

  // Check if first-time user (could be stored in localStorage)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenGuidedTour');
    if (!hasSeenTour) {
      // Delay tour slightly to let UI load
      setTimeout(() => setShowTour(true), 1000);
    }
  }, []);

  const handleTourComplete = () => {
    localStorage.setItem('hasSeenGuidedTour', 'true');
    setShowTour(false);
  };

  const handleTourSkip = () => {
    localStorage.setItem('hasSeenGuidedTour', 'true');
    setShowTour(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <HelpPanel
          isOpen={helpPanel.isOpen}
          onClose={helpPanel.close}
          currentPage={helpPanel.currentPage}
        />
        <GuidedTour
          isActive={showTour}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
