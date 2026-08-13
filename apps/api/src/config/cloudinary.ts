import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const configured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary, configured as cloudinaryConfigured };

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  filename?: string
): Promise<{ url: string; publicId: string }> {
  if (!configured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_* env vars.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `patana/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
        public_id: filename,
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}
