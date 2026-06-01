'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// 광고 컴포넌트 트리에서 예외가 발생하면 fallback 으로 대체.
// silverdrive AdErrorBoundary 패턴 그대로 — 빈 공간 대신 자체 컨버전 동선(promo/newsletter)으로 회복.
export class AdErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    // 광고 로드 실패는 정상 경로의 일부 (네트워크/AdSense 정책/AdBlock). 진단용 warn 만 남김.
    console.warn('[AdSense] 광고 로드 실패:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
