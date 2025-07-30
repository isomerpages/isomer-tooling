import md5 from "md5";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
interface UploadBlobsProps {
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsSessionToken: string;
	bucketName: string;
	key: string;
	fileBuffer: Buffer;
	isPdf: boolean;
}

export const uploadBlob = async ({
	awsAccessKeyId,
	awsSecretAccessKey,
	awsSessionToken,
	bucketName,
	key,
	fileBuffer,
	isPdf,
}: UploadBlobsProps) => {
	try {
		const s3Client = new S3Client({
			region: "ap-southeast-1",
			credentials: {
				accessKeyId: awsAccessKeyId,
				secretAccessKey: awsSecretAccessKey,
				sessionToken: awsSessionToken,
			},
		});

		// Set the parameters
		const uploadParams = {
			Bucket: bucketName,
			Key: key,
			Body: fileBuffer,
			ContentType: isPdf ? "application/pdf" : "text/html",
			ContentDisposition: `inline; filename="${key}"`, // allows browsers to open inline instead of downloading
			ContentMD5: Buffer.from(md5(fileBuffer), "hex").toString("base64"),
		};
		console.log(uploadParams);

		// Upload the file to the bucket
		const data = await s3Client.send(new PutObjectCommand(uploadParams));

		console.info(`Successfully uploaded blob: ${data}`);
		return data; // For example, return the data or promise here if needed
	} catch (err) {
		console.error(`Error when uploading blob: ${JSON.stringify(err)}`);
		throw err; // Rethrow the error for the caller to handle
	}
};