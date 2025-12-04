import React from 'react';
import { TransferState, VALID_COUNTRIES, VALID_METHODS, COUNTRY_CURRENCY_MAP } from '../types';
import { CheckCircle2, Circle, Globe, DollarSign, User, Building2, Info, AlertCircle } from 'lucide-react';

interface StatePanelProps {
  state: TransferState;
}

const StatePanel: React.FC<StatePanelProps> = ({ state }) => {
  // Determine expected currency if country is selected
  const expectedCurrency = state.destinationCountry 
    ? COUNTRY_CURRENCY_MAP[state.destinationCountry] || 'USD'
    : null;

  const steps = [
    {
      key: 'destinationCountry',
      label: 'Destination',
      value: state.destinationCountry,
      icon: Globe,
      placeholder: 'Where are we sending?',
      hint: `Supported: ${VALID_COUNTRIES.slice(0, 3).join(', ')}...`,
    },
    {
      key: 'amount',
      label: 'Amount',
      value: state.amount,
      icon: DollarSign,
      placeholder: 'How much?',
      // Show dynamic currency hint if country is known
      hint: expectedCurrency ? `Currency: ${expectedCurrency}` : undefined, 
    },
    {
      key: 'beneficiaryName',
      label: 'Beneficiary',
      value: state.beneficiaryName,
      icon: User,
      placeholder: 'Who is receiving?',
    },
    {
      key: 'deliveryMethod',
      label: 'Method',
      value: state.deliveryMethod,
      icon: Building2,
      placeholder: 'Bank, Cash, Wallet?',
      hint: `Options: ${VALID_METHODS.join(', ')}`,
    },
  ];

  // Logic to determine overall progress bar
  // We only count a step as "fully done" for the progress bar if it's not a warning state
  const completedStepsCount = steps.filter(step => {
    if (step.value === null) return false;
    // Special check for beneficiary name warning
    if (step.key === 'beneficiaryName') {
      const isWarning = (step.value as string).trim().split(/\s+/).length < 2;
      return !isWarning;
    }
    return true;
  }).length;

  const percentage = (completedStepsCount / steps.length) * 100;

  return (
    <div className="bg-white border-r border-slate-200 h-full flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Transfer Details</h2>
        <p className="text-sm text-slate-500">Live Agent State</p>
        
        <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              state.isComplete ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {steps.map((step) => {
          const isCompleted = step.value !== null;
          const Icon = step.icon;

          // Warning Logic: Specific for beneficiaryName if it exists but is short
          const isWarning = step.key === 'beneficiaryName' && 
                            isCompleted && 
                            (step.value as string).trim().split(/\s+/).length < 2;

          return (
            <div 
              key={step.key}
              className={`relative transition-all duration-300 ${
                isCompleted ? 'opacity-100' : 'opacity-80'
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Left Icon Box */}
                <div className={`mt-1 p-2 rounded-lg transition-colors ${
                  isWarning 
                    ? 'bg-amber-100 text-amber-600' // Warning Style
                    : isCompleted 
                      ? 'bg-blue-100 text-blue-600' // Success Style
                      : 'bg-slate-100 text-slate-400' // Empty Style
                }`}>
                  <Icon size={20} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {step.label}
                  </p>
                  <p className={`text-base font-medium ${
                    isWarning 
                      ? 'text-amber-700' 
                      : isCompleted 
                        ? 'text-slate-900' 
                        : 'text-slate-400 italic'
                  }`}>
                    {step.value || step.placeholder}
                  </p>
                  
                  {/* Validation Hint / Warning Message */}
                  {isWarning ? (
                     <div className="flex items-center mt-1 text-xs text-amber-600 font-medium">
                       <AlertCircle size={10} className="mr-1" />
                       Full name required
                    </div>
                  ) : (
                    !isCompleted && step.hint && (
                      <div className="flex items-center mt-1 text-xs text-slate-400">
                         <Info size={10} className="mr-1" />
                         {step.hint}
                      </div>
                    )
                  )}
                </div>

                {/* Right Status Icon */}
                <div className="mt-2">
                  {isWarning ? (
                    <AlertCircle size={18} className="text-amber-500 animate-pulse" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                    <Circle size={18} className="text-slate-300" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto p-6 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Status</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            state.isComplete 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {state.isComplete ? 'READY' : 'COLLECTING'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatePanel;

