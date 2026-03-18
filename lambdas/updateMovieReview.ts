import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { validateUpdateReview } from "../shared/validation";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const movieId = event.pathParameters?.movieId;
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!movieId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Movie ID is required" }),
            };
        }

        if (!body) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Request body is required" }),
            };
        }

        const isValid = validateUpdateReview(body);
        if (!isValid) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Validation failed",
                    errors: validateUpdateReview.errors,
                }),
            };
        }

        const reviewerId = body.email;
        const { text } = body;

        const command = new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                PK: `m#${movieId}`,
                SK: `r#${reviewerId}`,
            },
            UpdateExpression: "SET #text = :text",
            ExpressionAttributeNames: {
                "#text": "text",
            },
            ExpressionAttributeValues: {
                ":text": text,
            },
        });

        await ddbDocClient.send(command);

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                message: "Review updated successfully",
            }),
        };
    } catch (error: any) {
        if (error.name === "ValidationException") {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Review not found",
                }),
            };
        }
        return {
            statusCode: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
