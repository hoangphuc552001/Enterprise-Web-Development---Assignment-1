import * as cdk from 'aws-cdk-lib';
import { Assignment1Stack } from '../lib/assignment1-stack';
import { AuthApiStack } from '../lib/auth-api-stack';

const app = new cdk.App();

const authApiStack = new AuthApiStack(app, "AuthApiStack");

new Assignment1Stack(app, 'Assignment1Stack', {
    userPoolId: authApiStack.userPoolId,
    userPoolClientId: authApiStack.userPoolClientId,
});