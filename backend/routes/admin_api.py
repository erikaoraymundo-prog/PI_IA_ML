from fastapi import APIRouter, HTTPException, Header
from backend.firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Optional

router = APIRouter()


def _is_admin(email: str) -> bool:
    """Verifica se o email tem permissão de administrador."""
    db = get_db()
    if not db:
        return False
    try:
        admins_ref = db.collection('user_Admin').where(filter=FieldFilter('email', '==', email)).limit(1).stream()
        for _ in admins_ref:
            return True
        return False
    except Exception as e:
        print(f"[Admin] Erro ao verificar admin: {e}")
        return False


@router.get("/check")
def check_admin(email: str):
    """
    Verifica se um email possui permissões de administrador.
    Retorna { isAdmin: true/false }
    """
    if not email:
        raise HTTPException(status_code=400, detail="Email é obrigatório")
    return {"isAdmin": _is_admin(email)}


@router.get("/list")
def list_admins(requester_email: str):
    """
    Lista todos os administradores cadastrados.
    Apenas admins podem listar outros admins.
    """
    if not requester_email or not _is_admin(requester_email):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")
    
    try:
        admins_ref = db.collection('user_Admin').stream()
        admins = []
        for admin_doc in admins_ref:
            data = admin_doc.to_dict()
            admins.append({
                "id": admin_doc.id,
                "email": data.get("email", ""),
                "nome": data.get("nome", ""),
                "role": data.get("role", "admin"),
                "addedAt": str(data.get("addedAt", "")),
            })
        return {"admins": admins}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar admins: {e}")


@router.post("/add")
def add_admin(payload: dict, requester_email: str):
    """
    Adiciona um novo administrador.
    Apenas admins existentes podem adicionar novos admins.
    Payload: { email: str, nome: str, role?: str }
    """
    if not requester_email or not _is_admin(requester_email):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    email = payload.get("email", "").strip().lower()
    nome = payload.get("nome", "").strip()
    role = payload.get("role", "admin").strip()
    
    if not email:
        raise HTTPException(status_code=400, detail="Email é obrigatório")
    
    # Verificar se já existe
    if _is_admin(email):
        raise HTTPException(status_code=409, detail="Este email já possui permissões de administrador")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")
    
    try:
        from datetime import datetime
        admin_data = {
            "email": email,
            "nome": nome,
            "role": role,
            "addedBy": requester_email,
            "addedAt": datetime.utcnow().isoformat(),
            "active": True
        }
        db.collection('user_Admin').add(admin_data)
        return {"success": True, "message": f"Admin '{email}' adicionado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar admin: {e}")


@router.delete("/remove/{admin_id}")
def remove_admin(admin_id: str, requester_email: str):
    """
    Remove um administrador pelo ID do documento.
    Admins não podem remover a si mesmos.
    """
    if not requester_email or not _is_admin(requester_email):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")
    
    try:
        admin_ref = db.collection('user_Admin').document(admin_id)
        admin_doc = admin_ref.get()
        
        if not admin_doc.exists:
            raise HTTPException(status_code=404, detail="Admin não encontrado")
        
        admin_data = admin_doc.to_dict()
        if admin_data.get("email") == requester_email:
            raise HTTPException(status_code=400, detail="Você não pode remover a si mesmo")
        
        admin_ref.delete()
        return {"success": True, "message": "Admin removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover admin: {e}")
