import Ajv, { ValidateFunction } from "ajv";
import {
    AddReviewRequest,
    UpdateReviewRequest,
    GetReviewsQueryParams,
    GetReviewsByMovieParamsQueryParams,
} from "./types.d";

const ajv = new Ajv({ allErrors: true });

export const addReviewSchema = {
    type: "object",
    required: ["movieId", "date", "text"],
    properties: {
        movieId: { type: "integer", minimum: 1 },
        date: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        text: { type: "string", minLength: 1, maxLength: 5000 },
    },
    additionalProperties: false,
};

export const updateReviewSchema = {
    type: "object",
    required: ["text"],
    properties: {
        text: { type: "string", minLength: 1, maxLength: 5000 },
    },
    additionalProperties: false,
};

export const getReviewsQuerySchema = {
    type: "object",
    properties: {
        reviewer: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
};

export const getReviewsByMovieParamsSchema = {
    type: "object",
    properties: {
        movie: { type: "string", minLength: 1 },
        published: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}(-[0-9]{2})?$" },
    },
    additionalProperties: false,
};

export const validateAddReview: ValidateFunction<AddReviewRequest> =
    ajv.compile(addReviewSchema);

export const validateUpdateReview: ValidateFunction<UpdateReviewRequest> =
    ajv.compile(updateReviewSchema);

export const validateGetReviewsQuery: ValidateFunction<GetReviewsQueryParams> =
    ajv.compile(getReviewsQuerySchema);

export const validateGetReviewsByMovieParams: ValidateFunction<GetReviewsByMovieParamsQueryParams> =
    ajv.compile(getReviewsByMovieParamsSchema);
