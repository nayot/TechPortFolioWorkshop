import { STEPS } from '../prompts.js';

export default function Stepper({ currentStep, completedSteps = [], onStepClick }) {
  return (
    <nav className="flex overflow-x-auto bg-navy/5 border-b-2 border-warm-border px-2 py-2 gap-1 shrink-0">
      {STEPS.map((step) => {
        const isDone = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors font-medium border ${
              isCurrent && !isDone
                ? 'bg-navy text-white border-navy'
                : isDone
                ? 'bg-gold-pale text-navy border-gold hover:bg-gold-light'
                : 'text-navy/60 border-transparent hover:bg-cream hover:border-warm-border'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isCurrent && !isDone ? 'bg-gold text-navy' : isDone ? 'bg-gold text-navy' : 'bg-warm-border text-navy/50'
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
