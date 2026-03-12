import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const movieId = event?.pathParameters?.movieId ?? "1234";
        const published = event?.queryStringParameters?.published ?? "1995-05";

        return {
            statusCode: 200,
            body: JSON.stringify({
                movieId,
                published,
                review: {
                    reviewer: "userA",
                    reviewText: "Fake review returned for the requested movie and published date.",
                    rating: 4,
                },
            }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            body: JSON.stringify({ error }),
        };
    }
};
