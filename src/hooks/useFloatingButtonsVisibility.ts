import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'floating-buttons-visibility';

interface FloatingButtonsVisibility {
  chatButton: boolean;
  dialerButton: boolean;
  supportButton: boolean;
}

const getDefaults = (): FloatingButtonsVisibility => ({
  chatButton: true,
  dialerButton: true,
  supportButton: true,
});

const load = (): FloatingButtonsVisibility => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getDefaults(), ...JSON.parse(stored) };
  } catch {}
  return getDefaults();
};

export const useFloatingButtonsVisibility = () => {
  const [visibility, setVisibility] = useState<FloatingButtonsVisibility>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
    window.dispatchEvent(new CustomEvent('floating-buttons-changed', { detail: visibility }));
  }, [visibility]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as FloatingButtonsVisibility;
      setVisibility(detail);
    };
    window.addEventListener('floating-buttons-changed', handler);
    return () => window.removeEventListener('floating-buttons-changed', handler);
  }, []);

  const toggleChat = useCallback(() => {
    setVisibility(prev => ({ ...prev, chatButton: !prev.chatButton }));
  }, []);

  const toggleDialer = useCallback(() => {
    setVisibility(prev => ({ ...prev, dialerButton: !prev.dialerButton }));
  }, []);

  const toggleSupport = useCallback(() => {
    setVisibility(prev => ({ ...prev, supportButton: !prev.supportButton }));
  }, []);

  return {
    chatVisible: visibility.chatButton,
    dialerVisible: visibility.dialerButton,
    supportVisible: visibility.supportButton,
    toggleChat,
    toggleDialer,
    toggleSupport,
  };
};
