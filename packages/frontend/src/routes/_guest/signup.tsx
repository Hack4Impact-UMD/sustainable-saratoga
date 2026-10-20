import { createFileRoute } from '@tanstack/react-router';
import { SignUpForm } from '@frontend/components/auth/SignUpForm';

export const Route = createFileRoute("/_guest/signup")({ component: SignUpPage });

function SignUpPage() {
    return (<SignUpForm></SignUpForm>)
}