import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Initialize Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadOptions {
  folder?: string;
  transformation?: unknown[];
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadOnCloudinary = (
  filePath: string,
  options: UploadOptions
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      filePath,
      {
        folder: options.folder || "default", // Folder for organizing uploads
        transformation: options.transformation || [], // Apply transformations like compression
        resource_type: "image", // Ensure it's treated as an image
      },
      (error, result) => {
        if (error) {
          reject({ success: false, error: error.message });
        } else {
          resolve({ success: true, url: result?.secure_url });
        }
      }
    );
  });
};
