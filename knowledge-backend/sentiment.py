"""
Sentiment Analysis Module - Dual Provider Architecture

Supports two sentiment analysis providers:
- VADER: Fast, rule-based (ideal for social media text, ~5ms)
- Transformer: ML-based DistilBERT (higher accuracy, ~50-200ms)

Usage:
    from sentiment import analyze_sentiment, SentimentProvider

    result = analyze_sentiment("I love this product!", SentimentProvider.VADER)
    print(result.sentiment, result.score, result.confidence)
"""

from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
import time
import logging

logger = logging.getLogger(__name__)


class SentimentProvider(Enum):
    """Available sentiment analysis providers"""
    VADER = "vader"
    TRANSFORMER = "transformer"


@dataclass
class SentimentResult:
    """Result of sentiment analysis"""
    provider: str
    sentiment: str  # positive, neutral, negative
    score: float    # -1.0 to 1.0
    confidence: float  # 0-100
    processing_time_ms: int
    breakdown: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class VaderSentimentAnalyzer:
    """
    VADER: Valence Aware Dictionary and sEntiment Reasoner

    Fast rule-based sentiment analysis optimized for social media text.
    Handles emoticons, slang, capitalization, and punctuation.

    Performance: ~3-5ms per analysis
    """

    def __init__(self):
        self._analyzer = None

    def _ensure_loaded(self):
        """Lazy load VADER analyzer"""
        if self._analyzer is None:
            try:
                from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
                self._analyzer = SentimentIntensityAnalyzer()
                logger.info("VADER sentiment analyzer loaded")
            except ImportError as e:
                logger.error(f"Failed to import VADER: {e}")
                raise ImportError("vaderSentiment not installed. Run: pip install vaderSentiment")

    def analyze(self, text: str) -> SentimentResult:
        """
        Analyze sentiment using VADER.

        Args:
            text: Text to analyze

        Returns:
            SentimentResult with compound score and breakdown
        """
        self._ensure_loaded()

        start = time.time()

        # Get VADER scores
        scores = self._analyzer.polarity_scores(text)
        compound = scores['compound']

        # Determine sentiment category from compound score
        # VADER recommends: positive >= 0.05, negative <= -0.05
        if compound >= 0.05:
            sentiment = 'positive'
        elif compound <= -0.05:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'

        # Calculate confidence based on compound strength
        # Higher absolute compound = higher confidence
        abs_compound = abs(compound)
        if abs_compound >= 0.6:
            confidence = min(95, 75 + abs_compound * 30)
        elif abs_compound >= 0.3:
            confidence = 55 + abs_compound * 40
        else:
            confidence = 40 + abs_compound * 50

        processing_time = int((time.time() - start) * 1000)

        return SentimentResult(
            provider='vader',
            sentiment=sentiment,
            score=round(compound, 4),
            confidence=round(confidence, 1),
            processing_time_ms=processing_time,
            breakdown={
                'positive': round(scores['pos'], 4),
                'neutral': round(scores['neu'], 4),
                'negative': round(scores['neg'], 4),
                'compound': round(scores['compound'], 4)
            }
        )


class TransformerSentimentAnalyzer:
    """
    HuggingFace Transformer-based sentiment analysis.

    Uses DistilBERT fine-tuned on SST-2 for binary sentiment classification.
    More accurate than rule-based methods but slower.

    Performance: ~50-200ms per analysis (after model warm-up)
    Model size: ~250MB
    """

    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        self._classifier = None
        self._model_name = model_name

    def _ensure_loaded(self):
        """Lazy load transformer model"""
        if self._classifier is None:
            try:
                from transformers import pipeline
                logger.info(f"Loading transformer model: {self._model_name}")
                self._classifier = pipeline(
                    "sentiment-analysis",
                    model=self._model_name,
                    device=-1  # CPU; use 0 for GPU
                )
                logger.info("Transformer sentiment analyzer loaded")
            except Exception as e:
                logger.error(f"Failed to load transformer: {e}")
                raise ImportError(f"Failed to load transformer model: {e}")

    def analyze(self, text: str) -> SentimentResult:
        """
        Analyze sentiment using transformer model.

        Args:
            text: Text to analyze (truncated to 512 tokens)

        Returns:
            SentimentResult with label and confidence
        """
        self._ensure_loaded()

        start = time.time()

        # Truncate text to model's max length
        text_truncated = text[:512] if len(text) > 512 else text

        # Get prediction
        result = self._classifier(text_truncated)[0]
        label = result['label'].upper()
        score_raw = result['score']

        # Map to sentiment
        if label == 'POSITIVE':
            sentiment = 'positive'
            score = score_raw
        else:  # NEGATIVE
            sentiment = 'negative'
            score = -score_raw

        # Handle low-confidence predictions as neutral
        if score_raw < 0.6:
            sentiment = 'neutral'
            score = 0.0

        # Confidence is the raw probability
        confidence = round(score_raw * 100, 1)

        processing_time = int((time.time() - start) * 1000)

        return SentimentResult(
            provider='transformer',
            sentiment=sentiment,
            score=round(score, 4),
            confidence=confidence,
            processing_time_ms=processing_time,
            breakdown={
                'label': label,
                'raw_score': round(score_raw, 4),
                'model': self._model_name
            }
        )


# Singleton instances (lazy loaded)
_vader_analyzer: Optional[VaderSentimentAnalyzer] = None
_transformer_analyzer: Optional[TransformerSentimentAnalyzer] = None


def get_vader_analyzer() -> VaderSentimentAnalyzer:
    """Get or create VADER analyzer singleton"""
    global _vader_analyzer
    if _vader_analyzer is None:
        _vader_analyzer = VaderSentimentAnalyzer()
    return _vader_analyzer


def get_transformer_analyzer() -> TransformerSentimentAnalyzer:
    """Get or create transformer analyzer singleton"""
    global _transformer_analyzer
    if _transformer_analyzer is None:
        _transformer_analyzer = TransformerSentimentAnalyzer()
    return _transformer_analyzer


def analyze_sentiment(
    text: str,
    provider: SentimentProvider = SentimentProvider.VADER
) -> SentimentResult:
    """
    Main entry point for sentiment analysis.

    Args:
        text: Text to analyze
        provider: Which analyzer to use (VADER or TRANSFORMER)

    Returns:
        SentimentResult containing sentiment label, score, confidence, and timing

    Example:
        >>> result = analyze_sentiment("This is great!", SentimentProvider.VADER)
        >>> print(f"{result.sentiment}: {result.confidence}% confident")
        positive: 87.5% confident
    """
    if not text or not text.strip():
        return SentimentResult(
            provider=provider.value,
            sentiment='neutral',
            score=0.0,
            confidence=50.0,
            processing_time_ms=0,
            breakdown={'error': 'Empty text provided'}
        )

    try:
        if provider == SentimentProvider.VADER:
            return get_vader_analyzer().analyze(text)
        else:
            return get_transformer_analyzer().analyze(text)
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        # Fallback to neutral on error
        return SentimentResult(
            provider=provider.value,
            sentiment='neutral',
            score=0.0,
            confidence=0.0,
            processing_time_ms=0,
            breakdown={'error': str(e)}
        )


def analyze_sentiment_both(text: str) -> Dict[str, SentimentResult]:
    """
    Analyze text with both providers for comparison.

    Useful for demos showing provider differences.

    Args:
        text: Text to analyze

    Returns:
        Dict with 'vader' and 'transformer' results
    """
    return {
        'vader': analyze_sentiment(text, SentimentProvider.VADER),
        'transformer': analyze_sentiment(text, SentimentProvider.TRANSFORMER)
    }


# Provider metadata for API
PROVIDER_INFO = {
    'vader': {
        'id': 'vader',
        'name': 'VADER',
        'description': 'Fast rule-based sentiment analysis optimized for social media',
        'speed': '~5ms',
        'accuracy': 'Good for informal text, emoticons, slang',
        'best_for': 'Real-time analysis, high volume, social media content'
    },
    'transformer': {
        'id': 'transformer',
        'name': 'DistilBERT',
        'description': 'ML-based transformer model fine-tuned on movie reviews',
        'speed': '~50-200ms',
        'accuracy': 'High accuracy on formal text and reviews',
        'best_for': 'Accuracy-critical analysis, formal documents'
    }
}


def get_provider_info() -> list:
    """Get metadata about available providers"""
    return list(PROVIDER_INFO.values())
