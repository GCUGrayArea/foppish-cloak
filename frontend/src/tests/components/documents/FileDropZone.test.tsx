/**
 * Tests for FileDropZone Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropZone } from '../../../components/documents/FileDropZone';

describe('FileDropZone Component', () => {
  it('renders drop zone with instructions', () => {
    render(
      <FileDropZone onFilesSelected={vi.fn()} />
    );

    expect(screen.getByText(/Drag and drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to select files/i)).toBeInTheDocument();
  });

  it('shows supported file types', () => {
    render(
      <FileDropZone onFilesSelected={vi.fn()} />
    );

    expect(
      screen.getByText(/Supported: PDF, Word, Images, Spreadsheets/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 50 MB/i)).toBeInTheDocument();
  });

  it('calls onFilesSelected when valid files are dropped', () => {
    const onFilesSelected = vi.fn();
    render(
      <FileDropZone onFilesSelected={onFilesSelected} />
    );

    const file = new File(['content'], 'test.pdf', {
      type: 'application/pdf',
    });
    const dropZone = screen.getByRole('button', { name: /upload files/i });

    const dataTransfer = {
      files: [file],
      types: ['Files'],
    };

    fireEvent.drop(dropZone, { dataTransfer });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('handles drag over state', () => {
    render(
      <FileDropZone onFilesSelected={vi.fn()} />
    );

    const dropZone = screen.getByRole('button', { name: /upload files/i });

    fireEvent.dragEnter(dropZone);
    expect(screen.getByText(/Drop files here/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(/Drag and drop files here/i)).toBeInTheDocument();
  });

  it('validates files before calling onFilesSelected', () => {
    const onFilesSelected = vi.fn();
    const onValidationErrors = vi.fn();

    render(
      <FileDropZone
        onFilesSelected={onFilesSelected}
        onValidationErrors={onValidationErrors}
      />
    );

    // File too large (> 50MB)
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });

    const dropZone = screen.getByRole('button', { name: /upload files/i });
    const dataTransfer = {
      files: [largeFile],
      types: ['Files'],
    };

    fireEvent.drop(dropZone, { dataTransfer });

    expect(onValidationErrors).toHaveBeenCalled();
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <FileDropZone onFilesSelected={vi.fn()} disabled />
    );

    const dropZone = screen.getByRole('button', { name: /upload files/i });
    expect(dropZone).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports keyboard interaction', () => {
    render(
      <FileDropZone onFilesSelected={vi.fn()} />
    );

    const dropZone = screen.getByRole('button', { name: /upload files/i });
    dropZone.focus();
    expect(dropZone).toHaveFocus();

    // Keyboard interaction would trigger file input, but we can't test that
    // without actual file input interaction
  });
});
