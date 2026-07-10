/**
 * Bulk listing import — the estate agent's spreadsheet.
 *
 * Agents do not have an API. They have a CSV exported from their CRM or typed
 * by hand, with a column of photo URLs. Everything here is PURE (text in,
 * structure out) so the parser and the script it produces are verified offline,
 * without a network, a database, or an API key.
 *
 * Photo fetching lives in the route, behind the SSRF guard in lib/safe-fetch.
 *
 * Relative imports only — reachable from the worker process.
 */

export interface Listing {
  /** The agent's own reference, echoed back so they can match rows to videos. */
  ref: string;
  address: string;
  price?: string;
  beds?: number;
  baths?: number;
  /** Free-text selling points from the agent's own listing copy. */
  highlights?: string;
  /** Photo URLs, in the order they should appear. */
  photos: string[];
}

export class ListingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListingParseError';
  }
}

/**
 * Split one CSV line, honouring double-quoted fields (which is where the photo
 * URLs live, because they contain commas in query strings and always have).
 * A doubled quote inside a quoted field is a literal quote, per RFC 4180.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** Column aliases, because no two CRMs name anything the same way. */
const COLUMNS: Record<keyof Omit<Listing, 'photos'>, string[]> = {
  ref: ['ref', 'reference', 'id', 'listing_id', 'mls', 'mls_id'],
  address: ['address', 'street', 'property', 'title'],
  price: ['price', 'list_price', 'asking', 'amount'],
  beds: ['beds', 'bedrooms', 'br'],
  baths: ['baths', 'bathrooms', 'ba'],
  highlights: ['highlights', 'features', 'description', 'notes', 'remarks'],
};

const PHOTO_COLUMNS = ['photos', 'photo_urls', 'images', 'image_urls', 'media'];

function findColumn(header: string[], aliases: string[]): number {
  return header.findIndex((h) => aliases.includes(h.toLowerCase().replace(/\s+/g, '_')));
}

/**
 * Parse an agent's CSV into listings.
 *
 * Rows without an address or without photos are rejected loudly rather than
 * silently producing a video of nothing — a batch that half-works is worse than
 * one that tells you which row is wrong.
 */
export function parseListingsCsv(csv: string): Listing[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new ListingParseError('The CSV needs a header row and at least one listing');
  }

  const header = splitCsvLine(lines[0]);
  const idx = {
    ref: findColumn(header, COLUMNS.ref),
    address: findColumn(header, COLUMNS.address),
    price: findColumn(header, COLUMNS.price),
    beds: findColumn(header, COLUMNS.beds),
    baths: findColumn(header, COLUMNS.baths),
    highlights: findColumn(header, COLUMNS.highlights),
    photos: findColumn(header, PHOTO_COLUMNS),
  };

  if (idx.address === -1) {
    throw new ListingParseError(`No address column found. Looked for: ${COLUMNS.address.join(', ')}`);
  }
  if (idx.photos === -1) {
    throw new ListingParseError(`No photos column found. Looked for: ${PHOTO_COLUMNS.join(', ')}`);
  }

  const listings: Listing[] = [];
  for (let row = 1; row < lines.length; row++) {
    const cells = splitCsvLine(lines[row]);
    const at = (i: number) => (i >= 0 && i < cells.length ? cells[i] : '');

    const address = at(idx.address);
    if (!address) throw new ListingParseError(`Row ${row + 1}: missing an address`);

    // Photos are separated by whitespace, a semicolon, or a pipe — never a
    // comma, which the CSV itself has already claimed.
    const photos = at(idx.photos)
      .split(/[\s;|]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (photos.length === 0) throw new ListingParseError(`Row ${row + 1} (${address}): no photos`);

    const beds = Number(at(idx.beds));
    const baths = Number(at(idx.baths));

    listings.push({
      ref: at(idx.ref) || `row-${row}`,
      address,
      price: at(idx.price) || undefined,
      beds: Number.isFinite(beds) && beds > 0 ? beds : undefined,
      baths: Number.isFinite(baths) && baths > 0 ? baths : undefined,
      highlights: at(idx.highlights) || undefined,
      photos,
    });
  }

  return listings;
}

/**
 * Turn a listing into the prompt the generator expects.
 *
 * Only facts the agent actually supplied appear here. A generated listing video
 * that invents a third bathroom is not a marketing asset, it is a liability —
 * agents are legally accountable for what their listings claim.
 */
export function listingPrompt(listing: Listing, sceneCount: number): string {
  const facts: string[] = [];
  if (listing.beds) facts.push(`${listing.beds} bedroom${listing.beds === 1 ? '' : 's'}`);
  if (listing.baths) facts.push(`${listing.baths} bathroom${listing.baths === 1 ? '' : 's'}`);

  const parts = [
    `A real estate listing video for ${listing.address}.`,
    facts.length > 0 ? `The property has ${facts.join(' and ')}.` : '',
    listing.price ? `It is listed at ${listing.price}.` : '',
    listing.highlights ? `Selling points: ${listing.highlights}.` : '',
    `There are ${sceneCount} photographs, shown in order.`,
    'Write a warm, professional estate-agent voiceover that names the property and',
    'its real features, using ONLY the facts above — never invent rooms, sizes,',
    'prices or amenities. Close by inviting the viewer to book a private viewing.',
  ].filter(Boolean);

  return parts.join(' ');
}
