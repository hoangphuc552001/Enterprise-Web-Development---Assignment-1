import { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.REGION });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const headers = {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
};

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const email = (event.requestContext as any).authorizer?.userId;
        if (!email) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: "Unauthorized" }),
            };
        }

        const body = event.body ? JSON.parse(event.body) : undefined;
        const { fileName, fileType } = body ?? {};

        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "fileName and fileType are required" }),
            };
        }

        if (!ALLOWED_TYPES.includes(fileType)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "File type not allowed" }),
            };
        }

        // Build a safe S3 key scoped to the user
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `posters/${Date.now()}-${safeFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME!,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.REGION}.amazonaws.com/${key}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ uploadUrl, fileUrl }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
