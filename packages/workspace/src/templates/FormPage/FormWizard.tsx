'use client';

/**
 * FormWizard — multi-step form with Mantine Stepper.
 *
 * Features:
 * - Step indicator (numbered circles connected by lines, active step highlighted)
 * - Back/Next/Submit buttons in a sticky footer
 * - Per-step field validation before "Next" — errors prevent progression
 * - Back always works without data loss
 * - Step count displayed: "Step N of M"
 * - URL step tracking via onStepChange callback
 *
 * Implements US-133b.
 */

import React, { useState, useCallback } from 'react';
import { Stepper, Button, Group, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type { FieldConfig } from '../types';
import type { UseFormDraftResult } from './useFormDraft';
import { FieldRenderer } from './FormPageTemplate';
import classes from './FormPageTemplate.module.css';

export interface WizardStep {
  /** Unique identifier for the step. */
  id: string;
  /** Step label shown in the stepper. */
  label: string;
  /** Optional step description. */
  description?: string;
  /** Fields rendered in this step. */
  fields: FieldConfig[];
}

export interface FormWizardProps {
  /** Steps to render. */
  steps: WizardStep[];
  /** Draft hook providing form values and field updater. */
  draft: UseFormDraftResult<Record<string, unknown>>;
  /** Validation errors keyed by field key. */
  errors: Record<string, string>;
  /** Set errors for a specific set of field keys. */
  onValidate: (fieldKeys: string[]) => Record<string, string>;
  /** Called when the user submits the final step. */
  onSubmit: () => Promise<void>;
  /** Called when the user cancels. May be async (e.g. shows a confirm dialog). */
  onCancel: () => void | Promise<void>;
  /** Called when the active step changes (for URL sync). */
  onStepChange?: (step: number) => void;
  /** Whether the submission is in progress. */
  submitting?: boolean;
  /** Initial step index (0-based). */
  initialStep?: number;
  /** Field config extensions (e.g. select options). */
  fieldMeta?: Record<string, { options?: Array<{ value: string; label: string }> }>;
}

export function FormWizard({
  steps,
  draft,
  errors,
  onValidate,
  onSubmit,
  onCancel,
  onStepChange,
  submitting = false,
  initialStep = 0,
  fieldMeta = {},
}: FormWizardProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>(errors);
  // Note: submission-in-progress state is owned by the parent (via the `submitting` prop).
  // We do not duplicate it locally — the parent's setSubmitting drives the loading UI.

  const totalSteps = steps.length;
  const currentStep = steps[activeStep];
  const isLastStep = activeStep === totalSteps - 1;
  const isFirstStep = activeStep === 0;

  const handleNext = useCallback(async () => {
    if (!currentStep) return;
    // Validate the current step's fields.
    const fieldKeys = currentStep.fields.map((f) => f.key);
    const validationErrors = onValidate(fieldKeys);
    const hasErrors = Object.keys(validationErrors).length > 0;

    if (hasErrors) {
      setStepErrors(validationErrors);
      return;
    }

    setStepErrors({});

    if (isLastStep) {
      // Final step — delegate submission entirely to the parent.
      // The parent sets `submitting` which drives the button loading state.
      await onSubmit();
    } else {
      const next = activeStep + 1;
      setActiveStep(next);
      onStepChange?.(next);
    }
  }, [activeStep, currentStep, isLastStep, onValidate, onSubmit, onStepChange]);

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      void onCancel();
      return;
    }
    const prev = activeStep - 1;
    setActiveStep(prev);
    setStepErrors({});
    onStepChange?.(prev);
  }, [activeStep, isFirstStep, onCancel, onStepChange]);

  // Allow clicking a completed step to go back (not forward).
  const handleStepClick = useCallback(
    (index: number) => {
      if (index < activeStep) {
        setActiveStep(index);
        setStepErrors({});
        onStepChange?.(index);
      }
    },
    [activeStep, onStepChange],
  );

  return (
    <div className={classes.root} aria-label={t('form.wizard.ariaLabel')}>
      {/* Stepper */}
      <div className={`${classes.content} ${classes.stepperWrap}`} style={{ paddingBottom: 0 }}>
        <Stepper
          active={activeStep}
          onStepClick={handleStepClick}
          allowNextStepsSelect={false}
        >
          {steps.map((step) => (
            <Stepper.Step
              key={step.id}
              label={step.label}
              description={step.description}
            />
          ))}
        </Stepper>
      </div>

      {/* Step content */}
      <div className={classes.content} style={{ paddingTop: 'var(--v-space-6)' }}>
        <Stack gap="md" className={classes.formWrap}>
          {currentStep && (
            <>
              <Text
                className={classes.stepCount}
                aria-live="polite"
                aria-label={t('form.wizard.stepCount', {
                  current: String(activeStep + 1),
                  total: String(totalSteps),
                })}
              >
                {t('form.wizard.stepCount', {
                  current: String(activeStep + 1),
                  total: String(totalSteps),
                })}
              </Text>

              {currentStep.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={draft.values[field.key]}
                  error={stepErrors[field.key]}
                  onChange={(val) => draft.setFieldValue(field.key, val)}
                  fieldMeta={fieldMeta[field.key]}
                />
              ))}
            </>
          )}
        </Stack>
      </div>

      {/* Sticky footer */}
      <div className={classes.footer} role="group" aria-label={t('form.wizard.footerAriaLabel')}>
        <div className={classes.footerLeft}>
          {draft.isDirty && (
            <span className={classes.dirtyBadge} aria-live="polite">
              <span className={classes.dirtyDot} aria-hidden="true" />
              {t('form.dirty.modified')}
            </span>
          )}
        </div>

        <Group gap="sm">
          <Button
            variant="subtle"
            onClick={handleBack}
            disabled={submitting}
            leftSection={isFirstStep ? undefined : <IconArrowLeft size={14} aria-hidden="true" />}
            aria-label={isFirstStep ? t('form.wizard.cancel') : t('form.wizard.back')}
          >
            {isFirstStep ? t('form.wizard.cancel') : t('form.wizard.back')}
          </Button>

          <Button
            onClick={() => void handleNext()}
            loading={submitting}
            rightSection={
              isLastStep ? (
                <IconCheck size={14} aria-hidden="true" />
              ) : (
                <IconArrowRight size={14} aria-hidden="true" />
              )
            }
            aria-label={isLastStep ? t('form.submit') : t('form.wizard.next')}
          >
            {isLastStep ? t('form.submit') : t('form.wizard.next')}
          </Button>
        </Group>
      </div>
    </div>
  );
}
