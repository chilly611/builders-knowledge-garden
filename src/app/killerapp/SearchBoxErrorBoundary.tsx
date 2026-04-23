'use client';

/**
 * SearchBoxErrorBoundary
 * ======================
 * Isolates errors in WorkflowPickerSearchBox so a single component
 * failure doesn't take down the entire landing page.
 *
 * If search box fails, render a silent fallback (just hide the search box)
 * rather than showing an error UI — the TOC below is the real nav anyway.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class SearchBoxErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('SearchBox error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
