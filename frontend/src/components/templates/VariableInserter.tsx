/**
 * VariableInserter Component
 *
 * Dialog for selecting and inserting template variables
 */

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TEMPLATE_VARIABLES } from '../../types/template';
import styles from './VariableInserter.module.css';

interface VariableInserterProps {
  open: boolean;
  onClose: () => void;
  onInsert: (variable: string) => void;
}

export const VariableInserter: React.FC<VariableInserterProps> = ({
  open,
  onClose,
  onInsert,
}) => {
  const [search, setSearch] = useState('');

  const filteredVariables = TEMPLATE_VARIABLES.filter((v) => {
    const searchLower = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(searchLower) ||
      v.label.toLowerCase().includes(searchLower) ||
      v.description.toLowerCase().includes(searchLower)
    );
  });

  const handleInsert = (variableName: string) => {
    onInsert(`{{${variableName}}}`);
    setSearch('');
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch('');
      onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            Insert Template Variable
          </Dialog.Title>
          <Dialog.Description className={styles.description}>
            Select a variable to insert into your template.
          </Dialog.Description>

          <div className={styles.search}>
            <Input
              type="search"
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.list}>
            {filteredVariables.length === 0 ? (
              <div className={styles.empty}>
                No variables found matching "{search}"
              </div>
            ) : (
              filteredVariables.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  className={styles.variable}
                  onClick={() => handleInsert(variable.name)}
                >
                  <div className={styles.variableHeader}>
                    <span className={styles.variableName}>
                      {variable.label}
                    </span>
                    <span className={styles.variableCode}>
                      {`{{${variable.name}}}`}
                    </span>
                  </div>
                  <div className={styles.variableDescription}>
                    {variable.description}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
