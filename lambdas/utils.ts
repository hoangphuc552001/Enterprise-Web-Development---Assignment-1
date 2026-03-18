import {
    APIGatewayAuthorizerEvent,
    APIGatewayProxyEvent,
    APIGatewayRequestAuthorizerEvent,
    PolicyDocument,
    StatementEffect,
} from "aws-lambda";


import axios from "axios"
import jwt from 'jsonwebtoken'
import jwkToPem from "jwk-to-pem";

export type CookieMap = { [key: string]: string } | undefined;
export type JwtToken = { sub: string; email: string } | null;
export type Jwk = {
    keys: {
        alg: string;
        e: string;
        kid: string;
        kty: "RSA";
        n: string;
        use: string;
    }[];
};

export const parseCookies = (
    event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent
) => {
    if (!event.headers || (!event.headers.Cookie && !event.headers.cookie)) {
        return undefined;
    }

    const cookiesStr = event.headers.Cookie || event.headers.cookie!;
    const cookiesArr = cookiesStr.split(";");

    const cookieMap: CookieMap = {};

    for (let cookie of cookiesArr) {
        const cookieTrimmed = cookie.trim();
        const eqIndex = cookieTrimmed.indexOf("=");
        if (eqIndex > 0) {
            const key = cookieTrimmed.substring(0, eqIndex);
            cookieMap[key] = cookieTrimmed.substring(eqIndex + 1);
        }
    }

    return cookieMap;
};

export const verifyToken = async (
    token: string,
    userPoolId: string | undefined,
    region: string
): Promise<JwtToken> => {
    try {
        const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
        const { data }: { data: Jwk } = await axios.get(url);
        const pem = jwkToPem(data.keys[0]);

        return jwt.verify(token, pem, {algorithms: ["RS256"]}) as JwtToken;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const createPolicy = (
    event: APIGatewayAuthorizerEvent,
    effect: StatementEffect
): PolicyDocument => {
    return {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: effect,
                Action: "execute-api:Invoke",
                Resource: [event.methodArn],
            },
        ],
    };
};
