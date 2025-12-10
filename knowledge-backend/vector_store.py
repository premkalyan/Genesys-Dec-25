"""
Vector Store - ChromaDB integration for RAG
Handles document embedding, storage, and retrieval.
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import os
import json

# Constants
COLLECTION_NAME = "genesys_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K_DEFAULT = 5

# Initialize paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")


class KnowledgeStore:
    """Vector store for Genesys knowledge base using ChromaDB."""

    def __init__(self, persist_directory: str = CHROMA_DIR):
        """Initialize the knowledge store."""
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(path=persist_directory)

        # Initialize embedding model
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        self.embedder = SentenceTransformer(EMBEDDING_MODEL)

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "Genesys Cloud documentation"}
        )

        print(f"Knowledge store initialized. Documents: {self.collection.count()}")

    def chunk_text(self, text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)

        return chunks

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text."""
        return self.embedder.encode(text).tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        return self.embedder.encode(texts).tolist()

    def ingest_documents(self, documents: List[Dict]) -> Dict:
        """
        Ingest documents into the vector store.

        Args:
            documents: List of document dicts with id, title, content, url, category

        Returns:
            Stats about ingestion
        """
        total_chunks = 0
        doc_count = 0

        for doc in documents:
            doc_id = doc.get("id", "")
            title = doc.get("title", "")
            content = doc.get("content", "")
            url = doc.get("url", "")
            category = doc.get("category", "General")

            if not content:
                continue

            # Chunk the content
            chunks = self.chunk_text(content)

            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id}_chunk_{i}"

                # Prepare text for embedding (include title for context)
                embed_text = f"{title}\n\n{chunk}"

                # Generate embedding
                embedding = self.embed_text(embed_text)

                # Add to collection
                self.collection.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{
                        "doc_id": doc_id,
                        "title": title,
                        "url": url,
                        "category": category,
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }]
                )

                total_chunks += 1

            doc_count += 1

        return {
            "documents_ingested": doc_count,
            "chunks_created": total_chunks,
            "total_documents": self.collection.count()
        }

    def search(
        self,
        query: str,
        top_k: int = TOP_K_DEFAULT,
        category_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for relevant documents.

        Args:
            query: Search query
            top_k: Number of results to return
            category_filter: Optional category to filter by

        Returns:
            List of relevant document chunks with metadata
        """
        # Generate query embedding
        query_embedding = self.embed_text(query)

        # Build where filter if category specified
        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}

        # Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        formatted_results = []
        if results and results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 0

                # Convert distance to relevance score (1 - normalized distance)
                relevance = max(0, 1 - distance)

                formatted_results.append({
                    "content": doc,
                    "title": metadata.get("title", ""),
                    "url": metadata.get("url", ""),
                    "category": metadata.get("category", ""),
                    "relevance": round(relevance, 4),
                    "chunk_index": metadata.get("chunk_index", 0),
                    "total_chunks": metadata.get("total_chunks", 1)
                })

        return formatted_results

    def get_stats(self) -> Dict:
        """Get statistics about the knowledge base."""
        count = self.collection.count()

        # Get sample of metadatas to analyze categories
        if count > 0:
            sample = self.collection.peek(limit=min(count, 100))
            categories = {}
            titles = set()

            for meta in sample.get('metadatas', []):
                cat = meta.get('category', 'Unknown')
                categories[cat] = categories.get(cat, 0) + 1
                titles.add(meta.get('title', ''))

            return {
                "total_chunks": count,
                "unique_documents": len(titles),
                "categories": categories,
                "embedding_model": EMBEDDING_MODEL
            }

        return {
            "total_chunks": 0,
            "unique_documents": 0,
            "categories": {},
            "embedding_model": EMBEDDING_MODEL
        }

    def delete_document(self, doc_id: str) -> bool:
        """Delete all chunks for a document."""
        try:
            # Find all chunks for this document
            results = self.collection.get(
                where={"doc_id": doc_id},
                include=["metadatas"]
            )

            if results and results['ids']:
                self.collection.delete(ids=results['ids'])
                return True

            return False
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False

    def clear(self):
        """Clear all documents from the collection."""
        self.client.delete_collection(COLLECTION_NAME)
        self.collection = self.client.create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "Genesys Cloud documentation"}
        )

    def get_all_documents(self, limit: int = 100) -> List[Dict]:
        """Get all unique documents (not chunks) in the store."""
        results = self.collection.peek(limit=limit)

        # Deduplicate by title
        seen = set()
        documents = []

        for i, meta in enumerate(results.get('metadatas', [])):
            title = meta.get('title', '')
            if title not in seen:
                seen.add(title)
                documents.append({
                    "id": meta.get('doc_id', ''),
                    "title": title,
                    "url": meta.get('url', ''),
                    "category": meta.get('category', ''),
                    "chunks": meta.get('total_chunks', 1)
                })

        return documents


# Singleton instance
_store_instance = None


def get_store() -> KnowledgeStore:
    """Get or create the singleton knowledge store instance."""
    global _store_instance
    if _store_instance is None:
        _store_instance = KnowledgeStore()
    return _store_instance


if __name__ == "__main__":
    # Test the vector store
    store = get_store()

    print("\n--- Testing Vector Store ---")
    print(f"Stats: {store.get_stats()}")

    # Test search
    query = "How do I configure Agent Copilot?"
    print(f"\nSearching: '{query}'")
    results = store.search(query, top_k=3)

    for i, r in enumerate(results, 1):
        print(f"\n{i}. {r['title']} (relevance: {r['relevance']})")
        print(f"   {r['content'][:200]}...")
