import { uploadTo, deleteFromUrl } from './uploads';

const BUCKET = 'product-photos';
export const MAX_PHOTOS = 5;

export const uploadProductPhoto = (file: File, productName: string) =>
  uploadTo(BUCKET, file, productName);

export const deleteProductPhoto = (url: string) => deleteFromUrl(BUCKET, url);
