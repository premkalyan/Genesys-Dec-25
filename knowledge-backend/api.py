"""
FastAPI server for Knowledge RAG backend
Provides endpoints for knowledge search, ingestion, and management.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
import os

from vector_store import get_store, KnowledgeStore
from scraper import get_sample_documents, scrape_genesys_docs, save_documents, load_documents
from sentiment import analyze_sentiment, SentimentProvider, get_provider_info
from mock_history import get_customer_history, get_demo_customers, clear_history_cache, DEMO_CUSTOMERS

app = FastAPI(
    title="Genesys Knowledge RAG API",
    description="RAG backend for real-time agent assist with Genesys Cloud documentation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    category: Optional[str] = None


class SearchResult(BaseModel):
    content: str
    title: str
    url: str
    category: str
    relevance: float


class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    latency_ms: int
    total_results: int


class DocumentInput(BaseModel):
    id: str
    title: str
    content: str
    url: Optional[str] = ""
    category: Optional[str] = "General"


class IngestRequest(BaseModel):
    documents: List[DocumentInput]


class IngestResponse(BaseModel):
    documents_ingested: int
    chunks_created: int
    total_documents: int
    status: str


class StatsResponse(BaseModel):
    total_chunks: int
    unique_documents: int
    categories: Dict[str, int]
    embedding_model: str


class SuggestRequest(BaseModel):
    conversation: List[Dict[str, str]]  # List of {role, content} messages
    context: Optional[str] = None


class SuggestResponse(BaseModel):
    suggestions: List[str]
    knowledge_cards: List[Dict[str, Any]]
    sentiment: str
    latency_ms: int


# Sentiment Analysis Models
class SentimentAnalyzeRequest(BaseModel):
    text: str
    provider: Optional[str] = "vader"  # "vader" or "transformer"


class SentimentAnalyzeResponse(BaseModel):
    provider: str
    sentiment: str
    score: float
    confidence: float
    processing_time_ms: int
    breakdown: Dict[str, Any]


class SentimentHistoryResponse(BaseModel):
    customer_id: str
    customer_info: Dict[str, Any]
    interactions: List[Dict[str, Any]]
    summary: Dict[str, Any]


# Routes
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Genesys Knowledge RAG"}


@app.get("/health")
async def health():
    """Detailed health check."""
    store = get_store()
    stats = store.get_stats()
    return {
        "healthy": True,
        "documents": stats.get("unique_documents", 0),
        "chunks": stats.get("total_chunks", 0)
    }


@app.post("/api/knowledge/search", response_model=SearchResponse)
async def search_knowledge(request: SearchRequest):
    """
    Search the knowledge base for relevant documents.
    """
    start_time = time.time()

    try:
        store = get_store()
        results = store.search(
            query=request.query,
            top_k=request.top_k,
            category_filter=request.category
        )

        latency_ms = int((time.time() - start_time) * 1000)

        return SearchResponse(
            results=[SearchResult(**r) for r in results],
            query=request.query,
            latency_ms=latency_ms,
            total_results=len(results)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/ingest", response_model=IngestResponse)
async def ingest_documents(request: IngestRequest):
    """
    Ingest documents into the knowledge base.
    """
    try:
        store = get_store()

        # Convert Pydantic models to dicts
        docs = [doc.model_dump() for doc in request.documents]

        stats = store.ingest_documents(docs)

        return IngestResponse(
            documents_ingested=stats["documents_ingested"],
            chunks_created=stats["chunks_created"],
            total_documents=stats["total_documents"],
            status="success"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get statistics about the knowledge base.
    """
    try:
        store = get_store()
        stats = store.get_stats()
        return StatsResponse(**stats)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge/documents")
async def list_documents(limit: int = 100):
    """
    List all documents in the knowledge base.
    """
    try:
        store = get_store()
        documents = store.get_all_documents(limit=limit)
        return {"documents": documents, "count": len(documents)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/knowledge/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document from the knowledge base.
    """
    try:
        store = get_store()
        success = store.delete_document(doc_id)

        if success:
            return {"status": "deleted", "doc_id": doc_id}
        else:
            raise HTTPException(status_code=404, detail="Document not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/clear")
async def clear_knowledge_base():
    """
    Clear all documents from the knowledge base.
    """
    try:
        store = get_store()
        store.clear()
        return {"status": "cleared", "message": "All documents removed"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/load-samples")
async def load_sample_documents():
    """
    Load sample Genesys documents into the knowledge base.
    """
    try:
        store = get_store()

        # Get sample documents
        docs = get_sample_documents()

        # Ingest them
        stats = store.ingest_documents(docs)

        return {
            "status": "success",
            "message": f"Loaded {stats['documents_ingested']} sample documents",
            "stats": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/assist/suggest", response_model=SuggestResponse)
async def get_suggestions(request: SuggestRequest):
    """
    Get AI suggestions based on conversation context.
    This endpoint combines RAG search with suggestion generation.
    """
    start_time = time.time()

    try:
        store = get_store()

        # Get the last customer message for context
        customer_messages = [
            m for m in request.conversation
            if m.get("role") == "customer"
        ]

        if not customer_messages:
            return SuggestResponse(
                suggestions=["Hello! How can I help you today?"],
                knowledge_cards=[],
                sentiment="neutral",
                latency_ms=0
            )

        last_message = customer_messages[-1].get("content", "")

        # Search knowledge base
        results = store.search(last_message, top_k=3)

        # Simple sentiment detection
        sentiment = detect_sentiment(last_message)

        # Generate suggestions based on context
        suggestions = generate_suggestions(last_message, results, sentiment)

        # Format knowledge cards
        knowledge_cards = [
            {
                "title": r["title"],
                "summary": r["content"][:200] + "..." if len(r["content"]) > 200 else r["content"],
                "url": r["url"],
                "category": r["category"],
                "relevance": r["relevance"]
            }
            for r in results
        ]

        latency_ms = int((time.time() - start_time) * 1000)

        return SuggestResponse(
            suggestions=suggestions,
            knowledge_cards=knowledge_cards,
            sentiment=sentiment,
            latency_ms=latency_ms
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def detect_sentiment(text: str) -> str:
    """Simple keyword-based sentiment detection."""
    text_lower = text.lower()

    # Negative indicators
    negative_words = [
        "problem", "issue", "broken", "not working", "error", "failed",
        "frustrated", "angry", "upset", "terrible", "worst", "hate",
        "disappointed", "annoyed", "confused", "stuck", "help"
    ]

    # Positive indicators
    positive_words = [
        "thanks", "thank you", "great", "good", "excellent", "perfect",
        "happy", "pleased", "appreciate", "wonderful", "helpful", "solved"
    ]

    negative_count = sum(1 for word in negative_words if word in text_lower)
    positive_count = sum(1 for word in positive_words if word in text_lower)

    if negative_count > positive_count:
        return "negative"
    elif positive_count > negative_count:
        return "positive"
    else:
        return "neutral"


def generate_suggestions(message: str, knowledge_results: List[Dict], sentiment: str) -> List[str]:
    """Generate response suggestions based on context and knowledge."""
    suggestions = []
    message_lower = message.lower()

    # Greeting responses
    if any(word in message_lower for word in ["hi", "hello", "hey"]):
        suggestions.append("Hello! I'd be happy to help you today. What can I assist you with?")

    # Problem acknowledgment for negative sentiment
    if sentiment == "negative":
        suggestions.append("I understand this can be frustrating. Let me help you resolve this issue.")

    # Generate suggestions from knowledge results
    if knowledge_results:
        top_result = knowledge_results[0]

        # Configuration questions
        if "configure" in message_lower or "setup" in message_lower or "set up" in message_lower:
            suggestions.append(f"Based on our documentation about {top_result['title']}, let me walk you through the configuration steps.")

        # Troubleshooting questions
        if "not working" in message_lower or "error" in message_lower or "issue" in message_lower:
            suggestions.append(f"I found a relevant troubleshooting guide. The most common cause is usually related to configuration settings. Have you checked the {top_result['title'].lower().replace('about ', '')}?")

        # Where/How questions
        if "where" in message_lower or "how do i" in message_lower:
            suggestions.append(f"You can find this in the Admin section. According to our {top_result['title']} documentation, here are the steps...")

        # Agent Copilot specific
        if "agent copilot" in message_lower:
            if "suggestions" in message_lower or "not showing" in message_lower or "not appearing" in message_lower:
                suggestions.append("For Agent Copilot suggestions not appearing, please check: 1) NLU confidence threshold (try lowering to 0.6), 2) Knowledge base connection, 3) Queue configuration.")
            elif "configure" in message_lower:
                suggestions.append("To configure Agent Copilot: Navigate to Admin > AI > Agent Copilot Settings. I can guide you through each step.")

    # Default suggestions if no specific matches
    if not suggestions:
        suggestions.append("I'll be happy to help you with that. Could you provide more details about what you're trying to accomplish?")
        suggestions.append("Let me look into this for you. Can you tell me which Genesys Cloud feature this relates to?")

    # Limit to 3 suggestions
    return suggestions[:3]


# =====================
# Sentiment Analysis API
# =====================

@app.post("/api/sentiment/analyze", response_model=SentimentAnalyzeResponse)
async def analyze_text_sentiment(request: SentimentAnalyzeRequest):
    """
    Analyze sentiment of text using specified provider.

    Providers:
    - vader: Fast rule-based analysis (~5ms)
    - transformer: ML-based DistilBERT (~50-200ms)
    """
    start_time = time.time()

    try:
        # Map string provider to enum
        provider = SentimentProvider.TRANSFORMER if request.provider == "transformer" else SentimentProvider.VADER

        # Analyze sentiment
        result = analyze_sentiment(request.text, provider)

        return SentimentAnalyzeResponse(
            provider=result.provider,
            sentiment=result.sentiment,
            score=result.score,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms,
            breakdown=result.breakdown
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/history/{customer_id}", response_model=SentimentHistoryResponse)
async def get_sentiment_history(customer_id: str, days: int = 90):
    """
    Get historical sentiment data for a customer.

    Args:
        customer_id: Customer identifier (e.g., CUST-12345)
        days: Number of days of history (30, 60, or 90)

    Returns mock data for demo purposes.
    """
    try:
        # Validate days parameter
        if days not in [30, 60, 90]:
            days = 90

        history = get_customer_history(customer_id, days)

        return SentimentHistoryResponse(
            customer_id=history['customer_id'],
            customer_info=history['customer_info'],
            interactions=history['interactions'],
            summary=history['summary']
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/customers")
async def list_demo_customers():
    """
    List available demo customers for sentiment history.

    Returns pre-defined customers with different sentiment personas.
    """
    try:
        customers = get_demo_customers()
        return {"customers": customers, "count": len(customers)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/providers")
async def list_sentiment_providers():
    """
    List available sentiment analysis providers.

    Returns metadata about each provider's capabilities.
    """
    try:
        providers = get_provider_info()
        return {"providers": providers}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sentiment/reset-history")
async def reset_sentiment_history():
    """
    Reset the sentiment history cache.

    Clears cached data so new history will be generated on next request.
    Useful for demo refresh.
    """
    try:
        clear_history_cache()
        return {"status": "success", "message": "History cache cleared"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3336)
