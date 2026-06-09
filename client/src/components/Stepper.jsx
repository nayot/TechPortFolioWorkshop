import { STEPS } from '../prompts.js';

export default function Stepper({ currentStep, completedSteps = [], onStepClick }) {
  return (
    <nav className="flex overflow-x-auto bg-gray-50 border-b border-gray-200 px-2 py-2 gap-1 shrink-0">
      {STEPS.map((step) => {
        const isDone = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors font-medium ${
              isCurrent && !isDone
                ? 'bg-indigo-600 text-white'
                : isDone
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isCurrent && !isDone ? 'bg-white/30 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {isDone ? '✓' : step.number}
            </span>
            <span>{step.titleTh}</span>
          </button>
        );
      })}
    </nav>
  );
}
