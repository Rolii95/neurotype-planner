import { useState } from 'react';
import { 
  AdaptiveSmartProvider,
  ActivityRecallBanner,
  SuggestionEngine,
  QuickEntryComponent,
  ActivityInsights,
  useAdaptiveSmartFeatures
} from '../index';

/**
 * Demo page showing all Adaptive Smart Features integrated together
 * This serves as both a demo and integration test
 */
export function AdaptiveSmartDemo() {
  const [activeTab, setActiveTab] = useState<'recall' | 'suggestions' | 'quickentry' | 'insights'>('recall');

  return (
    <AdaptiveSmartProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <DemoHeader />
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'recall', name: 'Activity Recall', desc: 'Where Was I?' },
                  { id: 'suggestions', name: 'Smart Suggestions', desc: 'AI Recommendations' },
                  { id: 'quickentry', name: 'Quick Entry', desc: 'Universal Input' },
                  { id: 'insights', name: 'Activity Insights', desc: 'Usage Analytics' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <div className="text-left">
                      <div>{tab.name}</div>
                      <div className="text-xs text-gray-400">{tab.desc}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'recall' && <RecallDemo />}
              {activeTab === 'suggestions' && <SuggestionsDemo />}
              {activeTab === 'quickentry' && <QuickEntryDemo />}
              {activeTab === 'insights' && <InsightsDemo />}
            </div>
          </div>

          {/* Feature Status */}
          <FeatureStatus />
        </div>
      </div>
    </AdaptiveSmartProvider>
  );
}

function DemoHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Adaptive & Smart Functions Demo
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        Comprehensive neurotype-adaptive productivity features
      </p>
      
      {/* Neurotype indicator */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Neurotype-Adaptive Experience Active</span>
      </div>
    </div>
  );
}

function RecallDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Recall</h3>
        <p className="text-gray-600 mb-4">
          The "Where Was I?" feature helps you quickly return to your last meaningful activity.
        </p>
      </div>

      {/* Banner variant */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Banner Style</h4>
        <ActivityRecallBanner variant="banner" />
      </div>

      {/* Card variant */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Card Style</h4>
        <ActivityRecallBanner variant="card" />
      </div>

      {/* Minimal variant */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Minimal Style</h4>
        <ActivityRecallBanner variant="minimal" />
      </div>

      {/* Features list */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Automatic activity tracking across pages</li>
          <li>• Session duration monitoring</li>
          <li>• Last meaningful location memory</li>
          <li>• Neurotype-specific visual adaptations</li>
          <li>• Keyboard navigation support</li>
        </ul>
      </div>
    </div>
  );
}

function SuggestionsDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Suggestions</h3>
        <p className="text-gray-600 mb-4">
          AI-powered recommendations based on your activity patterns and neurotype.
        </p>
      </div>

      {/* Suggestion engine */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Live Suggestions</h4>
        <SuggestionEngine maxDisplayed={3} />
      </div>

      {/* Mock suggestions for demo */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Example Suggestions</h4>
        
        <div className="bg-blue-50 border-l-4 border-l-blue-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 bg-blue-500 rounded-full mt-0.5"></div>
            <div>
              <h5 className="font-medium text-blue-900">Take a Focus Break</h5>
              <p className="text-blue-800 text-sm">You've been active for 45 minutes. Consider taking a 5-10 minute break.</p>
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                  Take Break
                </button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                  Remind Later
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-l-green-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 bg-green-500 rounded-full mt-0.5"></div>
            <div>
              <h5 className="font-medium text-green-900">Check Your Routine</h5>
              <p className="text-green-800 text-sm">Time for your afternoon routine check. Stay on track!</p>
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                  Open Routine
                </button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                  Skip Today
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-l-4 border-l-purple-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 bg-purple-500 rounded-full mt-0.5"></div>
            <div>
              <h5 className="font-medium text-purple-900">Mood Check-In</h5>
              <p className="text-purple-800 text-sm">How are you feeling? Quick mood tracking helps personalize your experience.</p>
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
                  Check In
                </button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Neurotype-specific optimization</li>
          <li>• Real-time activity analysis</li>
          <li>• Confidence-based prioritization</li>
          <li>• Actionable recommendations</li>
          <li>• User preference learning</li>
        </ul>
      </div>
    </div>
  );
}

function QuickEntryDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Universal Quick Entry</h3>
        <p className="text-gray-600 mb-4">
          Capture thoughts, tasks, and ideas using text, voice, images, or links.
        </p>
      </div>

      {/* Quick entry form */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Try Quick Entry</h4>
        <QuickEntryComponent 
          placeholder="Try entering some text, or use voice/image input..."
          autoFocus={false}
        />
      </div>

      {/* Capability indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            📝
          </div>
          <div className="text-sm font-medium text-gray-900">Text Input</div>
          <div className="text-xs text-gray-500">Type or paste</div>
        </div>

        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            🎤
          </div>
          <div className="text-sm font-medium text-gray-900">Voice Input</div>
          <div className="text-xs text-gray-500">Speech recognition</div>
        </div>

        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            📷
          </div>
          <div className="text-sm font-medium text-gray-900">Image Upload</div>
          <div className="text-xs text-gray-500">Photos & files</div>
        </div>

        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            🔗
          </div>
          <div className="text-sm font-medium text-gray-900">Link Capture</div>
          <div className="text-xs text-gray-500">URLs & bookmarks</div>
        </div>
      </div>

      {/* Features list */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Multi-modal input support</li>
          <li>• AI-powered content processing</li>
          <li>• Automatic categorization</li>
          <li>• Entity extraction</li>
          <li>• Cross-device synchronization</li>
        </ul>
      </div>
    </div>
  );
}

function InsightsDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Insights</h3>
        <p className="text-gray-600 mb-4">
          Understand your productivity patterns and optimize your workflow.
        </p>
      </div>

      {/* Activity insights component */}
      <ActivityInsights timeRange="today" />

      {/* Features list */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Analytics Features</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Session duration tracking</li>
          <li>• Page usage statistics</li>
          <li>• Productivity scoring</li>
          <li>• Activity pattern recognition</li>
          <li>• Neurotype-specific insights</li>
        </ul>
      </div>
    </div>
  );
}

function FeatureStatus() {
  const { isEnabled } = useAdaptiveSmartFeatures();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Status</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(isEnabled).map(([feature, enabled]: [string, boolean]) => (
          <div key={feature} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-700 capitalize">
              {feature.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ✨ All features are designed with neurotype-specific adaptations for ADHD, Autism, Dyslexia, and general use
        </p>
      </div>
    </div>
  );
}

export default AdaptiveSmartDemo;
