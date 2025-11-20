import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { DemoStorage, SupabaseStorage, setActiveAdapter } from '../services/storageAdapters';
import { createClient } from '@supabase/supabase-js';

interface StorageProviderProps {
  children: ReactNode;
  mode?: 'auto' | 'demo' | 'supabase';
}

const StorageContext = createContext<{ mode: 'demo' | 'supabase' } | undefined>(undefined);

export const useStorageMode = () => {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorageMode must be used within StorageProvider');
  return ctx.mode;
};

export const StorageProvider: React.FC<StorageProviderProps> = ({ children, mode = 'auto' }) => {
  useEffect(() => {
    // Determine mode and set active adapter accordingly
    if (mode === 'demo') {
      setActiveAdapter(new DemoStorage());
      return;
    }

    if (mode === 'supabase') {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) {
        console.warn('Requested supabase mode but env vars missing; falling back to demo adapter');
        setActiveAdapter(new DemoStorage());
        return;
      }
      const client = createClient(url, key, { auth: { storageKey: 'neurotype-planner-auth' } });
      setActiveAdapter(new SupabaseStorage(client));
      return;
    }

    // auto mode: pick based on envs
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) setActiveAdapter(new DemoStorage());
    else setActiveAdapter(new SupabaseStorage(createClient(url, key, { auth: { storageKey: 'neurotype-planner-auth' } })));
  }, [mode]);

  const effectiveMode = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (mode === 'demo') return 'demo';
    if (mode === 'supabase') return 'supabase';
    return (!url || !key) ? 'demo' : 'supabase';
  };

  return (
    <StorageContext.Provider value={{ mode: effectiveMode() }}>
      {children}
    </StorageContext.Provider>
  );
};
