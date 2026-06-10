import { UploadApiResponse } from 'cloudinary';
export declare class UploadService {
    uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadApiResponse>;
}
