import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { message, resolve } or null
  const cancelButtonRef = useRef(null);

  const confirm = (message) => {
    return new Promise((resolve) => {
      setDialog({ message, resolve });
    });
  };

  const handleClose = (result) => {
    if (dialog) {
      dialog.resolve(result);
      setDialog(null);
    }
  };

  // Focus cancel button on open and handle Esc key for close
  useEffect(() => {
    if (dialog) {
      cancelButtonRef.current?.focus();
      
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleClose(false);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="confirm-backdrop" onClick={() => handleClose(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message-container">
              <span className="confirm-message-text">{dialog.message}</span>
            </div>
            <div className="confirm-actions-toast">
              <button 
                type="button"
                className="confirm-btn-cross" 
                onClick={() => handleClose(false)}
                ref={cancelButtonRef}
                title="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <button 
                type="button"
                className="confirm-btn-tick" 
                onClick={() => handleClose(true)}
                title="Confirm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
