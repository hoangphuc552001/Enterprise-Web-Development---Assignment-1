import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const email = (event.requestContext as any).authorizer?.userId;
        if (!email) {
            return {
                statusCode: 401,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Unauthorized" }),
            };
        }

        const pk = `u#${email}`;

        if (event.httpMethod === "GET") {
            const command = new QueryCommand({
                TableName: process.env.TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": pk,
                    ":sk": "fav#",
                },
            });

            const result = await ddbDocClient.send(command);
            
            // Format into { movies: [], actors: [], tv: [] }
            const favourites: Record<string, number[]> = { movies: [], actors: [], tv: [] };
            for (const item of result.Items || []) {
                const type = item.SK.replace("fav#", "");
                favourites[type] = item.ids || [];
            }

            return {
                statusCode: 200,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(favourites),
            };
        }

        if (event.httpMethod === "PUT") {
            const body = event.body ? JSON.parse(event.body) : undefined;
            if (!body || !body.type || !Array.isArray(body.ids)) {
                return {
                    statusCode: 400,
                    headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Invalid body. Requires 'type' and 'ids' array." }),
                };
            }

            const command = new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: pk,
                    SK: `fav#${body.type}`,
                    ids: body.ids,
                },
            });

            await ddbDocClient.send(command);

            return {
                statusCode: 200,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Favourites updated successfully" }),
            };
        }

        return {
            statusCode: 405,
            headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
