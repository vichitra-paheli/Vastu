'use client';

/**
 * FormPageTemplate — data entry form template with single-page and wizard modes.
 *
 * Features:
 * - Registered as 'form-page' panel type
 * - Uses useTemplateConfig for config persistence
 * - Renders fields dynamically from config (text, number, date, select, checkbox, textarea)
 * - Inline-on-blur validation with required field checking
 * - Submit/cancel buttons in sticky footer
 * - Auto-save draft via useFormDraft
 * - Dirty state indicator (goldenrod dot per design system)
 * - Multi-step wizard mode via FormWizard
 * - Loading skeleton via TemplateSkeleton variant="form-page"
 *
 * Implements US-133.
 */

import React, { useState, useCallback, useId, useMemo } from 'react';
import {
  Stack,
  TextInput,
  NumberInput,
  Select,
  MultiSelect,
  Checkbox,
  Textarea,
  Button,
  Group,
  Alert,
  Text,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TemplateSkeleton } from '../TemplateSkeleton';
import { useTemplateConfig } from '../useTemplateConfig';
import type { FieldConfig, TemplateConfig } from '../types';
import { useFormDraft } from './useFormDraft';
import { FormWizard } from './FormWizard';
import type { WizardStep } from './FormWizard';
import classes from './FormPageTemplate.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Extended field config for form-page specific attributes. */
export interface FormFieldConfig extends FieldConfig {
  /** Whether this field is required (blocks submit if empty). */
  required?: boolean;
  /** Validation error message (defaults to "This field is required"). */
  requiredMessage?: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** For textarea fields — number of rows. */
  rows?: number;
  /** For select/multi-select fields — available options. */
  options?: Array<{ value: string; label: string }>;
  /** For relation fields — entity type label (e.g. "Customer"). */
  relationLabel?: string;
}

/** Form-page specific metadata stored in config.metadata. */
interface FormPageMetadata {
  /** 'single' = one-page form (default), 'wizard' = multi-step stepper. */
  mode?: 'single' | 'wizard';
  /** Wizard step definitions (only relevant when mode === 'wizard'). */
  steps?: WizardStep[];
  /** API endpoint to POST form data to. */
  submitEndpoint?: string;
  /** Cancel navigation target. */
  cancelTarget?: string;
}

/** Props passed from the panel host. */
export interface FormPageTemplateProps {
  /** The page ID — used to load/save config. */
  pageId: string;
}

// ── Field renderer ─────────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: FieldConfig;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  fieldMeta?: { options?: Array<{ value: string; label: string }> };
}

/**
 * Renders the appropriate Mantine input for a given field type.
 * Exported for use in FormWizard.
 */
export function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onBlur,
  fieldMeta,
}: FieldRendererProps) {
  const formField = field as FormFieldConfig;
  const fieldId = useId();
  const options = formField.options ?? fieldMeta?.options ?? [];

  const labelNode = (
    <span className={classes.fieldLabel}>
      {field.label}
      {formField.required && (
        <span className={classes.required} aria-hidden="true">
          *
        </span>
      )}
    </span>
  );

  const baseProps = {
    id: fieldId,
    label: labelNode,
    error: error,
    disabled: !field.visible && field.visible !== undefined,
    onBlur,
    styles: {
      label: { marginBottom: 'var(--v-space-1)' },
      error: { fontSize: 'var(--v-text-xs)', color: 'var(--v-status-error)' },
    },
  };

  switch (field.type) {
    case 'text':
      return (
        <TextInput
          {...baseProps}
          value={typeof value === 'string' ? value : ''}
          placeholder={formField.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-required={formField.required}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      );

    case 'number':
      return (
        <NumberInput
          {...baseProps}
          value={typeof value === 'number' ? value : ''}
          placeholder={formField.placeholder}
          onChange={(val) => onChange(val)}
          aria-required={formField.required}
          aria-invalid={!!error}
        />
      );

    case 'date':
      // @mantine/dates is not in the workspace deps — use TextInput with type="date".
      return (
        <TextInput
          {...baseProps}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-required={formField.required}
          aria-invalid={!!error}
        />
      );

    case 'enum':
      if (options.length === 0) {
        // Fallback to text input when no options configured.
        return (
          <TextInput
            {...baseProps}
            value={typeof value === 'string' ? value : ''}
            placeholder={formField.placeholder ?? t('form.field.select.placeholder')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }
      return (
        <Select
          {...baseProps}
          value={typeof value === 'string' ? value : null}
          placeholder={formField.placeholder ?? t('form.field.select.placeholder')}
          data={options}
          onChange={(val) => onChange(val ?? '')}
          searchable={options.length > 8}
          clearable
          aria-required={formField.required}
          aria-invalid={!!error}
        />
      );

    case 'boolean':
      return (
        <Checkbox
          id={fieldId}
          label={field.label}
          checked={typeof value === 'boolean' ? value : false}
          onChange={(e) => onChange(e.currentTarget.checked)}
          error={error}
          aria-required={formField.required}
          aria-invalid={!!error}
          styles={{ label: { fontWeight: 'var(--v-font-regular)' as never } }}
        />
      );

    case 'relation':
      // Multi-select for relations; SearchOrCreate is used when explicitly configured.
      if (options.length > 0) {
        const multiValue = Array.isArray(value)
          ? (value as string[])
          : typeof value === 'string' && value
            ? [value]
            : [];
        return (
          <MultiSelect
            {...baseProps}
            value={multiValue}
            placeholder={
              formField.placeholder ??
              t('form.field.relation.placeholder', {
                label: formField.relationLabel ?? field.label,
              })
            }
            data={options}
            onChange={(val) => onChange(val)}
            searchable
            clearable
            aria-required={formField.required}
            aria-invalid={!!error}
          />
        );
      }
      // No options — fall back to text input.
      return (
        <TextInput
          {...baseProps}
          value={typeof value === 'string' ? value : ''}
          placeholder={formField.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-required={formField.required}
          aria-invalid={!!error}
        />
      );

    default: {
      // Exhaustiveness safety — render textarea for any unrecognised extended type.
      return (
        <Textarea
          {...baseProps}
          value={typeof value === 'string' ? value : ''}
          placeholder={formField.placeholder}
          rows={formField.rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          autosize
          aria-required={formField.required}
          aria-invalid={!!error}
        />
      );
    }
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

function buildInitialValues(fields: FieldConfig[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'boolean':
        values[field.key] = false;
        break;
      case 'number':
        values[field.key] = '';
        break;
      default:
        values[field.key] = '';
    }
  }
  return values;
}

function validateFields(
  fields: FieldConfig[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const formField = field as FormFieldConfig;
    if (!formField.required) continue;
    const val = values[field.key];
    const isEmpty =
      val === '' ||
      val === null ||
      val === undefined ||
      (Array.isArray(val) && val.length === 0);
    if (isEmpty) {
      errors[field.key] =
        formField.requiredMessage ?? t('form.validation.required', { field: field.label });
    }
  }
  return errors;
}

// ── Single-page form ────────────────────────────────────────────────────────────

interface SinglePageFormProps {
  fields: FieldConfig[];
  draft: ReturnType<typeof useFormDraft<Record<string, unknown>>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  submitError: string | null;
}

function SinglePageForm({
  fields,
  draft,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}: SinglePageFormProps) {
  const formId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = useCallback(
    (fieldKey: string) => {
      setTouched((prev) => ({ ...prev, [fieldKey]: true }));
      // Validate just this field on blur.
      const singleField = fields.filter((f) => f.key === fieldKey);
      const fieldErrors = validateFields(singleField, draft.values);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return { ...next, ...fieldErrors };
      });
    },
    [fields, draft.values],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Mark all fields as touched.
      const allTouched: Record<string, boolean> = {};
      for (const f of fields) {
        allTouched[f.key] = true;
      }
      setTouched(allTouched);

      const allErrors = validateFields(fields, draft.values);
      setErrors(allErrors);

      if (Object.keys(allErrors).length > 0) return;

      await onSubmit();
    },
    [fields, draft.values, onSubmit],
  );

  return (
    <div className={classes.root} aria-label={t('form.singlePage.ariaLabel')}>
      <form
        id={formId}
        className={classes.content}
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        aria-label={t('form.singlePage.formAriaLabel')}
      >
        <Stack gap="md" className={classes.formWrap}>
          {submitError && (
            <Alert
              icon={<IconAlertCircle size={16} aria-hidden="true" />}
              color="red"
              role="alert"
              aria-live="assertive"
            >
              {submitError}
            </Alert>
          )}

          {fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={draft.values[field.key]}
              error={touched[field.key] ? errors[field.key] : undefined}
              onChange={(val) => draft.setFieldValue(field.key, val)}
              onBlur={() => handleBlur(field.key)}
            />
          ))}
        </Stack>

        {/* Hidden submit for Enter key support */}
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
      </form>

      {/* Sticky footer */}
      <div className={classes.footer} role="group" aria-label={t('form.footer.ariaLabel')}>
        <div className={classes.footerLeft}>
          {draft.isDirty && (
            <Text
              className={classes.dirtyBadge}
              aria-live="polite"
              aria-label={t('form.dirty.ariaLabel')}
            >
              <span className={classes.dirtyDot} aria-hidden="true" />
              {t('form.dirty.modified')}
            </Text>
          )}
          {draft.draftRestored && !draft.isDirty && (
            <Text size="xs" c="dimmed" aria-live="polite">
              {t('form.draft.restored')}
            </Text>
          )}
        </div>

        <Group gap="sm">
          <Button
            variant="subtle"
            onClick={onCancel}
            disabled={submitting}
            aria-label={t('form.cancel')}
          >
            {t('form.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            aria-label={t('form.submit')}
          >
            {t('form.submit')}
          </Button>
        </Group>
      </div>
    </div>
  );
}

// ── Main template ──────────────────────────────────────────────────────────────

/**
 * FormPageTemplate — registered as 'form-page' panel type.
 *
 * Reads config from useTemplateConfig and renders either a single-page form
 * or a multi-step wizard depending on config.metadata.mode.
 */
export function FormPageTemplate({ pageId }: FormPageTemplateProps) {
  const { config, loading, error: configError } = useTemplateConfig(pageId);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derive field list and form metadata from config.
  // Memoize to avoid creating new array references on every render — this keeps
  // useCallback dependencies stable and avoids the exhaustive-deps lint warning.
  const fields: FieldConfig[] = useMemo(() => config?.fields ?? [], [config?.fields]);
  const meta = useMemo(() => (config?.metadata ?? {}) as FormPageMetadata, [config?.metadata]);
  const mode = meta.mode ?? 'single';
  const wizardSteps = useMemo(() => meta.steps ?? [], [meta.steps]);

  // Build initial values from field definitions.
  const initialValues = buildInitialValues(fields);

  const draft = useFormDraft<Record<string, unknown>>(
    `form-page:${pageId}`,
    initialValues,
  );

  // Wizard validate callback — validates a subset of fields.
  const handleWizardValidate = useCallback(
    (fieldKeys: string[]): Record<string, string> => {
      const subset = fields.filter((f) => fieldKeys.includes(f.key));
      return validateFields(subset, draft.values);
    },
    [fields, draft.values],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const endpoint = meta.submitEndpoint ?? `/api/workspace/pages/${pageId}/records`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: draft.values }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? t('form.submit.error'));
      }
      draft.markClean();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('form.submit.error'));
    } finally {
      setSubmitting(false);
    }
  }, [meta.submitEndpoint, pageId, draft]);

  const handleCancel = useCallback(() => {
    if (draft.isDirty) {
      // In production, this would use ConfirmDialog. For now, use native confirm.
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(t('form.dirty.discardConfirm'));
      if (!confirmed) return;
    }
    draft.clearDraft();
  }, [draft]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return <TemplateSkeleton variant="form-page" />;
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (configError) {
    return (
      <div className={classes.root} role="alert" aria-live="assertive">
        <div className={classes.content}>
          <div className={classes.errorAlert}>{configError}</div>
        </div>
      </div>
    );
  }

  // ── No config — empty state ─────────────────────────────────────────────
  if (!config || fields.length === 0) {
    return (
      <div className={classes.root}>
        <div className={classes.content}>
          <Stack gap="md" className={classes.formWrap}>
            <Text c="dimmed" size="sm" aria-label={t('form.empty.ariaLabel')}>
              {t('form.empty.message')}
            </Text>
          </Stack>
        </div>
      </div>
    );
  }

  // ── Wizard mode ──────────────────────────────────────────────────────────
  if (mode === 'wizard' && wizardSteps.length > 0) {
    return (
      <FormWizard
        steps={wizardSteps}
        draft={draft}
        errors={{}}
        onValidate={handleWizardValidate}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    );
  }

  // ── Single-page mode ─────────────────────────────────────────────────────
  return (
    <SinglePageForm
      fields={fields}
      draft={draft}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitting={submitting}
      submitError={submitError}
    />
  );
}

// ── Export config for TemplateConfig ──────────────────────────────────────────

/** Default TemplateConfig for the form-page template. */
export const FORM_PAGE_DEFAULT_CONFIG: Partial<TemplateConfig> = {
  templateType: 'form-page',
  fields: [],
  sections: [],
  metadata: {
    mode: 'single',
    submitEndpoint: undefined,
  },
};
