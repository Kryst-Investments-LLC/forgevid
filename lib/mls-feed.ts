/**
 * MLS / portal feed ingestion, so an agent never touches a CSV.
 *
 * The parsing machinery now lives in lib/feed-core (shared with automotive and
 * e-commerce); this file only declares the real-estate field aliases and how a
 * listing is built. RESO Web API JSON (`{ value: [...] }`, PascalCase) and a
 * generic portal XML export are both covered.
 *
 * Nothing is invented: a listing with no address or no photos is rejected by
 * name, because a video of the wrong house is worse than no video.
 *
 * Relative imports only — reachable from the worker process.
 */

import { ListingParseError, type Listing } from './listing-brief';
import {
  FeedParseError,
  asCount,
  asPrice,
  asText,
  extractPhotos,
  parseFeed,
  pick,
  pickAll,
  type FeedShape,
} from './feed-core';

const ALIASES = {
  ref: ['ListingKey', 'ListingId', 'ListingKeyNumeric', 'MlsNumber', 'MLSNum', 'id', 'ref'],
  address: ['UnparsedAddress', 'StreetAddress', 'FullAddress', 'Address', 'PropertyAddress'],
  price: ['ListPrice', 'Price', 'CurrentPrice', 'AskingPrice'],
  beds: ['BedroomsTotal', 'Bedrooms', 'BedroomsCount', 'Beds', 'NumBedrooms'],
  baths: ['BathroomsTotalInteger', 'BathroomsFull', 'Bathrooms', 'Baths', 'NumBathrooms'],
  highlights: ['PublicRemarks', 'Remarks', 'Description', 'Features', 'MarketingRemarks'],
  media: ['Media', 'Photos', 'Images', 'PhotoUrls', 'Pictures'],
};

const LISTING_SHAPE: FeedShape<Listing> = {
  identityAliases: ALIASES.address,
  noun: 'listing',
  toItem(record, index) {
    const address = asText(pick(record, ALIASES.address));
    const photos = extractPhotos(pickAll(record, ALIASES.media));
    const ref = asText(pick(record, ALIASES.ref)) ?? `feed-${index + 1}`;

    if (!address) throw new ListingParseError(`Feed entry ${index + 1} (${ref}): no address`);
    if (photos.length === 0) throw new ListingParseError(`Feed entry ${index + 1} (${address}): no photos`);

    return {
      ref,
      address,
      price: asPrice(pick(record, ALIASES.price)),
      beds: asCount(pick(record, ALIASES.beds)),
      baths: asCount(pick(record, ALIASES.baths)),
      highlights: asText(pick(record, ALIASES.highlights))?.slice(0, 1000),
      photos,
    };
  },
};

/** RESO Web API JSON (`{ value: [...] }`, or a bare array). */
export function parseResoJson(text: string): Listing[] {
  return withListingErrors(() => parseFeed(text, 'application/json', LISTING_SHAPE));
}

/** A portal XML export; the listing element can be named almost anything. */
export function parseXmlFeed(text: string): Listing[] {
  return withListingErrors(() => parseFeed(text, 'application/xml', LISTING_SHAPE));
}

/** Dispatch on the Content-Type, sniffing the first character as a fallback. */
export function parseListingsFeed(text: string, contentType = ''): Listing[] {
  return withListingErrors(() => parseFeed(text, contentType, LISTING_SHAPE));
}

/**
 * feed-core throws FeedParseError; the real-estate route and tests were written
 * against ListingParseError. Translate so nothing downstream has to change.
 */
function withListingErrors(fn: () => Listing[]): Listing[] {
  try {
    return fn();
  } catch (error) {
    if (error instanceof FeedParseError) throw new ListingParseError(error.message);
    throw error;
  }
}
