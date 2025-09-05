import { useState } from 'react';

interface AlertState {
  type: 'success' | 'error';
  message: string;
  isOpen: boolean;
  autoClose: boolean;
}

export const useAlert = () => {
  const [alert, setAlert] = useState<AlertState>({
    type: 'success',
    message: '',
    isOpen: false,
    autoClose: false
  });

  const showSuccessAlert = (message: string, autoClose = false) => {
    setAlert({
      type: 'success',
      message,
      isOpen: true,
      autoClose
    });
  };

  const showErrorAlert = (message: string, autoClose = false) => {
    setAlert({
      type: 'error',
      message,
      isOpen: true,
      autoClose
    });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  return {
    alert,
    showSuccessAlert,
    showErrorAlert,
    closeAlert
  };
};
