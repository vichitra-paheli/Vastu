'use client';

/**
 * NotesTab — notes list with author, content, and timestamp.
 *
 * Users can add notes via a textarea. New notes are added optimistically
 * to the list before the API response returns.
 *
 * Note: Uses a plain Textarea instead of a rich text editor in Phase 1B.
 * TODO (Phase 2): Replace Textarea with @mantine/tiptap for rich text.
 *
 * Implements US-128d (Notes tab).
 */

import React, { useCallback, useRef, useState } from 'react';
import { Avatar, Button, Textarea } from '@mantine/core';
import { IconNote } from '@tabler/icons-react';
import { EmptyState } from '../../EmptyState/EmptyState';
import { t } from '../../../lib/i18n';
import classes from './NotesTab.module.css';

export interface NoteEntry {
  id: string;
  authorName: string;
  authorInitials: string;
  content: string;
  createdAt: string;
}

interface NotesTabProps {
  recordId: string;
  notes?: NoteEntry[];
  loading?: boolean;
  currentUser?: { name: string; initials: string };
  /** Called to persist a new note. Should return the saved note. */
  onAddNote?: (recordId: string, content: string) => Promise<NoteEntry>;
}

/** Format ISO timestamp to a readable string. */
function formatNoteTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function NotesTab({
  recordId,
  notes: initialNotes = [],
  loading = false,
  currentUser,
  onAddNote,
}: NotesTabProps) {
  const [notes, setNotes] = useState<NoteEntry[]>(initialNotes);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    // Optimistic add
    const optimisticNote: NoteEntry = {
      id: `optimistic-${Date.now()}`,
      authorName: currentUser?.name ?? t('drawer.notes.unknownAuthor'),
      authorInitials: currentUser?.initials ?? '?',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [optimisticNote, ...prev]);
    setNoteText('');
    setSubmitting(true);

    try {
      const saved = await onAddNote?.(recordId, trimmed);
      if (saved) {
        // Replace the optimistic note with the real one
        setNotes((prev) =>
          prev.map((n) => (n.id === optimisticNote.id ? saved : n)),
        );
      }
    } catch {
      // On error, remove the optimistic note and restore the text
      setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
      setNoteText(trimmed);
    } finally {
      setSubmitting(false);
    }
  }, [noteText, currentUser, onAddNote, recordId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter or Cmd+Enter submits
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={classes.root}>
      {/* Add note form */}
      <div className={classes.inputRow}>
        {currentUser && (
          <Avatar size="sm" radius="xl" className={classes.avatar} aria-hidden="true">
            {currentUser.initials}
          </Avatar>
        )}
        <div className={classes.inputWrapper}>
          <Textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('drawer.notes.placeholder')}
            aria-label={t('drawer.notes.inputAriaLabel')}
            minRows={2}
            maxRows={6}
            autosize
            size="xs"
            styles={{
              input: {
                fontFamily: 'var(--v-font-sans)',
                fontSize: 'var(--v-text-sm)',
                resize: 'none',
              },
            }}
          />
          <div className={classes.submitRow}>
            <span className={classes.hint}>{t('drawer.notes.submitHint')}</span>
            <Button
              size="xs"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!noteText.trim()}
              aria-label={t('drawer.notes.submitAriaLabel')}
            >
              {t('drawer.notes.submit')}
            </Button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      {!loading && notes.length === 0 ? (
        <EmptyState
          icon={<IconNote />}
          message={t('drawer.notes.empty')}
        />
      ) : (
        <ul className={classes.list} aria-label={t('drawer.notes.listAriaLabel')}>
          {notes.map((note) => (
            <li key={note.id} className={classes.noteItem}>
              <Avatar
                size="sm"
                radius="xl"
                className={classes.avatar}
                aria-label={note.authorName}
              >
                {note.authorInitials}
              </Avatar>
              <div className={classes.noteBody}>
                <div className={classes.noteMeta}>
                  <span className={classes.noteAuthor}>{note.authorName}</span>
                  <time
                    className={classes.noteTime}
                    dateTime={note.createdAt}
                    title={new Date(note.createdAt).toLocaleString()}
                  >
                    {formatNoteTime(note.createdAt)}
                  </time>
                </div>
                <p className={classes.noteContent}>{note.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
