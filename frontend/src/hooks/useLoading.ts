import { useState } from 'react';

interface LoadingState {
  isOpen: boolean;
  message: string;
}

export const useLoading = () => {
  const [loading, setLoading] = useState<LoadingState>({
    isOpen: false,
    message: '로딩 중...'
  });

  const showLoading = (message = '로딩 중...') => {
    setLoading({
      isOpen: true,
      message
    });
  };

  const hideLoading = () => {
    setLoading(prev => ({ ...prev, isOpen: false }));
  };

  // axios 호출을 래핑하는 함수
  const withLoading = async <T>(
    apiCall: () => Promise<T>,
    options?: { message?: string; showLoading?: boolean }
  ): Promise<T> => {
    const { message = '로딩 중...', showLoading: shouldShowLoading = true } = options || {};
    
    try {
      if (shouldShowLoading) {
        showLoading(message);
      }
      const result = await apiCall();
      return result;
    } finally {
      if (shouldShowLoading) {
        hideLoading();
      }
    }
  };

  return {
    loading,
    showLoading,
    hideLoading,
    withLoading
  };
};
