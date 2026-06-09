import { useState, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { STEPS } from '../prompts.js';
import Stepper from '../components/Stepper.jsx';
import Step1Profile from '../steps/Step1Profile.jsx';
import Step2Skills from '../steps/Step2Skills.jsx';
import Step3Projects from '../steps/Step3Projects.jsx';
import Step4Process from '../steps/Step4Process.jsx';
import Step5Evidence from '../steps/Step5Evidence.jsx';
import Step6Impact from '../steps/Step6Impact.jsx';
import Step7Reflection from '../steps/Step7Reflection.jsx';
import Step8CommercializationGaps from '../steps/Step8CommercializationGaps.jsx';

const STEP_COMPONENTS = {
  profile: Step1Profile,
  skills: Step2Skills,
  projects: Step3Projects,
  process: Step4Process,
  evidence: Step5Evidence,
  impact: Step6Impact,
  reflection: Step7Reflection,
  commercialization: Step8CommercializationGaps,
};

export default function WizardPage({ projectMeta, initialData, onAssemble, onBack }) {
  const [currentStep, setCurrentStep] = useState(STEPS[0].id);
  const [project, setProject] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  const completedSteps = STEPS
    .filter(s => {
      const data = project.steps?.[s.id];
      return data?.finalText || (data?.selections?.length > 0) || (Array.isArray(data?.selections) && data.selections.length > 0);
    })
    .map(s => s.id);

  const autosave = useCallback((data) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put(`/api/projects/${projectMeta.id}`, data);
      } catch (err) {
        console.error('[autosave]', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [projectMeta.id]);

  function handleStepSave(stepId, stepData) {
    setProject(prev => {
      const updated = {
        ...prev,
        steps: { ...prev.steps, [stepId]: stepData },
        ...(stepData.cvText ? { cvText: stepData.cvText } : {}),
      };
      autosave(updated);
      return updated;
    });

    const idx = STEPS.findIndex(s => s.id === stepId);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  }

  const currentStepConfig = STEPS.find(s => s.id === currentStep);
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <Stepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gold text-navy text-sm font-bold flex items-center justify-center shrink-0">{currentStepConfig.number}</span>
                <h2 className="text-lg font-bold text-navy">{currentStepConfig.titleTh}</h2>
              </div>
              <p className="text-xs text-warm-muted mt-1 ml-9">{currentStepConfig.description}</p>
            </div>
            {saving && <span className="text-xs text-warm-muted">💾 กำลังบันทึก...</span>}
          </div>

          <StepComponent
            project={project}
            onSave={(data) => handleStepSave(currentStep, data)}
          />

          <div className="mt-6 pt-4 border-t border-warm-border flex justify-between items-center">
            <button onClick={onBack} className="text-sm text-warm-muted hover:text-navy transition-colors">← รายการ Portfolio</button>
            <button
              onClick={() => onAssemble(project)}
              disabled={completedSteps.length < STEPS.length}
              title={completedSteps.length < STEPS.length ? `ยังเหลืออีก ${STEPS.length - completedSteps.length} ขั้นตอน` : ''}
              className="px-4 py-2 text-sm rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-warm-border disabled:text-warm-muted enabled:bg-navy enabled:text-white enabled:hover:bg-navy-hover enabled:border-2 enabled:border-navy"
            >
              ดูภาพรวม Portfolio →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
