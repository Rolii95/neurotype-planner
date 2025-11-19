// Onboarding service with Supabase integration
import { supabase } from './supabase';

export const onboardingService = {
  /**
   * Check if user has completed onboarding
   * @param userId - User ID to check
   * @returns Promise<boolean> - Whether onboarding is complete
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      console.log('🔍 Querying user_settings for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⏱️ Query timeout - assuming onboarding not complete');
          resolve(null);
        }, 5000); // 5 second timeout
      });
      
      const queryPromise = supabase
        .from('user_settings')
        .select('onboarding_status')
        .eq('user_id', userId)
        .maybeSingle();
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (!result) {
        console.log('⚠️ Query timed out or returned null');
        return false;
      }
      
      const { data, error } = result;
      console.log('📊 Query result:', { data, error });

      if (error) {
        console.error('❌ Error checking onboarding status:', error);
        // Assume not complete on error
        return false;
      }

      // If no record exists, onboarding is not complete
      if (!data) {
        console.log('ℹ️ No user_settings record found, onboarding not complete');
        return false;
      }

      const isComplete = data.onboarding_status === 'COMPLETE';
      console.log('✅ Onboarding status:', isComplete ? 'COMPLETE' : 'NOT COMPLETE');
      return isComplete;
    } catch (error) {
      console.error('❌ Failed to check onboarding status:', error);
      // Assume not complete on exception
      return false;
    }
  },

  /**
   * Mark onboarding as complete for a user
   * @param userId - User ID
   * @returns Promise<void>
   */
  async completeOnboarding(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          onboarding_status: 'COMPLETE',
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error completing onboarding:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  },

  /**
   * Save onboarding step data
   * @param userId - User ID
   * @param stepData - Data from onboarding step
   * @returns Promise<void>
   */
  async saveOnboardingStep(userId: string, stepData: any): Promise<void> {
    try {
      // Update user_settings with onboarding progress
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          onboarding_status: 'IN_PROGRESS',
          ...stepData,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving onboarding step:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save onboarding step:', error);
      throw error;
    }
  },

  /**
   * Get onboarding progress for a user
   * @param userId - User ID
   * @returns Promise<any> - Onboarding progress data
   */
  async getOnboardingProgress(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No progress yet
          return {
            currentStep: 0,
            totalSteps: 5,
            isComplete: false,
          };
        }
        console.error('Error getting onboarding progress:', error);
        return null;
      }

      return {
        currentStep: data.onboarding_status === 'COMPLETE' ? 5 : 
                     data.onboarding_status === 'IN_PROGRESS' ? 3 : 0,
        totalSteps: 5,
        isComplete: data.onboarding_status === 'COMPLETE',
        completedAt: data.onboarding_status === 'COMPLETE' ? new Date().toISOString() : null,
      };
    } catch (error) {
      console.error('Failed to get onboarding progress:', error);
      return null;
    }
  }
};