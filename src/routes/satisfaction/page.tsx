import { StarRating } from '@/components/satisfaction/StarRating';
import { useSubmitSatisfactionRating } from '@/hooks/useSatisfaction';
import {
  BaseButton,
  BaseCard,
  BaseTextarea,
  Icon,
} from '@brainforgeau/components';
import { usePageTitle } from '@brainforgeau/components/page';
import { Card } from '@heroui/react';
import { useSearchParams } from '@modern-js/runtime/router';
import { type FC, useEffect, useState } from 'react';

// REVIEW: Public page - no authentication required (uses token from URL)
function SatisfactionSurveyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useSubmitSatisfactionRating();

  let pageTitle = 'Customer Satisfaction Survey';
  if (!token) pageTitle = 'Survey Link Invalid';
  else if (submitted) pageTitle = 'Thank You!';
  else if (submitMutation.isError) pageTitle = 'Survey Error';
  usePageTitle(pageTitle);

  // REVIEW: Check if token exists
  useEffect(() => {
    if (!token) {
      // Token missing - show error state
    }
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0) {
      return; // Require rating
    }

    try {
      await submitMutation.mutateAsync({
        token,
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!token) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-default-50">
          <BaseCard className="w-full max-w-md p-8">
            <div className="text-center">
              <Icon
                name="exclamation-circle"
                className="text-danger mx-auto mb-4 h-16 w-16"
              />
              <h1 className="mb-2 text-2xl font-semibold">
                Invalid Survey Link
              </h1>
              <p className="text-default-600">
                This satisfaction survey link is invalid or missing the required
                token.
              </p>
            </div>
          </BaseCard>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-default-50">
          <BaseCard className="w-full max-w-md p-8">
            <div className="text-center">
              <Icon
                name="check-circle"
                className="mx-auto mb-4 h-16 w-16 text-green-500"
              />
              <h1 className="mb-2 text-2xl font-semibold">Thank You!</h1>
              <p className="text-default-600">
                Your feedback has been submitted successfully. We appreciate
                your time and input.
              </p>
            </div>
          </BaseCard>
        </div>
      </>
    );
  }

  if (submitMutation.isError) {
    const errorMessage =
      (submitMutation.error as any)?.response?.data?.message ||
      'This survey link may have expired or already been used.';

    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-default-50">
          <BaseCard className="w-full max-w-md p-8">
            <div className="text-center">
              <Icon
                name="exclamation-triangle"
                className="mx-auto mb-4 h-16 w-16 text-orange-500"
              />
              <h1 className="mb-2 text-2xl font-semibold">Survey Error</h1>
              <p className="mb-4 text-default-600">{errorMessage}</p>
              <BaseButton
                variant="light"
                onClick={() => submitMutation.reset()}
              >
                Try Again
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-default-50 p-4">
        <BaseCard className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-semibold">
              How was your support experience?
            </h1>
            <p className="text-default-600">
              We would love to hear your feedback. Please rate your experience
              and share any comments.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <label className="mb-3 text-sm font-medium">Your Rating</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating > 0 && (
                <p className="mt-2 text-sm text-default-600">
                  {rating === 1 && 'Very Poor'}
                  {rating === 2 && 'Poor'}
                  {rating === 3 && 'Fair'}
                  {rating === 4 && 'Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            <div>
              <BaseTextarea
                label="Additional Comments (Optional)"
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                minRows={4}
                maxRows={8}
              />
            </div>

            <div className="flex justify-center pt-2">
              <BaseButton
                onClick={handleSubmit}
                isDisabled={rating === 0 || submitMutation.isPending}
                className="px-8"
              >
                Submit Feedback
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </>
  );
}

export default SatisfactionSurveyPage;
