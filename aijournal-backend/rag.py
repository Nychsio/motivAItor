# G:\MotivAItor\aijournal-backend\rag.py

import chromadb
from chromadb.utils import embedding_functions
import os

# 1. Konfiguracja ChromaDB
# Dane będą zapisywane w folderze ./chroma_db wewnątrz projektu
# Dzięki temu baza jest trwała (persistent)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# 2. Model Embeddings (Tłumacz Tekst -> Liczby)
# Używamy modelu 'all-MiniLM-L6-v2' (mały, szybki, darmowy, działa na CPU)
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# 3. Pobranie lub stworzenie kolekcji
collection = chroma_client.get_or_create_collection(
    name="knowledge_base",
    embedding_function=sentence_transformer_ef
)

def add_document(doc_id: str, text: str, metadata: dict):
    """
    Dodaje lub aktualizuje wpis w bazie wektorowej.
    
    Args:
        doc_id (str): Unikalne ID (np. "task_15")
        text (str): Treść do zapamiętania (np. "Kupić mleko")
        metadata (dict): Dodatkowe info (np. {"date": "2023-12-01", "type": "task"})
    """
    if not text:
        return

    # ChromaDB wymaga list, nawet dla jednego elementu
    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[metadata]
    )
    print(f"[RAG] Zindeksowano: {doc_id}")

def search_documents(query: str, n_results=3):
    """
    Szuka wpisów semantycznie podobnych do zapytania.
    """
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        # Formatowanie wyników do czytelnego stringa dla Promptu AI
        context_str = ""
        
        # Chroma zwraca listę list (bo można pytać o wiele rzeczy naraz)
        if results['documents']:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            
            for i, doc in enumerate(documents):
                meta = metadatas[i]
                date = meta.get('date', 'N/A')
                type_ = meta.get('type', 'info')
                context_str += f"- [{date}] ({type_}): {doc}\n"
                
        return context_str if context_str else "Brak powiązanych informacji w bazie."
        
    except Exception as e:
        print(f"[RAG Error] Search failed: {e}")
        return ""