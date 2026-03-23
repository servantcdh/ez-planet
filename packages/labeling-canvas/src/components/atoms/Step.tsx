import Icon from "./Icon";

interface StepType {
  step: number;
  currentStep: number;
  totalSteps?: number;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

function Step({
  step,
  currentStep,
  totalSteps,
  label,
  className,
  children,
}: StepType) {
  return (
    <div
      className={`step-wrapper ${totalSteps === step ? "step-wrapper-last" : ""} ${className}`}
    >
      <div
        className={`step-number ${step === currentStep ? "step-number-current" : step < currentStep ? "step-number-previous" : "step-number-next"}`}
      >
        {step >= currentStep ? step : <Icon iconType="icon-check" size="xs" />}
      </div>
      {label && (
        <div className="step-item">
          <p className="step-label">{label}</p>
        </div>
      )}

      <div className="step-dash-wrapper">
        <div className="step-dash"></div>
      </div>

      {children && <div className="step-content">{children}</div>}
    </div>
  );
}

export default Step;
