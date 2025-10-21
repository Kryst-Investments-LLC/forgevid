import { Cloudinary } from '@cloudinary/url-gen';

export const cloudinary = new Cloudinary({
  cloud: { cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME },
});

export function getImageUrl(publicId: string, transformations?: any): string {
  return cloudinary.image(publicId).addTransformation(transformations).toURL();
}
