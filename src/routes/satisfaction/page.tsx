import { useState, useEffect, type FC } from 'react';
import { useSearchParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Card, Textarea } from '@heroui/react';
import { BaseButton, Icon } from '@brainforgeau/components';
import { StarRating } from '@/components/satisfaction/StarRating';
import { useSubmitSatisfactionRating } from '@/hooks/useSatisfaction';

// REVIEW: Public page - no authentication required (uses token from URL)
function SatisfactionSurveyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useSubmitSatisfactionRating();

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
        <Helmet>
          <title>Survey Link Invalid</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full p-8">
            <div className="text-center">
              <Icon name="exclamation-circle" className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Invalid Survey Link</h1>
              <p className="text-gray-600">
                This satisfaction survey link is invalid or missing the required token.
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>Thank You!</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full p-8">
            <div className="text-center">
              <Icon name="check-circle" className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Thank You!</h1>
              <p className="text-gray-600">
                Your feedback has been submitted successfully. We appreciate your time and input.
              </p>
            </div>
          </Card>
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
        <Helmet>
          <title>Survey Error</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full p-8">
            <div className="text-center">
              <Icon name="exclamation-triangle" className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Survey Error</h1>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <BaseButton variant="light" onClick={() => submitMutation.reset()}>
                Try Again
              </BaseButton>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Customer Satisfaction Survey</title>
      </Helmet>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold mb-2">How was your support experience?</h1>
            <p className="text-gray-600">
              We would love to hear your feedback. Please rate your experience and share any
              comments.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium mb-3">Your Rating</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {rating === 1 && 'Very Poor'}
                  {rating === 2 && 'Poor'}
                  {rating === 3 && 'Fair'}
                  {rating === 4 && 'Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            <div>
              <Textarea
                label="Additional Comments (Optional)"
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                minRows={4}
                maxRows={8}
              />
            </div>

            <div className="flex justify-center pt-2">
              <BaseButton
                onClick={handleSubmit}
                disabled={rating === 0 || submitMutation.isPending}
                isLoading={submitMutation.isPending}
                className="px-8"
              >
                Submit Feedback
              </BaseButton>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default SatisfactionSurveyPage;
