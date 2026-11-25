import React, { createContext, useContext, useState } from 'react';
import CustomModal from '../components/CustomModal';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: '',
    cancelText: '',
    isAlertOnly: false,
    onConfirm: null,
    onClose: null,
  });

  const showAlert = ({ title = 'Pemberitahuan', message, type = 'info', confirmText = 'Tutup' }) => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        isAlertOnly: true,
        onConfirm: () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onClose: () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  };

  const showConfirm = ({
    title = 'Konfirmasi Tindakan',
    message,
    type = 'warning',
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    onConfirm,
  }) => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        isAlertOnly: false,
        onConfirm: async () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          if (typeof onConfirm === 'function') {
            try {
              await onConfirm();
            } catch (e) {
              console.error('Error in onConfirm callback:', e);
            }
          }
          resolve(true);
        },
        onClose: () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={modalConfig.onClose || closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isAlertOnly={modalConfig.isAlertOnly}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

