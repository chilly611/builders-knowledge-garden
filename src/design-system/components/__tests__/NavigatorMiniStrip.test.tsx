import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import NavigatorMiniStrip from '../NavigatorMiniStrip';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock the stage-from-pathname utility
jest.mock('@/lib/stage-from-pathname', () => ({
  stageFromPathname: (pathname: string) => {
    const match = pathname.match(/\/(\d+)-/);
    return match ? parseInt(match[1], 10) : 0;
  },
}));

describe('NavigatorMiniStrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 639px)' ? false : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('renders nothing on landing page (stage 0)', () => {
    (usePathname as jest.Mock).mockReturnValue('/killerapp');

    const { container } = render(<NavigatorMiniStrip />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the mini strip on a workflow page (stage > 0)', () => {
    (usePathname as jest.Mock).mockReturnValue('/killerapp/workflows/estimating');

    // Mock localStorage data
    localStorage.setItem('bkg:journey:default', JSON.stringify({}));
    localStorage.setItem(
      'bkg:budget:default',
      JSON.stringify({
        totalCommittedCents: 38500,
        totalSpentCents: 4720,
        isOverbudget: false,
        overAmountCents: 0,
        byStage: {},
      })
    );
    localStorage.setItem('bkg:time-machine:default', JSON.stringify({ snapshots: [] }));

    const { container } = render(<NavigatorMiniStrip />);
    expect(container.firstChild).not.toBeNull();
  });

  it('dispatches bkg:navigator:expand on left button click', async () => {
    (usePathname as jest.Mock).mockReturnValue('/killerapp/workflows/estimating');
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    localStorage.setItem('bkg:journey:default', JSON.stringify({}));
    localStorage.setItem(
      'bkg:budget:default',
      JSON.stringify({
        totalCommittedCents: 0,
        totalSpentCents: 0,
        isOverbudget: false,
        overAmountCents: 0,
        byStage: {},
      })
    );
    localStorage.setItem('bkg:time-machine:default', JSON.stringify({ snapshots: [] }));

    render(<NavigatorMiniStrip />);

    const leftButton = screen.getByTitle('Open journey navigator');
    await userEvent.click(leftButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bkg:navigator:expand',
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('dispatches bkg:time-machine:open on center button click', async () => {
    (usePathname as jest.Mock).mockReturnValue('/killerapp/workflows/estimating');
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    localStorage.setItem('bkg:journey:default', JSON.stringify({}));
    localStorage.setItem(
      'bkg:budget:default',
      JSON.stringify({
        totalCommittedCents: 0,
        totalSpentCents: 0,
        isOverbudget: false,
        overAmountCents: 0,
        byStage: {},
      })
    );
    localStorage.setItem('bkg:time-machine:default', JSON.stringify({ snapshots: [] }));

    render(<NavigatorMiniStrip />);

    const centerButton = screen.getByTitle('Open Time Machine');
    await userEvent.click(centerButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bkg:time-machine:open',
      })
    );

    dispatchEventSpy.mockRestore();
  });

  it('dispatches bkg:budget:detail on right button click', async () => {
    (usePathname as jest.Mock).mockReturnValue('/killerapp/workflows/estimating');
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    localStorage.setItem('bkg:journey:default', JSON.stringify({}));
    localStorage.setItem(
      'bkg:budget:default',
      JSON.stringify({
        totalCommittedCents: 0,
        totalSpentCents: 0,
        isOverbudget: false,
        overAmountCents: 0,
        byStage: {},
      })
    );
    localStorage.setItem('bkg:time-machine:default', JSON.stringify({ snapshots: [] }));

    render(<NavigatorMiniStrip />);

    const rightButton = screen.getByTitle('View budget details');
    await userEvent.click(rightButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bkg:budget:detail',
      })
    );

    dispatchEventSpy.mockRestore();
  });
});
