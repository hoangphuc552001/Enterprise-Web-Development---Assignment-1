import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CognitoIdentityProviderClient,
    SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
    region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body || !body.username || !body.password || !body.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "username, password, and email are required",
                }),
            };
        }

        const command = new SignUpCommand({
            ClientId: process.env.CLIENT_ID,
            Username: body.username,
            Password: body.password,
            UserAttributes: [{ Name: "email", Value: body.email }],
        });

        const result = await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User signed up successfully. Please check your email for verification code.",
                userSub: result.UserSub,
                confirmed: result.UserConfirmed,
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
