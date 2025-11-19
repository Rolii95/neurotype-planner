import React, { useState, useEffect, useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import { useI18n } from '../../i18n/index';

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string | number) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: string | number) => string | null;
  };
  'aria-describedby'?: string;
  className?: string;
}

interface FormFieldState {
  isValid: boolean;
  error: string | null;
  touched: boolean;
  focused: boolean;
}

export const AccessibleFormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  helpText,
  options,
  validation,
  'aria-describedby': ariaDescribedBy,
  className = ''
}) => {
  const [fieldState, setFieldState] = useState<FormFieldState>({
    isValid: true,
    error: null,
    touched: false,
    focused: false
  });

  const { 
    getAccessibilityClasses, 
    announceToScreenReader,
    focusElement 
  } = useAccessibility();
  
  const { t } = useI18n();
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  
  // Generate unique IDs for accessibility
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [
    helpText ? helpId : null,
    fieldState.error ? errorId : null,
    ariaDescribedBy
  ].filter(Boolean).join(' ');

  // Validation function
  const validateField = (currentValue: string | number): { isValid: boolean; error: string | null } => {
    if (required && (!currentValue || currentValue === '')) {
      return {
        isValid: false,
        error: t('validation.required', 'common', { field: label })
      };
    }

    if (validation) {
      const stringValue = String(currentValue);
      
      // Pattern validation
      if (validation.pattern && !validation.pattern.test(stringValue)) {
        return {
          isValid: false,
          error: t('validation.pattern', 'common', { field: label })
        };
      }
      
      // Length validation
      if (validation.minLength && stringValue.length < validation.minLength) {
        return {
          isValid: false,
          error: t('validation.minLength', 'common', { 
            field: label, 
            min: validation.minLength 
          })
        };
      }
      
      if (validation.maxLength && stringValue.length > validation.maxLength) {
        return {
          isValid: false,
          error: t('validation.maxLength', 'common', { 
            field: label, 
            max: validation.maxLength 
          })
        };
      }
      
      // Number validation
      if (type === 'number') {
        const numValue = Number(currentValue);
        
        if (validation.min !== undefined && numValue < validation.min) {
          return {
            isValid: false,
            error: t('validation.min', 'common', { 
              field: label, 
              min: validation.min 
            })
          };
        }
        
        if (validation.max !== undefined && numValue > validation.max) {
          return {
            isValid: false,
            error: t('validation.max', 'common', { 
              field: label, 
              max: validation.max 
            })
          };
        }
      }
      
      // Custom validation
      if (validation.custom) {
        const customError = validation.custom(currentValue);
        if (customError) {
          return {
            isValid: false,
            error: customError
          };
        }
      }
    }

    return { isValid: true, error: null };
  };

  // Handle value changes
  const handleChange = (newValue: string | number) => {
    onChange(newValue);
    
    // Validate if field has been touched
    if (fieldState.touched) {
      const validation = validateField(newValue);
      setFieldState(prev => ({
        ...prev,
        isValid: validation.isValid,
        error: validation.error
      }));
    }
  };

  // Handle blur event
  const handleBlur = () => {
    const validation = validateField(value);
    setFieldState(prev => ({
      ...prev,
      touched: true,
      focused: false,
      isValid: validation.isValid,
      error: validation.error
    }));

    // Announce validation errors to screen readers
    if (!validation.isValid && validation.error) {
      announceToScreenReader(`${t('accessibility.announcements.errorOccurred', 'accessibility', { message: validation.error })}`);
    }
  };

  // Handle focus event
  const handleFocus = () => {
    setFieldState(prev => ({ ...prev, focused: true }));
  };

  // Effect to validate on mount if there's a value
  useEffect(() => {
    if (value) {
      const validation = validateField(value);
      setFieldState(prev => ({
        ...prev,
        isValid: validation.isValid,
        error: validation.error
      }));
    }
  }, []);

  // Generate field classes
  const getFieldClasses = () => {
    const baseClasses = [
      'w-full px-3 py-2 border rounded-md',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      getAccessibilityClasses()
    ];

    if (fieldState.error) {
      baseClasses.push(
        'border-red-500 focus:ring-red-500',
        'aria-invalid'
      );
    } else if (fieldState.focused) {
      baseClasses.push(
        'border-blue-500 focus:ring-blue-500'
      );
    } else {
      baseClasses.push(
        'border-gray-300 focus:ring-blue-500'
      );
    }

    if (disabled) {
      baseClasses.push(
        'bg-gray-100 text-gray-500 cursor-not-allowed'
      );
    }

    return baseClasses.join(' ');
  };

  // Render input based on type
  const renderInput = () => {
    const commonProps = {
      id,
      ref: fieldRef as any,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
        handleChange(newValue);
      },
      onBlur: handleBlur,
      onFocus: handleFocus,
      className: getFieldClasses(),
      disabled,
      required,
      placeholder,
      'aria-invalid': !fieldState.isValid,
      'aria-describedby': describedBy || undefined,
      'aria-required': required
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            value={String(value)}
          />
        );
        
      case 'select':
        return (
          <select {...commonProps} value={String(value)}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      default:
        return (
          <input
            {...commonProps}
            type={type}
            value={type === 'number' ? Number(value) : String(value)}
          />
        );
    }
  };

  return (
    <div className={`form-field ${className}`}>
      {/* Label */}
      <label
        htmlFor={id}
        className={`block text-sm font-medium mb-1 ${
          fieldState.error ? 'text-red-700' : 'text-gray-700'
        }`}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label={t('accessibility.states.required', 'accessibility')}>
            *
          </span>
        )}
      </label>

      {/* Input Field */}
      {renderInput()}

      {/* Help Text */}
      {helpText && (
        <div
          id={helpId}
          className="mt-1 text-sm text-gray-600"
          aria-live="polite"
        >
          {helpText}
        </div>
      )}

      {/* Error Message */}
      {fieldState.error && (
        <div
          id={errorId}
          className="mt-1 text-sm text-red-600 flex items-center"
          role="alert"
          aria-live="assertive"
        >
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {fieldState.error}
        </div>
      )}
    </div>
  );
};

// Form component with comprehensive accessibility
interface AccessibleFormProps {
  onSubmit: (data: Record<string, any>) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  noValidate?: boolean;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  onSubmit,
  children,
  title,
  description,
  className = '',
  noValidate = true
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { announceToScreenReader } = useAccessibility();
  const { t } = useI18n();
  
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Collect form data
      const formData = new FormData(formRef.current!);
      const data = Object.fromEntries(formData.entries());
      
      await onSubmit(data);
      
      // Announce success
      announceToScreenReader(t('accessibility.announcements.formSubmitted', 'accessibility'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('app.error', 'common');
      setSubmitError(errorMessage);
      
      // Announce error
      announceToScreenReader(
        t('accessibility.announcements.errorOccurred', 'accessibility', { message: errorMessage })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      className={`accessible-form ${className}`}
      role="form"
      aria-label={title}
    >
      {/* Form Header */}
      {(title || description) && (
        <div className="form-header mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Form Content */}
      <div className="form-content space-y-4">
        {children}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div
          className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-500 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-700">{submitError}</span>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="form-actions mt-6 flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby={isSubmitting ? 'submit-status' : undefined}
        >
          {isSubmitting ? t('app.loading', 'common') : t('app.save', 'common')}
        </button>
        
        {isSubmitting && (
          <div
            id="submit-status"
            className="flex items-center text-gray-600"
            role="status"
            aria-live="polite"
          >
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('app.loading', 'common')}
          </div>
        )}
      </div>
    </form>
  );
};

export default {
  AccessibleFormField,
  AccessibleForm
};