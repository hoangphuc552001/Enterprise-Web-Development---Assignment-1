declare module "shared/validation" {
    import { ValidateFunction } from "ajv";

    interface AddReviewRequest {
        movieId: number;
        date: string;
        text: string;
    }

    interface UpdateReviewRequest {
        text: string;
    }

    interface GetReviewsQueryParams {
        reviewer?: string;
    }

    interface GetReviewsByMovieParamsQueryParams {
        movie?: string;
        published?: string;
    }

    export const validateAddReview: ValidateFunction<AddReviewRequest>;
    export const validateUpdateReview: ValidateFunction<UpdateReviewRequest>;
    export const validateGetReviewsQuery: ValidateFunction<GetReviewsQueryParams>;
    export const validateGetReviewsByMovieParams: ValidateFunction<GetReviewsByMovieParamsQueryParams>;
}
