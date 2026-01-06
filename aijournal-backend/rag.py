import chromadb
from chromadb.utils import embedding_functions
import os

# 1. Konfiguracja ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# 2. Model Embeddings
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# 3. Kolekcja
collection = chroma_client.get_or_create_collection(
    name="knowledge_base",
    embedding_function=sentence_transformer_ef
)

def add_document(doc_id: str, text: str, metadata: dict, user_id: int):
    """
    Dodaje wpis z przypisanym ID użytkownika (user_id).
    """
    if not text:
        return

    # Dodajemy user_id do metadanych (jako string, bo Chroma tak woli)
    full_metadata = metadata.copy()
    full_metadata["user_id"] = str(user_id) 

    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[full_metadata]
    )
    print(f"[RAG] Zindeksowano dla User {user_id}: {doc_id}")

def search_documents(query: str, user_id: int, n_results=3):
    """
    Szuka wpisów TYLKO dla konkretnego użytkownika.
    """
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            # FILTR BEZPIECZEŃSTWA - To sprawia, że Piotr nie widzi danych Janka
            where={"user_id": str(user_id)} 
        )
        
        context_str = ""
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