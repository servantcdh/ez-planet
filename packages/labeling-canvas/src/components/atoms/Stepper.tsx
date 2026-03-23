import Icon from "./Icon";

interface StepperType {
  totalSteps: number;
  currentStep: number;
  labels?: string[];
  direction?: "horizontal" | "vertical";
}

function Stepper({
  totalSteps,
  currentStep,
  labels,
  direction = "horizontal",
}: StepperType) {
  return (
    <div className={`stepper-wrapper stepper-wrapper-${direction}`}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, idx) => (
        <div key={step} className="step-wrapper">
          <div
            className={`step-number ${step === currentStep ? "step-number-current" : step < currentStep ? "step-number-previous" : "step-number-next"}`}
          >
            {step >= currentStep ? (
              step
            ) : (
              <Icon iconType="icon-check" size="xs" />
            )}
          </div>
          {labels && (
            <div className="step-item">
              <p className="step-label">{labels[step - 1]}</p>
            </div>
          )}
          {idx < totalSteps - 1 && (
            <div className="step-dash-wrapper">
              <div className="step-dash"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Stepper;
