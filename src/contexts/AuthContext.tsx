import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { supabase, isSupabaseDemoMode } from '../services/supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  neurotype?: string;
  ageGroup?: string;
  preferences: Record<string, any>;
  createdAt: Date;
  lastActiveAt: Date;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (isSupabaseDemoMode || !supabase) {
      console.warn('Demo mode or supabase unavailable — skipping profile fetch');
      return;
    }

    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⏱️ Profile query timeout');
          resolve(null);
        }, 5000); // 5 second timeout
      });
      
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (!result) {
        console.log('⚠️ Profile query timed out');
        return;
      }
      
      const { data, error } = result;
      console.log('📊 Profile query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return;
      }

      if (!data) {
        console.log('ℹ️ Profile not found, creating it now...');
          // Get user from auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Create profile only if the DB returns no profile; creation may still fail under strict RLS
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: user.email || '',
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
              neurotype: (user.user_metadata?.neurotype || 'exploring') as any,
              age_group: (user.user_metadata?.age_group || 'adult') as any,
              preferences: {},
            });

          if (createError) {
            // Be defensive: log and continue — do not throw, since RLS may block server-side triggers
            console.warn('Profile creation skipped or failed (RLS may be active):', createError.message || createError);
          } else {
            console.log('✅ Profile created (or upserted) successfully');
          }

          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (newProfile) {
            setProfile({
              id: newProfile.id,
              email: newProfile.email || '',
              displayName: newProfile.display_name,
              neurotype: newProfile.neurotype,
              ageGroup: newProfile.age_group,
              preferences: newProfile.preferences || {},
              createdAt: new Date(newProfile.created_at),
              lastActiveAt: new Date(newProfile.last_active_at || newProfile.created_at),
            });
            console.log('✅ Profile set successfully');
          }
        }
        return;
      }

      // Profile exists, set it
      setProfile({
        id: data.id,
        email: data.email || '',
        displayName: data.display_name,
        neurotype: data.neurotype,
        ageGroup: data.age_group,
        preferences: data.preferences || {},
        createdAt: new Date(data.created_at),
        lastActiveAt: new Date(data.last_active_at || data.created_at),
      });
      console.log('✅ Profile loaded successfully');
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
    }
  }, []); // Empty dependencies - this function doesn't depend on any props or state

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        // Guard against demo mode or missing client
        if (isSupabaseDemoMode || !supabase) {
          console.warn('Demo mode or supabase not available — skipping auth initialization in AuthContext');
          if (mounted) setIsLoading(false);
          return;
        }

        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        console.log('📊 Initial session:', { hasSession: !!initialSession, error });

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (initialSession && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Small delay to ensure RLS context is established then fetch profile
          await new Promise(resolve => setTimeout(resolve, 100));
          await fetchUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete, setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      console.log('Auth state changed:', event);
      
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Small delay to ensure RLS context is established
          await new Promise(resolve => setTimeout(resolve, 100));
          await fetchUserProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        
        // Ensure loading is false after state change
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]); // Add fetchUserProfile to dependencies

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    if (isSupabaseDemoMode || !supabase) {
      const err = new Error('Authentication unavailable: Supabase is not configured');
      console.warn(err.message);
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Session and user will be set by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  }, []);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    if (isSupabaseDemoMode || !supabase) {
      const err = new Error('Authentication unavailable: Supabase is not configured');
      console.warn(err.message);
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: metadata?.displayName || email.split('@')[0],
            neurotype: metadata?.neurotype || 'exploring',
            age_group: metadata?.ageGroup || 'adult',
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        return { error };
      }

      // Wait for auth to fully initialize, then attempt to create profile
      if (data.user && data.session) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: metadata?.displayName || email.split('@')[0],
            neurotype: (metadata?.neurotype || 'exploring') as any,
            age_group: (metadata?.ageGroup || 'adult') as any,
            preferences: metadata?.preferences || {},
          }, { onConflict: 'id' });

        if (profileError) {
          console.warn('Profile upsert failed; RLS may be blocking automatic profile creation:', profileError.message || profileError);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (isSupabaseDemoMode || !supabase) {
      const err = new Error('Authentication unavailable: Supabase is not configured');
      console.warn(err.message);
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: err };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    if (isSupabaseDemoMode || !supabase) {
      const err = new Error('Profile update unavailable: Supabase is not configured');
      console.warn(err.message);
      return { error: err };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: updates.displayName,
          neurotype: updates.neurotype,
          age_group: updates.ageGroup,
          preferences: updates.preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          ...updates,
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  }, [user, profile]);

  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }), [user, session, profile, isLoading, signIn, signUp, signOut, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};