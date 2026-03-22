/**
 * FormPage template — public API barrel.
 *
 * Imports from here to use the form page template and its utilities.
 */

export { FormPageTemplate, FieldRenderer, FORM_PAGE_DEFAULT_CONFIG } from './FormPageTemplate';
export type { FormPageTemplateProps, FormFieldConfig } from './FormPageTemplate';

export { FormWizard } from './FormWizard';
export type { FormWizardProps, WizardStep } from './FormWizard';

export { SearchOrCreate } from './SearchOrCreate';
export type { SearchOrCreateProps, SearchOrCreateOption } from './SearchOrCreate';

export { useFormDraft } from './useFormDraft';
export type { UseFormDraftResult } from './useFormDraft';
