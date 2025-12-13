"""
Mock Historical Sentiment Data Generator

Generates realistic customer sentiment history across omni-channel interactions
for demo purposes. Supports multiple customer personas with different sentiment
patterns over time.

Usage:
    from mock_history import get_customer_history, DEMO_CUSTOMERS

    history = get_customer_history('CUST-12345', days=90)
    print(f"Total interactions: {history['summary']['total_interactions']}")
    print(f"Sentiment trend: {history['summary']['trend']}")
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import random
import hashlib


@dataclass
class HistoricalInteraction:
    """Single customer interaction record"""
    id: str
    customer_id: str
    timestamp: str  # ISO format
    channel: str    # call, chat, email, survey, social
    sentiment_score: float  # -1.0 to 1.0
    sentiment_label: str    # positive, neutral, negative
    confidence: float
    summary: str
    agent_id: Optional[str] = None
    resolution: Optional[str] = None  # resolved, escalated, pending

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Channel configuration with weights and sentiment-appropriate summaries
CHANNEL_CONFIG = {
    'call': {
        'weight': 0.35,
        'summaries': {
            'positive': [
                "Called to thank support for quick resolution",
                "Appreciation call for excellent service",
                "Called to provide positive feedback",
                "Renewal call - very satisfied with service",
                "Quick call - issue resolved immediately"
            ],
            'neutral': [
                "Called about billing inquiry",
                "Phone support for account settings update",
                "Follow-up call on previous ticket",
                "Phone verification for account change",
                "Called about promotional offer details"
            ],
            'negative': [
                "Complaint call about service quality",
                "Called frustrated about recurring issue",
                "Voice call regarding service outage",
                "Called to escalate unresolved problem",
                "Called to cancel due to poor experience"
            ]
        }
    },
    'chat': {
        'weight': 0.30,
        'summaries': {
            'positive': [
                "Chat feedback - great support experience",
                "Quick chat - agent resolved instantly",
                "Chat to express satisfaction with new feature",
                "Positive chat about recent upgrade"
            ],
            'neutral': [
                "Web chat asking about features",
                "Chat inquiry about pricing",
                "Chat about order status",
                "Live chat billing question",
                "Quick question via chat widget"
            ],
            'negative': [
                "Chat complaint about wait times",
                "Frustrated chat - issue not resolved",
                "Chat about ongoing service problems",
                "Bot-to-agent transfer - complex issue"
            ]
        }
    },
    'email': {
        'weight': 0.20,
        'summaries': {
            'positive': [
                "Email thanking team for support",
                "Positive feedback on recent changes",
                "Email praising customer service rep",
                "Satisfied response to resolution email"
            ],
            'neutral': [
                "Email inquiry about documentation",
                "Account verification email",
                "Email about contract renewal",
                "Feature request submission"
            ],
            'negative': [
                "Email complaint escalation",
                "Email about invoice discrepancy",
                "Email requesting refund",
                "Frustrated email about delayed response"
            ]
        }
    },
    'survey': {
        'weight': 0.10,
        'summaries': {
            'positive': [
                "NPS survey - promoter score (9-10)",
                "Excellent rating on satisfaction survey",
                "Positive product feedback survey"
            ],
            'neutral': [
                "NPS survey - passive score (7-8)",
                "Annual customer survey response",
                "Quick pulse survey completed"
            ],
            'negative': [
                "NPS survey - detractor score (0-6)",
                "Low satisfaction survey rating",
                "Critical feedback in service survey"
            ]
        }
    },
    'social': {
        'weight': 0.05,
        'summaries': {
            'positive': [
                "Social media praise/testimonial",
                "Positive public review",
                "Twitter shoutout to support team"
            ],
            'neutral': [
                "Facebook message inquiry",
                "LinkedIn comment interaction",
                "Instagram DM support question"
            ],
            'negative': [
                "Social media complaint",
                "Negative public review",
                "Twitter complaint about service"
            ]
        }
    }
}


# Customer personas with different sentiment patterns
# Note: Real customers contact support about once a month on average
CUSTOMER_PERSONAS = {
    'satisfied_loyal': {
        'description': 'Long-term happy customer with occasional minor issues',
        'base_sentiment': 0.45,
        'variance': 0.35,  # Can still have some negative interactions
        'trend': 'stable',
        'interaction_frequency': 'low'  # ~1 interaction per month
    },
    'frustrated_at_risk': {
        'description': 'Customer experiencing recurring issues, at risk of churning',
        'base_sentiment': -0.15,  # Slightly negative overall, but not always
        'variance': 0.50,  # Wide variance - some good days, some bad
        'trend': 'declining',
        'interaction_frequency': 'medium'  # ~1-2 interactions per month
    },
    'new_curious': {
        'description': 'New customer learning the product, sentiment improving',
        'base_sentiment': 0.10,
        'variance': 0.45,
        'trend': 'improving',
        'interaction_frequency': 'low'
    },
    'volatile_mixed': {
        'description': 'Customer with unpredictable sentiment swings',
        'base_sentiment': 0.0,
        'variance': 0.60,  # Very wide variance
        'trend': 'volatile',
        'interaction_frequency': 'low'
    },
    'recovering_churned': {
        'description': 'Previously churned customer who returned, rebuilding trust',
        'base_sentiment': 0.10,  # Starting slightly positive
        'variance': 0.40,
        'trend': 'improving',  # Will show upward trajectory
        'interaction_frequency': 'low'  # ~1 per month = 3 for 90 days
    }
}


# Pre-defined demo customers for consistency
DEMO_CUSTOMERS = {
    'CUST-12345': {
        'name': 'Sarah Johnson',
        'email': 's.johnson@email.com',
        'tier': 'Platinum',
        'persona': 'recovering_churned',  # Shows improving trend for demo
        'account_age': '4 years'
    },
    'CUST-67890': {
        'name': 'Michael Chen',
        'email': 'm.chen@company.com',
        'tier': 'Gold',
        'persona': 'satisfied_loyal',
        'account_age': '6 years'
    },
    'CUST-11111': {
        'name': 'Emily Rodriguez',
        'email': 'e.rodriguez@email.com',
        'tier': 'Silver',
        'persona': 'new_curious',
        'account_age': '3 months'
    },
    'CUST-22222': {
        'name': 'James Wilson',
        'email': 'j.wilson@business.com',
        'tier': 'Enterprise',
        'persona': 'volatile_mixed',
        'account_age': '2 years'
    },
    'CUST-33333': {
        'name': 'Amanda Foster',
        'email': 'a.foster@startup.io',
        'tier': 'Gold',
        'persona': 'recovering_churned',
        'account_age': '1 year'
    }
}


# Version number - increment to force regeneration of all mock data
MOCK_DATA_VERSION = "v2"

def _get_seeded_random(seed_string: str) -> random.Random:
    """Create a seeded random generator for consistent results"""
    # Include version in seed so data regenerates when we update the algorithm
    versioned_seed = f"{MOCK_DATA_VERSION}_{seed_string}"
    seed = int(hashlib.md5(versioned_seed.encode()).hexdigest()[:8], 16)
    return random.Random(seed)


def _generate_sentiment_score(
    rng: random.Random,
    base: float,
    variance: float,
    trend: str,
    progress: float  # 0.0 to 1.0, how far through the time period
) -> float:
    """Generate a sentiment score with trend consideration"""

    # Apply trend modifier - stronger effect for clearer demo visualization
    trend_modifier = 0.0

    if trend == 'improving':
        # Start negative, end positive - clear upward trajectory
        trend_modifier = -0.3 + (progress * 0.7)  # -0.3 at start, +0.4 at end
    elif trend == 'declining':
        # Start positive, end negative - clear downward trajectory
        trend_modifier = 0.3 - (progress * 0.7)  # +0.3 at start, -0.4 at end
    elif trend == 'volatile':
        trend_modifier = rng.uniform(-0.3, 0.3)
    # 'stable' has no trend modifier

    # Generate score with variance (reduced for clearer trends)
    actual_variance = variance * 0.6  # Reduce noise for clearer demo
    score = base + trend_modifier + rng.uniform(-actual_variance, actual_variance)

    # Clamp to valid range
    return max(-1.0, min(1.0, score))


def _score_to_label(score: float) -> str:
    """Convert numeric score to sentiment label"""
    if score >= 0.15:
        return 'positive'
    elif score <= -0.15:
        return 'negative'
    return 'neutral'


def _get_interaction_count(rng: random.Random, frequency: str, days: int) -> int:
    """Determine number of interactions based on frequency and time period.

    Realistic frequency: customers typically contact support ~once a month.
    For demo purposes: 3-5 interactions for 90 days looks realistic.
    """
    # Direct count ranges for different periods - simple and predictable
    if days <= 30:
        counts = {'low': (1, 2), 'medium': (2, 2), 'high': (2, 3)}
    elif days <= 60:
        counts = {'low': (2, 3), 'medium': (2, 3), 'high': (3, 4)}
    else:  # 90 days
        counts = {'low': (3, 4), 'medium': (3, 5), 'high': (4, 5)}

    min_count, max_count = counts.get(frequency, (3, 4))
    return rng.randint(min_count, max_count)


def generate_customer_history(
    customer_id: str,
    days: int = 90,
    persona: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generate mock historical interactions for a customer.

    Args:
        customer_id: Unique customer identifier
        days: Number of days of history to generate (30, 60, or 90)
        persona: Customer persona type (random if None)

    Returns:
        List of historical interaction records
    """
    # Use customer_id + days as seed for consistency
    rng = _get_seeded_random(f"{customer_id}_{days}")

    # Get persona config
    if persona is None:
        if customer_id in DEMO_CUSTOMERS:
            persona = DEMO_CUSTOMERS[customer_id]['persona']
        else:
            persona = rng.choice(list(CUSTOMER_PERSONAS.keys()))

    persona_config = CUSTOMER_PERSONAS.get(persona, CUSTOMER_PERSONAS['satisfied_loyal'])

    # Determine number of interactions
    num_interactions = _get_interaction_count(
        rng,
        persona_config['interaction_frequency'],
        days
    )

    # Generate timestamps spread over the period
    now = datetime.now()
    start_date = now - timedelta(days=days)

    timestamps = sorted([
        start_date + timedelta(
            days=rng.random() * days,
            hours=rng.randint(8, 20),
            minutes=rng.randint(0, 59)
        )
        for _ in range(num_interactions)
    ])

    interactions = []
    channels = list(CHANNEL_CONFIG.keys())
    channel_weights = [CHANNEL_CONFIG[ch]['weight'] for ch in channels]

    for i, ts in enumerate(timestamps):
        # Select channel based on weights
        channel = rng.choices(channels, weights=channel_weights)[0]
        channel_config = CHANNEL_CONFIG[channel]

        # Calculate progress through time period (0.0 to 1.0)
        progress = (ts - start_date).total_seconds() / (timedelta(days=days).total_seconds())

        # Generate sentiment
        score = _generate_sentiment_score(
            rng,
            persona_config['base_sentiment'],
            persona_config['variance'],
            persona_config['trend'],
            progress
        )

        label = _score_to_label(score)
        confidence = rng.randint(65, 95)

        # Select sentiment-appropriate summary
        summaries_by_sentiment = channel_config['summaries']
        summary = rng.choice(summaries_by_sentiment[label])

        # Determine resolution based on sentiment
        if label == 'positive':
            resolution = 'resolved'
        elif label == 'negative' and rng.random() > 0.6:
            resolution = 'escalated'
        else:
            resolution = rng.choice(['resolved', 'pending', 'resolved'])

        # Create interaction
        interaction = HistoricalInteraction(
            id=f"INT-{customer_id}-{i+1:04d}",
            customer_id=customer_id,
            timestamp=ts.isoformat(),
            channel=channel,
            sentiment_score=round(score, 3),
            sentiment_label=label,
            confidence=confidence,
            summary=summary,
            agent_id=f"AGENT-{rng.randint(100, 999)}" if channel in ['call', 'chat'] else None,
            resolution=resolution
        )

        interactions.append(interaction.to_dict())

    return interactions


def calculate_sentiment_summary(interactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate summary statistics from interaction history.

    Args:
        interactions: List of interaction records

    Returns:
        Summary dict with stats, trend, and distributions
    """
    if not interactions:
        return {
            'total_interactions': 0,
            'average_sentiment': 0.0,
            'trend': 'stable',
            'channel_breakdown': {},
            'sentiment_distribution': {'positive': 0, 'neutral': 0, 'negative': 0},
            'period_days': 0,
            'last_interaction': None
        }

    scores = [i['sentiment_score'] for i in interactions]
    labels = [i['sentiment_label'] for i in interactions]
    channels = [i['channel'] for i in interactions]

    # Calculate average sentiment
    avg_sentiment = sum(scores) / len(scores)

    # Calculate trend (compare first third vs last third)
    third = max(1, len(scores) // 3)
    first_third_avg = sum(scores[:third]) / third
    last_third_avg = sum(scores[-third:]) / third
    diff = last_third_avg - first_third_avg

    if diff > 0.15:
        trend = 'improving'
    elif diff < -0.15:
        trend = 'declining'
    else:
        trend = 'stable'

    # Channel breakdown
    channel_breakdown = {}
    for ch in set(channels):
        channel_breakdown[ch] = channels.count(ch)

    # Sentiment distribution
    sentiment_dist = {
        'positive': labels.count('positive'),
        'neutral': labels.count('neutral'),
        'negative': labels.count('negative')
    }

    # Calculate period in days
    if len(interactions) >= 2:
        first_ts = datetime.fromisoformat(interactions[0]['timestamp'])
        last_ts = datetime.fromisoformat(interactions[-1]['timestamp'])
        period_days = (last_ts - first_ts).days
    else:
        period_days = 0

    return {
        'total_interactions': len(interactions),
        'average_sentiment': round(avg_sentiment, 3),
        'trend': trend,
        'channel_breakdown': channel_breakdown,
        'sentiment_distribution': sentiment_dist,
        'period_days': period_days,
        'last_interaction': interactions[-1]['timestamp'] if interactions else None
    }


# Cache for consistent demo data within a session
_history_cache: Dict[str, Dict[str, Any]] = {}


def get_customer_history(customer_id: str, days: int = 90) -> Dict[str, Any]:
    """
    Get or generate customer sentiment history.

    Results are cached for session consistency.

    Args:
        customer_id: Customer identifier
        days: Number of days of history (30, 60, or 90)

    Returns:
        Dict containing customer_id, interactions list, and summary
    """
    # Validate days parameter
    if days not in [30, 60, 90]:
        days = 90

    cache_key = f"{customer_id}_{days}"

    if cache_key not in _history_cache:
        interactions = generate_customer_history(customer_id, days)
        summary = calculate_sentiment_summary(interactions)

        _history_cache[cache_key] = {
            'customer_id': customer_id,
            'customer_info': DEMO_CUSTOMERS.get(customer_id, {'name': 'Unknown Customer'}),
            'interactions': interactions,
            'summary': summary
        }

    return _history_cache[cache_key]


def clear_history_cache():
    """Clear the history cache (useful for testing)"""
    global _history_cache
    _history_cache = {}


def get_demo_customers() -> List[Dict[str, Any]]:
    """Get list of available demo customers with their personas"""
    return [
        {
            'id': cid,
            'name': info['name'],
            'email': info.get('email', ''),
            'tier': info.get('tier', 'Standard'),
            'persona': info['persona'],
            'persona_description': CUSTOMER_PERSONAS[info['persona']]['description']
        }
        for cid, info in DEMO_CUSTOMERS.items()
    ]
