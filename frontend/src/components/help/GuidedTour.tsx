import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import styles from './GuidedTour.module.css';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="documents"]',
    title: 'Documents',
    content: 'Upload and manage your source documents here. These will be analyzed to generate demand letters.',
    position: 'right',
  },
  {
    target: '[data-tour="templates"]',
    title: 'Templates',
    content: 'Create and manage demand letter templates with custom variables.',
    position: 'right',
  },
  {
    target: '[data-tour="letters"]',
    title: 'Demand Letters',
    content: 'Create new demand letters, view drafts, and manage your cases.',
    position: 'right',
  },
  {
    target: '[data-tour="help"]',
    title: 'Help',
    content: 'Access documentation, FAQs, and keyboard shortcuts anytime by clicking here or pressing ?',
    position: 'bottom',
  },
];

interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!isActive || !step) return;

    // Find target element
    const element = document.querySelector(step.target) as HTMLElement;
    setTargetElement(element);

    // Scroll into view
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep, step]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isActive || !step) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} />

      {/* Spotlight */}
      {targetElement && (
        <div
          className={styles.spotlight}
          style={{
            top: `${targetElement.offsetTop}px`,
            left: `${targetElement.offsetLeft}px`,
            width: `${targetElement.offsetWidth}px`,
            height: `${targetElement.offsetHeight}px`,
          }}
        />
      )}

      {/* Tooltip */}
      {targetElement && (
        <div
          className={`${styles.tooltip} ${styles[step.position || 'bottom']}`}
          style={{
            top: `${targetElement.offsetTop + targetElement.offsetHeight + 16}px`,
            left: `${targetElement.offsetLeft}px`,
          }}
        >
          <header className={styles.header}>
            <h3 className={styles.title}>{step.title}</h3>
            <span className={styles.progress}>
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
          </header>

          <p className={styles.content}>{step.content}</p>

          <footer className={styles.footer}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
            >
              Skip Tour
            </Button>

            <div className={styles.navigationButtons}>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </Button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};
