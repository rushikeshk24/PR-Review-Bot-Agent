import { PRReviewResult, ReviewInput } from '@codelens/shared';

export interface ReviewProvider {
  /**
   * Analyzes PR files/diff and produces structured review results.
   */
  analyze(input: ReviewInput): Promise<PRReviewResult>;

  /**
   * Returns the identifier of the active model.
   */
  getModelName(): string;

  /**
   * Estimates total token count for given input.
   */
  estimateTokens(input: ReviewInput): number;
}

export const REVIEW_PROVIDER_TOKEN = Symbol('ReviewProvider');
