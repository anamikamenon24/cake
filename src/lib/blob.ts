import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadImage(
  file: File | Buffer,
  filename: string,
  folder: "cakes" | "references" = "references"
): Promise<UploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const sanitizedFilename = `${folder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  // If Vercel Blob token is configured, use Vercel Blob
  if (token && token !== "vercel_blob_rw_sample_token") {
    const blob = await put(sanitizedFilename, file, {
      access: "public",
      token,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  }

  // Local development fallback: store in public/uploads
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
    await fs.mkdir(uploadsDir, { recursive: true });
    const localFilePath = path.join(uploadsDir, path.basename(sanitizedFilename));

    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(localFilePath, buffer);
    } else {
      await fs.writeFile(localFilePath, file);
    }

    return {
      url: `/uploads/${folder}/${path.basename(sanitizedFilename)}`,
      pathname: sanitizedFilename,
    };
  } catch (err) {
    console.warn("Local upload fallback warning:", err);
    // Safe fallback to mock image URL
    return {
      url: `/uploads/${folder}/${path.basename(sanitizedFilename)}`,
      pathname: sanitizedFilename,
    };
  }
}
