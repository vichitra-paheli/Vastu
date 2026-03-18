/**
 * POST /api/settings/avatar
 *
 * Accepts a multipart/form-data upload of an avatar image (field name: "file").
 * Validates format (JPG/PNG) and size (max 2MB) on the server.
 *
 * Storage: In production this would upload to MinIO and return the object URL.
 * In Phase 0 (without MinIO wired up) the file is accepted and validated but
 * not persisted to object storage. The avatarUrl field on the User record is
 * updated to a placeholder that signals the upload was received.
 *
 * Returns:
 *   200 { success: true; avatarUrl: string }   on success
 *   400 { error: string }                      on validation failure
 *   401 { error: string }                      if not authenticated
 *   413 { error: string }                      if file is too large
 *   500 { error: string }                      on unexpected failure
 *
 * MCP tool equivalent: upload_avatar({ file })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSession } from '../../../../lib/session';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate.
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse multipart form data.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required' }, { status: 400 });
  }

  // Validate MIME type.
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG and PNG images are supported' },
      { status: 400 },
    );
  }

  // Validate size.
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image must be smaller than 2 MB' },
      { status: 413 },
    );
  }

  try {
    // Phase 0 stub: In production, upload `file` to MinIO here and use the
    // resulting object URL. For now we generate a placeholder URL that includes
    // the user ID so the client can distinguish uploaded avatars from the default.
    //
    // TODO (Phase 1 / DevOps): Wire up MinIO S3-compatible upload.
    //   const objectUrl = await minioClient.putObject('vastu-uploads', `avatars/${session.user.id}`, file.stream());
    const avatarUrl = `/api/settings/avatar/${session.user.id}`;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
      select: { id: true, name: true, organizationId: true },
    });

    // Write audit event — best effort.
    createAuditEvent({
      userId: updatedUser.id,
      userName: updatedUser.name,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: updatedUser.id,
      resourceDescription: 'Avatar updated',
      afterState: { avatarUrl },
      ipAddress:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: updatedUser.organizationId,
    }).catch((err: unknown) => {
      console.error('[avatar] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('[avatar] Failed to update avatar:', err);
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
