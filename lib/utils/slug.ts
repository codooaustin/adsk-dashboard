/**
 * Generate a URL-friendly slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 * 
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug string
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string')
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
}

/**
 * Generate a unique slug by appending a number if the base slug already exists
 * This is a helper for checking uniqueness, but actual uniqueness should be
 * checked in the database
 * 
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug
  let counter = 1

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
