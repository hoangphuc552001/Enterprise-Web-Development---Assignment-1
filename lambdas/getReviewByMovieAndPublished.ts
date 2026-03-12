import { Handler } from "aws-lambda";

export const handler: Handler = async (event: any) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const movieId = event?.queryStringParameters?.movie ?? "1234";
        const published = event?.queryStringParameters?.published ?? "1995-05";

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
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
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};
