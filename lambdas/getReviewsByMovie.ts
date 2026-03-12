import { Handler } from "aws-lambda";

export const handler: Handler = async (event:any) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const rawPath = event?.rawPath ?? "";
        const movieIdMatch = rawPath.match(/\/movies\/([^/]+)\/reviews\/?$/);
        const movieId = movieIdMatch?.[1] ?? event?.pathParameters?.movieID ?? "1234";
        const reviewer = event?.queryStringParameters?.reviewer;

        const reviews = [
            {
                movieId,
                reviewer: "userA",
                published: "1995-05",
                reviewText: "Fake review from userA.",
                rating: 4,
            },
            {
                movieId,
                reviewer: "userB",
                published: "1995-06",
                reviewText: "Fake review from userB.",
                rating: 5,
            },
        ];

        const filteredReviews = reviewer
            ? reviews.filter((review) => review.reviewer === reviewer)
            : reviews;

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                movieId,
                reviewer: reviewer ?? null,
                reviews: filteredReviews,
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
