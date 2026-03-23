'use client';

/**
 * PermissionsSection — per-role permissions matrix for the page.
 *
 * Shows a matrix of roles × actions (view / edit / delete / export) with
 * checkboxes. Also provides a per-field visibility table by role.
 *
 * Permissions are stored in config.permissions and config.metadata.fieldPermissions.
 *
 * Implements US-136 AC-8.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type PermAction = 'view' | 'edit' | 'delete' | 'export';

interface RolePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

interface FieldPermissions {
  /** role → Set of visible field keys */
  [role: string]: string[];
}

// ─── Default roles ─────────────────────────────────────────────────────────────

const DEFAULT_ROLES = ['admin', 'builder', 'editor', 'viewer'];

const DEFAULT_ROLE_PERMS: Record<string, RolePermissions> = {
  admin: { view: true, edit: true, delete: true, export: true },
  builder: { view: true, edit: true, delete: false, export: true },
  editor: { view: true, edit: true, delete: false, export: false },
  viewer: { view: true, edit: false, delete: false, export: false },
};

const ACTIONS: PermAction[] = ['view', 'edit', 'delete', 'export'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRolePerms(config: TemplateConfig): Record<string, RolePermissions> {
  const perm = config.permissions ?? {};
  const result: Record<string, RolePermissions> = {};

  for (const role of DEFAULT_ROLES) {
    result[role] = {
      view: perm.viewRoles?.includes(role) ?? DEFAULT_ROLE_PERMS[role]!.view,
      edit: perm.editRoles?.includes(role) ?? DEFAULT_ROLE_PERMS[role]!.edit,
      delete: perm.deleteRoles?.includes(role) ?? DEFAULT_ROLE_PERMS[role]!.delete,
      export:
        ((config.metadata?.exportRoles as string[] | undefined)?.includes(role)) ??
        DEFAULT_ROLE_PERMS[role]!.export,
    };
  }
  return result;
}

function buildUpdatedPermissions(
  current: TemplateConfig,
  rolePerms: Record<string, RolePermissions>,
) {
  const viewRoles = DEFAULT_ROLES.filter((r) => rolePerms[r]?.view);
  const editRoles = DEFAULT_ROLES.filter((r) => rolePerms[r]?.edit);
  const deleteRoles = DEFAULT_ROLES.filter((r) => rolePerms[r]?.delete);
  const exportRoles = DEFAULT_ROLES.filter((r) => rolePerms[r]?.export);

  return {
    permissions: { viewRoles, editRoles, deleteRoles },
    metadata: { ...current.metadata, exportRoles },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PermissionsSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function PermissionsSection({ config, onChange }: PermissionsSectionProps) {
  const rolePerms = parseRolePerms(config);
  const fieldPerms = ((config.metadata?.fieldPermissions ?? {}) as FieldPermissions);
  const fields = config.fields ?? [];

  function toggleRolePerm(role: string, action: PermAction, value: boolean) {
    const updated = {
      ...rolePerms,
      [role]: { ...rolePerms[role]!, [action]: value },
    };
    onChange(buildUpdatedPermissions(config, updated));
  }

  function toggleFieldVisible(role: string, fieldKey: string, visible: boolean) {
    const currentVisible = fieldPerms[role] ?? fields.map((f) => f.key);
    const updated = visible
      ? [...new Set([...currentVisible, fieldKey])]
      : currentVisible.filter((k) => k !== fieldKey);
    onChange({
      metadata: {
        ...config.metadata,
        fieldPermissions: { ...fieldPerms, [role]: updated },
      },
    });
  }

  return (
    <div data-testid="builder-permissions-section">
      <h2 className={classes.sectionTitle}>{t('builder.permissions.title')}</h2>

      {/* Role × action matrix */}
      <table
        className={classes.permMatrix}
        aria-label={t('builder.permissions.matrixAriaLabel')}
      >
        <thead>
          <tr>
            <th>{t('builder.permissions.role')}</th>
            {ACTIONS.map((action) => (
              <th key={action}>{t(`builder.permissions.action.${action}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEFAULT_ROLES.map((role) => (
            <tr key={role}>
              <td>
                <span className={classes.badge}>{role}</span>
              </td>
              {ACTIONS.map((action) => (
                <td key={action}>
                  <input
                    type="checkbox"
                    checked={rolePerms[role]?.[action] ?? false}
                    onChange={(e) => toggleRolePerm(role, action, e.target.checked)}
                    aria-label={`${role} ${action}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Per-field visibility by role */}
      {fields.length > 0 && (
        <>
          <hr className={classes.divider} />
          <h3 className={classes.sectionTitle} style={{ fontSize: 12, marginBottom: 8 }}>
            {t('builder.permissions.fieldVisibility')}
          </h3>
          <table
            className={classes.permMatrix}
            aria-label={t('builder.permissions.fieldVisibilityAriaLabel')}
          >
            <thead>
              <tr>
                <th>{t('builder.permissions.field')}</th>
                {DEFAULT_ROLES.map((role) => (
                  <th key={role}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.key}>
                  <td>
                    <code style={{ fontSize: 11 }}>{field.key}</code>
                  </td>
                  {DEFAULT_ROLES.map((role) => {
                    const visibleFields = fieldPerms[role] ?? fields.map((f) => f.key);
                    const isVisible = visibleFields.includes(field.key);
                    return (
                      <td key={role}>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) =>
                            toggleFieldVisible(role, field.key, e.target.checked)
                          }
                          aria-label={`${field.key} visible for ${role}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
