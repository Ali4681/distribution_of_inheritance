interface Step { label: string }

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
}

export default function StepWizard({ steps, currentStep }: StepWizardProps) {
  return (
    <div className="flex items-center justify-center mb-8 px-4">
      {steps.map((step, index) => {
        const n = index + 1;
        const isCompleted = n < currentStep;
        const isActive = n === currentStep;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              {/* Circle */}
              <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                isCompleted
                  ? "bg-gradient-gold shadow-gold text-white scale-105"
                  : isActive
                  ? "bg-gradient-primary shadow-primary text-white scale-110"
                  : "bg-white border-2 border-gray-200 text-gray-400"
              }`}>
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : n}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
                )}
              </div>
              {/* Label */}
              <span className={`text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive ? "text-primary" : isCompleted ? "text-gold" : "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="relative w-20 h-1 mx-2 mb-6 rounded-full bg-gray-200 overflow-hidden">
                <div className={`absolute inset-y-0 start-0 rounded-full transition-all duration-500 bg-gradient-gold ${
                  n < currentStep ? "w-full" : "w-0"
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
