const REVIEW_FEEDBACK_KEY = 'ai-review-workspace-review-feedback'

export function saveReviewFeedback(result) {
  localStorage.setItem(REVIEW_FEEDBACK_KEY, JSON.stringify(result))
}

export function getReviewFeedback() {
  try {
    const stored = localStorage.getItem(REVIEW_FEEDBACK_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function clearReviewFeedback() {
  localStorage.removeItem(REVIEW_FEEDBACK_KEY)
}
