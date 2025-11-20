import React from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useToast } from '../../contexts/ToastContext';

export const QuickAccessPanel: React.FC = () => {
  const { settings, updateSettings } = useAccessibility();
  const toast = useToast();
  React.useEffect(() => {
    const handler = () => {
      try {
        toast?.info('Opened Accessibility');
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('keyboard-shortcut:open-accessibility', handler as EventListener);
    return () => window.removeEventListener('keyboard-shortcut:open-accessibility', handler as EventListener);
  }, [toast]);
  const [rememberChoice, setRememberChoice] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('accessibilityRememberChoice') === 'true';
    } catch (e) {
      return false;
    }
  });

  const applySetting = (updates: Partial<any>) => {
    updateSettings(updates);
    try {
      if (rememberChoice) {
        toast?.success('Accessibility preference saved');
      }
    } catch (e) {
      console.debug('applySetting error', e);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button
        id="quick-access-panel-summary"
        aria-label="Open accessibility quick access"
        className="p-2 rounded-lg persona-ghost-button"
      >
        Accessibility
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute right-0 mt-2 w-64 persona-panel p-4 shadow-lg z-50 focus:outline-none" static>
          <h4 className="text-sm font-semibold mb-2">Quick Accessibility</h4>

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">High Contrast</div>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => applySetting({ highContrast: e.target.checked })}
              aria-label="Toggle high contrast mode"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">Dyslexia Font</div>
            <input
              type="checkbox"
              checked={settings.dyslexiaFont}
              onChange={(e) => applySetting({ dyslexiaFont: e.target.checked })}
              aria-label="Toggle dyslexia-friendly font"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">Reduced Motion</div>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => applySetting({ reducedMotion: e.target.checked })}
              aria-label="Toggle reduced motion"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm">Font Size</div>
            <select
              value={settings.fontSize}
              onChange={(e) => applySetting({ fontSize: e.target.value as any })}
              className="ml-2 rounded border px-2 py-1"
              aria-label="Select base font size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="mt-3 text-xs text-gray-500">Changes are saved locally and applied immediately.</div>
          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm">Remember my choice</label>
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => {
                const v = e.target.checked;
                setRememberChoice(v);
                try { localStorage.setItem('accessibilityRememberChoice', String(v)); } catch (err) { console.debug('Failed to persist rememberChoice', err); }
                toast?.info(v ? 'Will remember accessibility preferences' : 'Will not remember accessibility preferences');
              }}
              aria-label="Remember accessibility choice"
            />
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default QuickAccessPanel;
