import { useState, useCallback } from 'react';

export interface HelpPanelState {
  isOpen: boolean;
  currentPage: string | null;
  searchQuery: string;
}

export interface HelpPanelActions {
  open: (page?: string) => void;
  close: () => void;
  toggle: () => void;
  setPage: (page: string) => void;
  setSearchQuery: (query: string) => void;
}

export function useHelpPanelState(): HelpPanelState & HelpPanelActions {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');

  const open = useCallback((page?: string) => {
    setIsOpen(true);
    if (page) {
      setCurrentPage(page);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentPage(null);
    setSearchQueryState('');
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const setPage = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  return {
    isOpen,
    currentPage,
    searchQuery,
    open,
    close,
    toggle,
    setPage,
    setSearchQuery,
  };
}
