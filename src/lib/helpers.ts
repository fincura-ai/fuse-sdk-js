import { type FuseApiConfig } from './types.js';

/**
 * Extract procedure code from a Fuse service description.
 * Description format: "D4910: periodontal maintenance (D4910)"
 *
 * @param description - The service description from the API
 * @returns The procedure code (e.g., "D4910") or null if not found
 */
export const extractProcedureCode = (description: string): string | null => {
  // Try to extract from format "D4910: description (D4910)"
  const match = description.match(/^([A-Z]\d{4}):/u);
  if (match) {
    return match[1];
  }

  // Fallback: try to find any D-code in the string
  const fallbackMatch = description.match(/\(([A-Z]\d{4})\)/u);
  return fallbackMatch ? fallbackMatch[1] : null;
};

/**
 * Extract API config fields from a JWT token's claims.
 * Reads the extension_Fuse_PracticeId claim from the token payload.
 *
 * @param token - The JWT access token
 * @returns Partial config with practiceId (locationId must be sourced elsewhere)
 */
export const extractConfigFromToken = (
  token: string,
): Partial<FuseApiConfig> => {
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString('utf8'),
    );

    return {
      practiceId: payload.extension_Fuse_PracticeId,
    };
  } catch {
    return {};
  }
};
