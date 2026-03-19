'use client';

/**
 * CreateTenantModal — Modal form for creating a new tenant.
 *
 * Fields: name, subdomain (auto-generated from name, editable), region,
 * DB isolation mode (shared schema / separate schema / separate DB).
 *
 * Validation via @mantine/form. On submit calls POST /api/admin/tenants.
 * Patterns Library §9 — Forms.
 */

import { useEffect } from 'react';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';
import { showError, showSuccess } from '@/lib/notifications';

export interface CreateTenantModalProps {
  opened: boolean;
  onClose: () => void;
  /** Called with the newly created tenant after a successful POST. */
  onCreated: (tenant: {
    id: string;
    name: string;
    subdomain: string;
    status: 'ACTIVE' | 'SANDBOX';
    region: string | null;
    dbIsolationMode: string;
    createdAt: string;
    userCount: number;
  }) => void;
}

interface FormValues {
  name: string;
  subdomain: string;
  region: string;
  dbIsolationMode: string;
}

const DB_ISOLATION_OPTIONS = [
  { value: 'shared_schema', label: 'Shared schema' },
  { value: 'separate_schema', label: 'Separate schema' },
  { value: 'separate_db', label: 'Separate DB' },
];

/** Derives a subdomain slug from a tenant name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export function CreateTenantModal({ opened, onClose, onCreated }: CreateTenantModalProps) {
  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      subdomain: '',
      region: '',
      dbIsolationMode: 'shared_schema',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('tenants.create.error.nameRequired')),
      subdomain: (v) => {
        if (!v.trim()) return t('tenants.create.error.subdomainRequired');
        if (!/^[a-z0-9-]+$/.test(v.trim())) return t('tenants.create.error.subdomainInvalid');
        return null;
      },
    },
    validateInputOnBlur: true,
  });

  // Auto-populate subdomain when name changes (only if user hasn't edited it).
  useEffect(() => {
    if (!form.isTouched('subdomain')) {
      form.setFieldValue('subdomain', slugify(form.values.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.name]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          subdomain: values.subdomain.trim(),
          region: values.region.trim() || undefined,
          dbIsolationMode: values.dbIsolationMode,
        }),
      });

      const json = (await res.json()) as { tenant?: {
        id: string;
        name: string;
        subdomain: string;
        status: 'ACTIVE' | 'SANDBOX';
        region: string | null;
        dbIsolationMode: string;
        createdAt: string;
        _count?: { userRoles: number };
      }; error?: string };

      if (!res.ok) {
        showError(json.error ?? t('error.generic'), t('tenants.create.errorTitle'));
        return;
      }

      if (json.tenant) {
        const { _count, ...tenantFields } = json.tenant;
        onCreated({ ...tenantFields, userCount: _count?.userRoles ?? 0 });
        showSuccess(t('tenants.create.success'));
        handleClose();
      }
    } catch {
      showError(t('error.generic'), t('tenants.create.errorTitle'));
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('tenants.create.title')}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('tenants.create.name.label')}
            placeholder={t('tenants.create.name.placeholder')}
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('tenants.create.subdomain.label')}
            placeholder={t('tenants.create.subdomain.placeholder')}
            description={t('tenants.create.subdomain.hint')}
            required
            {...form.getInputProps('subdomain')}
          />
          <TextInput
            label={t('tenants.create.region.label')}
            placeholder={t('tenants.create.region.placeholder')}
            {...form.getInputProps('region')}
          />
          <Select
            label={t('tenants.create.dbIsolation.label')}
            data={DB_ISOLATION_OPTIONS}
            {...form.getInputProps('dbIsolationMode')}
          />
        </Stack>

        <Group justify="flex-end" mt="xl" gap="sm">
          <Button variant="outline" onClick={handleClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={form.submitting}>
            {t('tenants.create.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
