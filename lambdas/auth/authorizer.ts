import { CookieMap, createPolicy, parseCookies, verifyToken } from "../utils";
import { APIGatewayRequestAuthorizerHandler, StatementEffect } from "aws-lambda";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
    console.log("[EVENT]", event);

    const token = event.headers?.Authorization?.replace("Bearer ", "") || event.headers?.authorization?.replace("Bearer ", "");

    const cookies: CookieMap = parseCookies(event);
    const finalToken = token || (cookies ? cookies.token : undefined);

    if (!finalToken) {
        return {
            principalId: "",
            policyDocument: createPolicy(event, "Deny" as StatementEffect),
        };
    }

    const verifiedJwt = await verifyToken(
        finalToken,
        process.env.USER_POOL_ID,
        process.env.REGION!
    );

    const effect: StatementEffect = verifiedJwt ? "Allow" : "Deny";

    return {
        principalId: verifiedJwt ? verifiedJwt.sub!.toString() : "",
        policyDocument: createPolicy(event, effect),
        context: {
            userId: verifiedJwt ? verifiedJwt.email : "",
        },
    };
};
