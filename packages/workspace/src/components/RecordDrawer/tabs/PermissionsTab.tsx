'use client';

/**
 * PermissionsTab — record-level ACL editor (UI only).
 *
 * Shows which subjects have which access levels for this record.
 * Read-only for non-admins. Toggle switches control permission flags.
 * Enforcement is deferred to Phase 2 (server-side ACL enforcement).
 *
 * Implements US-128d (Permissions tab).
 */

import React, { useState } from 'react';
import { Switch, Tooltip } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { EmptyState } from '../../EmptyState/EmptyState';
import { useAbility } from '../../../providers/AbilityContext';
import { t } from '../../../lib/i18n';
import classes from './PermissionsTab.module.css';

export interface PermissionEntry {
  /** Subject identifier (user ID or role name). */
  subjectId: string;
  /** Human-readable subject name. */
  subjectName: string;
  /** Subject type: 'user' or 'role'. */
  subjectType: 'user' | 'role';
  /** Access flags. */
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

interface PermissionsTabProps {
  recordId: string;
  permissions?: PermissionEntry[];
  loading?: boolean;
  /** Called when a permission toggle is changed. */
  onPermissionChange?: (
    recordId: string,
    subjectId: string,
    flag: keyof Pick<PermissionEntry, 'canRead' | 'canWrite' | 'canDelete' | 'canShare'>,
    value: boolean,
  ) => void;
}

const FLAG_LABELS: Record<string, string> = {
  canRead: t('drawer.permissions.read'),
  canWrite: t('drawer.permissions.write'),
  canDelete: t('drawer.permissions.delete'),
  canShare: t('drawer.permissions.share'),
};

type PermFlag = 'canRead' | 'canWrite' | 'canDelete' | 'canShare';
const PERM_FLAGS: PermFlag[] = ['canRead', 'canWrite', 'canDelete', 'canShare'];

export function PermissionsTab({
  recordId,
  permissions = [],
  loading = false,
  onPermissionChange,
}: PermissionsTabProps) {
  const ability = useAbility();
  const isAdmin = ability.can('manage', 'all');

  const [localPerms, setLocalPerms] = useState<PermissionEntry[]>(permissions);

  const handleToggle = (subjectId: string, flag: PermFlag, value: boolean) => {
    if (!isAdmin) return;
    setLocalPerms((prev) =>
      prev.map((p) =>
        p.subjectId === subjectId ? { ...p, [flag]: value } : p,
      ),
    );
    onPermissionChange?.(recordId, subjectId, flag, value);
  };

  if (loading) {
    return (
      <div className={classes.loadingWrapper} aria-label={t('drawer.permissions.loading')}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={classes.skeletonRow} />
        ))}
      </div>
    );
  }

  if (localPerms.length === 0) {
    return (
      <EmptyState
        icon={<IconLock />}
        message={t('drawer.permissions.empty')}
      />
    );
  }

  return (
    <div className={classes.root}>
      {!isAdmin && (
        <div className={classes.readOnlyBanner} role="status">
          <IconLock size={14} aria-hidden="true" />
          <span>{t('drawer.permissions.readOnlyNotice')}</span>
        </div>
      )}

      <table
        className={classes.table}
        aria-label={t('drawer.permissions.tableAriaLabel')}
      >
        <thead>
          <tr>
            <th className={classes.subjectCol} scope="col">
              {t('drawer.permissions.subject')}
            </th>
            {PERM_FLAGS.map((flag) => (
              <th key={flag} className={classes.flagCol} scope="col">
                <Tooltip label={FLAG_LABELS[flag]} withArrow position="top">
                  <span>{FLAG_LABELS[flag]}</span>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {localPerms.map((entry) => (
            <tr key={entry.subjectId} className={classes.row}>
              <td className={classes.subjectCell}>
                <span className={classes.subjectName}>{entry.subjectName}</span>
                <span className={classes.subjectType}>
                  {entry.subjectType === 'user'
                    ? t('drawer.permissions.typeUser')
                    : t('drawer.permissions.typeRole')}
                </span>
              </td>
              {PERM_FLAGS.map((flag) => (
                <td key={flag} className={classes.flagCell}>
                  <Switch
                    size="xs"
                    checked={entry[flag]}
                    disabled={!isAdmin}
                    onChange={(e) => handleToggle(entry.subjectId, flag, e.currentTarget.checked)}
                    aria-label={`${FLAG_LABELS[flag]} for ${entry.subjectName}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
