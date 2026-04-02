import { db, ref, get, set, update, remove, push } from '../firebase';

/**
 * Enhanced Trust & Rating System
 * Sophisticated trust scoring with fraud detection, weighted ratings, and comprehensive analytics.
 */

export interface Rating {
  id: string;
  userId: string;
  responderId: string;
  overallRating: number; // 1-5
  dimensions: {
    responseTime: number; // 1-5
    quality: number; // 1-5
    professionalism: number; // 1-5
    communication: number; // 1-5
  };
  review: string;
  timestamp: number;
  verified: boolean;
  helpful: number; // number of users who found this helpful
  notHelpful: number; // number of users who found this not helpful
  sentimentScore: number; // -1 to 1 (negative to positive)
  flagged: boolean;
  flagReason?: string;
}

export interface TrustScore {
  overall: number; // 0-100
  dimensions: {
    responseTime: number; // 0-100
    quality: number; // 0-100
    professionalism: number; // 0-100
    communication: number; // 0-100
    reliability: number; // 0-100
  };
  ratingCount: number;
  lastUpdated: number;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number; // 0-100 (how confident we are in this score)
}

export interface FraudDetection {
  suspiciousPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
  lastChecked: number;
  recommendations: string[];
}

export class TrustRatingSystem {
  private readonly RATING_WEIGHTS = {
    recent: 0.4, // 40% weight to recent ratings (last 30 days)
    verified: 0.3, // 30% weight to verified users' ratings
    detailed: 0.2, // 20% weight to detailed reviews
    helpful: 0.1 // 10% weight to helpfulness votes
  };

  private readonly SENTIMENT_KEYWORDS = {
    positive: ['excellent', 'amazing', 'professional', 'helpful', 'quick', 'efficient', 'caring', 'knowledgeable'],
    negative: ['slow', 'rude', 'unprofessional', 'late', 'unhelpful', 'poor', 'inexperienced', 'disorganized']
  };

  /**
   * Rate a responder with comprehensive dimensions and fraud detection
   */
  public async rateResponder(
    responderId: string,
    userId: string,
    dimensions: Rating['dimensions'],
    review: string,
    isVerifiedUser: boolean = false
  ): Promise<string> {
    const ratingId = push(ref(db, `helpers/${responderId}/ratings`)).key!;
    
    // Calculate sentiment score
    const sentimentScore = this.calculateSentimentScore(review);
    
    // Check for potential fraud
    const fraudCheck = await this.performFraudDetection(userId, responderId);
    
    const rating: Rating = {
      id: ratingId,
      userId,
      responderId,
      overallRating: this.calculateOverallRating(dimensions),
      dimensions,
      review,
      timestamp: Date.now(),
      verified: isVerifiedUser,
      helpful: 0,
      notHelpful: 0,
      sentimentScore,
      flagged: fraudCheck.riskLevel === 'high',
      flagReason: fraudCheck.riskLevel === 'high' ? fraudCheck.recommendations.join(', ') : undefined
    };

    // Store rating
    await set(ref(db, `helpers/${responderId}/ratings/${ratingId}`), rating);
    
    // Update trust score
    await this.updateTrustScore(responderId);
    
    // Log fraud detection if needed
    if (fraudCheck.riskLevel !== 'low') {
      await this.logFraudDetection(userId, responderId, fraudCheck);
    }

    return ratingId;
  }

  /**
   * Get comprehensive trust score for a responder
   */
  public async getTrustScore(responderId: string): Promise<TrustScore> {
    const scoreRef = ref(db, `helpers/${responderId}/trustScore`);
    const snapshot = await get(scoreRef);
    
    if (!snapshot.exists()) {
      return this.createDefaultTrustScore();
    }
    
    return snapshot.val() as TrustScore;
  }

  /**
   * Update trust score with weighted algorithm
   */
  private async updateTrustScore(responderId: string): Promise<void> {
    const ratingsRef = ref(db, `helpers/${responderId}/ratings`);
    const snapshot = await get(ratingsRef);
    
    if (!snapshot.exists()) {
      return;
    }

    const ratings: Rating[] = Object.values(snapshot.val() || {});
    const filteredRatings = ratings.filter(r => !r.flagged);

    if (filteredRatings.length === 0) {
      return;
    }

    // Calculate weighted scores
    const trustScore = this.calculateWeightedTrustScore(filteredRatings);
    
    // Calculate trend
    const trend = this.calculateTrend(filteredRatings);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(filteredRatings);

    const finalScore: TrustScore = {
      ...trustScore,
      ratingCount: filteredRatings.length,
      lastUpdated: Date.now(),
      trend,
      confidence
    };

    await update(ref(db, `helpers/${responderId}`), { trustScore: finalScore });
  }

  /**
   * Calculate weighted trust score using multiple factors
   */
  private calculateWeightedTrustScore(ratings: Rating[]): Omit<TrustScore, 'ratingCount' | 'lastUpdated' | 'trend' | 'confidence'> {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Separate ratings by time and verification
    const recentRatings = ratings.filter(r => r.timestamp > thirtyDaysAgo);
    const verifiedRatings = ratings.filter(r => r.verified);
    const detailedRatings = ratings.filter(r => r.review.length > 50);
    const helpfulRatings = ratings.filter(r => r.helpful > r.notHelpful);

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedAverage(
      ratings.map(r => r.overallRating),
      recentRatings.map(r => r.overallRating),
      verifiedRatings.map(r => r.overallRating),
      detailedRatings.map(r => r.overallRating),
      helpfulRatings.map(r => r.overallRating)
    );

    // Calculate dimension scores
    const dimensions = {
      responseTime: this.calculateWeightedAverage(
        ratings.map(r => r.dimensions.responseTime),
        recentRatings.map(r => r.dimensions.responseTime),
        verifiedRatings.map(r => r.dimensions.responseTime),
        detailedRatings.map(r => r.dimensions.responseTime),
        helpfulRatings.map(r => r.dimensions.responseTime)
      ),
      quality: this.calculateWeightedAverage(
        ratings.map(r => r.dimensions.quality),
        recentRatings.map(r => r.dimensions.quality),
        verifiedRatings.map(r => r.dimensions.quality),
        detailedRatings.map(r => r.dimensions.quality),
        helpfulRatings.map(r => r.dimensions.quality)
      ),
      professionalism: this.calculateWeightedAverage(
        ratings.map(r => r.dimensions.professionalism),
        recentRatings.map(r => r.dimensions.professionalism),
        verifiedRatings.map(r => r.dimensions.professionalism),
        detailedRatings.map(r => r.dimensions.professionalism),
        helpfulRatings.map(r => r.dimensions.professionalism)
      ),
      communication: this.calculateWeightedAverage(
        ratings.map(r => r.dimensions.communication),
        recentRatings.map(r => r.dimensions.communication),
        verifiedRatings.map(r => r.dimensions.communication),
        detailedRatings.map(r => r.dimensions.communication),
        helpfulRatings.map(r => r.dimensions.communication)
      ),
      reliability: this.calculateReliabilityScore(ratings)
    };

    return {
      overall: Math.round(overallScore * 20), // Convert 1-5 to 0-100
      dimensions: {
        ...dimensions,
        responseTime: Math.round(dimensions.responseTime * 20),
        quality: Math.round(dimensions.quality * 20),
        professionalism: Math.round(dimensions.professionalism * 20),
        communication: Math.round(dimensions.communication * 20),
        reliability: Math.round(dimensions.reliability)
      }
    };
  }

  /**
   * Calculate weighted average using multiple rating groups
   */
  private calculateWeightedAverage(
    allRatings: number[],
    recentRatings: number[],
    verifiedRatings: number[],
    detailedRatings: number[],
    helpfulRatings: number[]
  ): number {
    const weights = this.RATING_WEIGHTS;
    
    let totalScore = 0;
    let totalWeight = 0;

    if (allRatings.length > 0) {
      totalScore += this.average(allRatings) * (1 - weights.recent - weights.verified - weights.detailed - weights.helpful);
      totalWeight += (1 - weights.recent - weights.verified - weights.detailed - weights.helpful);
    }

    if (recentRatings.length > 0) {
      totalScore += this.average(recentRatings) * weights.recent;
      totalWeight += weights.recent;
    }

    if (verifiedRatings.length > 0) {
      totalScore += this.average(verifiedRatings) * weights.verified;
      totalWeight += weights.verified;
    }

    if (detailedRatings.length > 0) {
      totalScore += this.average(detailedRatings) * weights.detailed;
      totalWeight += weights.detailed;
    }

    if (helpfulRatings.length > 0) {
      totalScore += this.average(helpfulRatings) * weights.helpful;
      totalWeight += weights.helpful;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate reliability score based on response patterns
   */
  private calculateReliabilityScore(ratings: Rating[]): number {
    // Base reliability on consistency and response time
    const responseTimeScores = ratings.map(r => r.dimensions.responseTime);
    const consistency = this.calculateConsistency(responseTimeScores);
    const avgResponseTime = this.average(responseTimeScores);
    
    return Math.min((avgResponseTime * 20) + (consistency * 10), 100);
  }

  /**
   * Calculate consistency of ratings (lower variance = higher consistency)
   */
  private calculateConsistency(ratings: number[]): number {
    if (ratings.length < 2) return 100;
    
    const avg = this.average(ratings);
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - avg, 2), 0) / ratings.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to 0-100 scale (lower std dev = higher consistency)
    return Math.max(0, 100 - (standardDeviation * 20));
  }

  /**
   * Calculate sentiment score from review text
   */
  private calculateSentimentScore(review: string): number {
    const words = review.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (this.SENTIMENT_KEYWORDS.positive.some(keyword => word.includes(keyword))) {
        positiveCount++;
      }
      if (this.SENTIMENT_KEYWORDS.negative.some(keyword => word.includes(keyword))) {
        negativeCount++;
      }
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0;

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  /**
   * Perform fraud detection on rating patterns
   */
  private async performFraudDetection(userId: string, responderId: string): Promise<FraudDetection> {
    const suspiciousPatterns: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for multiple ratings from same user
    const userRatingsRef = ref(db, `helpers/${responderId}/ratings`);
    const snapshot = await get(userRatingsRef);
    const ratings = snapshot.exists() ? Object.values(snapshot.val()) as Rating[] : [];
    
    const userRatings = ratings.filter(r => r.userId === userId);
    if (userRatings.length > 1) {
      suspiciousPatterns.push('Multiple ratings from same user');
      riskLevel = 'high';
    }

    // Check for rating patterns (all 5s or all 1s)
    const recentRatings = ratings.filter(r => Date.now() - r.timestamp < 24 * 60 * 60 * 1000); // Last 24 hours
    if (recentRatings.length > 5) {
      const allPerfect = recentRatings.every(r => r.overallRating === 5);
      const allTerrible = recentRatings.every(r => r.overallRating === 1);
      
      if (allPerfect || allTerrible) {
        suspiciousPatterns.push('Suspicious rating pattern detected');
        riskLevel = 'high';
      }
    }

    // Check for rapid successive ratings
    const sortedRatings = recentRatings.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < sortedRatings.length; i++) {
      if (sortedRatings[i].timestamp - sortedRatings[i-1].timestamp < 60000) { // Less than 1 minute
        suspiciousPatterns.push('Rapid successive ratings');
        riskLevel = 'medium';
        break;
      }
    }

    const recommendations = riskLevel === 'high' 
      ? ['Manual review required', 'Consider temporary suspension']
      : riskLevel === 'medium'
      ? ['Monitor for patterns', 'Additional verification may be needed']
      : [];

    return {
      suspiciousPatterns,
      riskLevel,
      lastChecked: Date.now(),
      recommendations
    };
  }

  /**
   * Calculate overall rating from dimensions
   */
  private calculateOverallRating(dimensions: Rating['dimensions']): number {
    const weights = {
      responseTime: 0.25,
      quality: 0.35,
      professionalism: 0.25,
      communication: 0.15
    };

    return (
      dimensions.responseTime * weights.responseTime +
      dimensions.quality * weights.quality +
      dimensions.professionalism * weights.professionalism +
      dimensions.communication * weights.communication
    );
  }

  /**
   * Calculate rating trend over time
   */
  private calculateTrend(ratings: Rating[]): 'improving' | 'declining' | 'stable' {
    if (ratings.length < 3) return 'stable';

    const sortedRatings = ratings.sort((a, b) => a.timestamp - b.timestamp);
    const recentRatings = sortedRatings.slice(-Math.ceil(ratings.length / 2));
    const olderRatings = sortedRatings.slice(0, Math.floor(ratings.length / 2));

    const recentAvg = this.average(recentRatings.map(r => r.overallRating));
    const olderAvg = this.average(olderRatings.map(r => r.overallRating));

    if (recentAvg > olderAvg + 0.3) return 'improving';
    if (recentAvg < olderAvg - 0.3) return 'declining';
    return 'stable';
  }

  /**
   * Calculate confidence in trust score
   */
  private calculateConfidence(ratings: Rating[]): number {
    // More ratings = higher confidence
    const ratingCount = ratings.length;
    const baseConfidence = Math.min(ratingCount * 5, 80); // Max 80 from count
    
    // Verified ratings increase confidence
    const verifiedRatio = ratings.filter(r => r.verified).length / ratings.length;
    const verifiedBonus = verifiedRatio * 20; // Max 20 from verification

    return Math.round(baseConfidence + verifiedBonus);
  }

  /**
   * Mark rating as helpful or not helpful
   */
  public async markRatingHelpful(
    responderId: string, 
    ratingId: string, 
    userId: string, 
    helpful: boolean
  ): Promise<void> {
    const ratingRef = ref(db, `helpers/${responderId}/ratings/${ratingId}`);
    const snapshot = await get(ratingRef);
    
    if (!snapshot.exists()) return;

    const rating = snapshot.val() as Rating;
    
    // Check if user already voted
    const voteKey = `helpfulVotes_${userId}`;
    if (rating[voteKey] !== undefined) return;

    // Update rating
    const updates: any = {
      helpful: helpful ? rating.helpful + 1 : rating.helpful,
      notHelpful: helpful ? rating.notHelpful : rating.notHelpful + 1,
      [voteKey]: helpful
    };

    await update(ratingRef, updates);
    
    // Recalculate trust score
    await this.updateTrustScore(responderId);
  }

  /**
   * Get detailed rating analytics
   */
  public async getRatingAnalytics(responderId: string): Promise<{
    totalRatings: number;
    averageRating: number;
    dimensionAverages: Rating['dimensions'];
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    ratingDistribution: { [key: number]: number };
    flaggedRatings: number;
  }> {
    const ratingsRef = ref(db, `helpers/${responderId}/ratings`);
    const snapshot = await get(ratingsRef);
    
    if (!snapshot.exists()) {
      return {
        totalRatings: 0,
        averageRating: 0,
        dimensionAverages: { responseTime: 0, quality: 0, professionalism: 0, communication: 0 },
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        flaggedRatings: 0
      };
    }

    const ratings: Rating[] = Object.values(snapshot.val());
    const filteredRatings = ratings.filter(r => !r.flagged);

    const dimensionAverages = {
      responseTime: this.average(filteredRatings.map(r => r.dimensions.responseTime)),
      quality: this.average(filteredRatings.map(r => r.dimensions.quality)),
      professionalism: this.average(filteredRatings.map(r => r.dimensions.professionalism)),
      communication: this.average(filteredRatings.map(r => r.dimensions.communication))
    };

    const sentimentDistribution = filteredRatings.reduce((acc, rating) => {
      if (rating.sentimentScore > 0.1) acc.positive++;
      else if (rating.sentimentScore < -0.1) acc.negative++;
      else acc.neutral++;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    const ratingDistribution = filteredRatings.reduce((acc, rating) => {
      acc[rating.overallRating] = (acc[rating.overallRating] || 0) + 1;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      totalRatings: filteredRatings.length,
      averageRating: this.average(filteredRatings.map(r => r.overallRating)),
      dimensionAverages,
      sentimentDistribution,
      ratingDistribution,
      flaggedRatings: ratings.filter(r => r.flagged).length
    };
  }

  /**
   * Log fraud detection for audit trail
   */
  private async logFraudDetection(userId: string, responderId: string, fraudCheck: FraudDetection): Promise<void> {
    const logEntry = {
      userId,
      responderId,
      timestamp: Date.now(),
      riskLevel: fraudCheck.riskLevel,
      patterns: fraudCheck.suspiciousPatterns,
      recommendations: fraudCheck.recommendations
    };

    await push(ref(db, `fraudDetection/${responderId}`), logEntry);
  }

  /**
   * Helper methods
   */
  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  }

  private createDefaultTrustScore(): TrustScore {
    return {
      overall: 50, // Neutral starting score
      dimensions: {
        responseTime: 50,
        quality: 50,
        professionalism: 50,
        communication: 50,
        reliability: 50
      },
      ratingCount: 0,
      lastUpdated: Date.now(),
      trend: 'stable',
      confidence: 0
    };
  }

  /**
   * Get top responders by trust score
   */
  public async getTopResponders(limit: number = 10): Promise<Array<{ responderId: string; trustScore: TrustScore }>> {
    const helpersRef = ref(db, 'helpers');
    const snapshot = await get(helpersRef);
    
    if (!snapshot.exists()) return [];

    const helpers = snapshot.val();
    const responders: Array<{ responderId: string; trustScore: TrustScore }> = [];

    Object.keys(helpers).forEach(responderId => {
      const helper = helpers[responderId];
      if (helper.trustScore && helper.trustScore.ratingCount > 0) {
        responders.push({ responderId, trustScore: helper.trustScore });
      }
    });

    return responders
      .sort((a, b) => b.trustScore.overall - a.trustScore.overall)
      .slice(0, limit);
  }

  /**
   * Remove fraudulent ratings
   */
  public async removeFraudulentRatings(responderId: string, ratingIds: string[]): Promise<void> {
    for (const ratingId of ratingIds) {
      await remove(ref(db, `helpers/${responderId}/ratings/${ratingId}`));
    }
    
    // Recalculate trust score
    await this.updateTrustScore(responderId);
  }
}
