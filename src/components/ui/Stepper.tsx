import { CheckIcon } from './icons';

export interface Step {
  id: number;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
  onStepClick?: (id: number) => void;
  maxReached?: number;
}

/** Indicador de etapas do wizard. */
export function Stepper({ steps, current, onStepClick, maxReached = current }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => {
        const done = step.id < current;
        const active = step.id === current;
        const reachable = step.id <= maxReached;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reachable || !onStepClick}
              onClick={() => reachable && onStepClick?.(step.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors ${
                reachable && onStepClick ? 'hover:bg-brand-50' : ''
              } ${!reachable ? 'cursor-not-allowed' : ''}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-positive text-white'
                    : active
                      ? 'bg-brand-800 text-white'
                      : 'bg-canvas text-ink-muted ring-1 ring-inset ring-line'
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : step.id}
              </span>
              <span
                className={`hidden font-medium sm:inline ${
                  active ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span className="h-px w-4 bg-line sm:w-8" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
