import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import CommandPalette from '../CommandPalette';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('CommandPalette', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should not render when closed', () => {
    const { container } = render(<CommandPalette />);
    const modal = container.querySelector('[role="listbox"]');
    expect(modal).toBeNull();
  });

  it('should open with Cmd+K on Mac', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });
  });

  it('should open with Ctrl+K on Windows/Linux', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });
  });

  it('should close with Escape', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Where to?')).toBeNull();
    });
  });

  it('should show popular items when input is empty', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByText('Code compliance')).toBeInTheDocument();
      expect(screen.getByText('Supply ordering')).toBeInTheDocument();
    });
  });

  it('should filter results based on search query', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Where to?') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'daily' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Daily log')).toBeInTheDocument();
    });
  });

  it('should navigate with arrow keys', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should navigate to item on Enter', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('should close on outside click', async () => {
    const { container } = render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Where to?')).toBeInTheDocument();
    });

    const backdrop = container.querySelector('[role="listbox"]')?.parentElement?.previousElementSibling;
    if (backdrop) {
      fireEvent.mouseDown(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Where to?')).toBeNull();
    });
  });

  it('should focus input when opened', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Where to?') as HTMLInputElement;
      expect(input === document.activeElement).toBe(true);
    });
  });
});
