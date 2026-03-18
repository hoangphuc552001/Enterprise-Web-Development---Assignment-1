import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { validateAddReview } from "../shared/validation";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Request body is required" }),
            };
        }

        const isValid = validateAddReview(body);
        if (!isValid) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Validation failed",
                    errors: validateAddReview.errors,
                }),
            };
        }

        // Extract reviewer email from custom authorizer context
        const email = (event.requestContext as any).authorizer?.userId;

        if (!email) {
            return {
                statusCode: 401,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Unauthorized: unable to identify reviewer" }),
            };
        }

        const { movieId, date, text } = body;

        const command = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                PK: `m#${movieId}`,
                SK: `r#${email}`,
                movieId,
                email,
                date,
                text,
            },
            ConditionExpression:
                "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        });

        await ddbDocClient.send(command);

        return {
            statusCode: 201,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                message: "Review added successfully",
            }),
        };
    } catch (error: any) {
        if (error.name === "ConditionalCheckFailedException") {
            return {
                statusCode: 409,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "A review by this reviewer for this movie already exists",
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
