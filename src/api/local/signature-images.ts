/*
 * Images in a tech's email signature (a logo, say): uploaded like ticket
 * attachments, kept per user, and embedded inline when an email is sent.
 *
 * In the signature HTML an image is stored in ONE canonical form, never a
 * URL, so nothing host-specific is saved:
 *   <img src="helpdesk-signature-image:<id>" data-signature-image-id="<id>"
 *        alt="" width="160" style="width:160px;max-width:100%;height:auto">
 * The image itself is served by an authenticated route, so the browser
 * fetches it as a blob and shows an object URL.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (agreed with Ben).
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export interface SignatureImageDto {
  id: string;
  /** The canonical src, "helpdesk-signature-image:<id>". */
  src: string;
  /** Relative to the API base, e.g. "/v1/me/signature-images/<id>". */
  url: string;
  contentType: string;
  bytes: number;
}

export const SIGNATURE_IMAGE_SCHEME = 'helpdesk-signature-image:';
export const SIGNATURE_IMAGE_MAX_BYTES = 1024 * 1024;
export const SIGNATURE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
/** For a file input's accept attribute. */
export const SIGNATURE_IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.gif,image/png,image/jpeg,image/gif';

/** Plain-words messages, by the backend's error code. */
export const SIGNATURE_IMAGE_ERRORS: Record<string, string> = {
  'SignatureImage.UnsupportedType': 'Only PNG, JPG or GIF.',
  'SignatureImage.TooLarge': 'That file is over 1 MB.',
  'SignatureImage.Limit':
    'You can keep up to 5 images (2 MB in total). Save your signature to clear the ones it no longer uses.',
};

/** The same checks the server makes, before anything is sent. */
export const checkSignatureImage = (file: File): string | null => {
  if (!SIGNATURE_IMAGE_TYPES.includes(file.type)) {
    return SIGNATURE_IMAGE_ERRORS['SignatureImage.UnsupportedType'];
  }
  if (file.size > SIGNATURE_IMAGE_MAX_BYTES) {
    return SIGNATURE_IMAGE_ERRORS['SignatureImage.TooLarge'];
  }
  return null;
};

/** The message for a failed upload. */
export const signatureImageUploadError = (error: unknown): string => {
  const code = (
    error as { response?: { data?: { errors?: Array<{ code?: string }> } } }
  )?.response?.data?.errors?.[0]?.code;
  return (
    (code && SIGNATURE_IMAGE_ERRORS[code]) ??
    'The image could not be uploaded. Try again.'
  );
};

const base = () => `${requireHelpdeskApiBaseUrl()}/v1/me/signature-images`;

export const uploadSignatureImage = async (
  file: File,
): Promise<SignatureImageDto> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await authorizedAxios.post<SignatureImageDto>(base(), form);
  return data;
};

/** The image's bytes, for an object URL (the route needs authorisation). */
export const getSignatureImageBlob = async (id: string): Promise<Blob> => {
  const { data } = await authorizedAxios.get<Blob>(`${base()}/${id}`, {
    responseType: 'blob',
  });
  return data;
};
