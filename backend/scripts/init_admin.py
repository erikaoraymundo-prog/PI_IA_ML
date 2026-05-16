"""
Script para inicializar o primeiro administrador na collection user_Admin do Firebase.
Execute apenas uma vez para criar o primeiro admin. Após isso, novos admins
podem ser adicionados pelo painel administrativo no frontend.

Uso:
    python -m backend.scripts.init_admin --email admin@empresa.com --nome "Nome do Admin"
"""
import os
import sys
import argparse
from datetime import datetime

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter


def init_admin(email: str, nome: str = "", role: str = "super_admin"):
    """Cria o primeiro administrador na collection user_Admin."""
    db = get_db()
    if not db:
        print("❌ Erro: Não foi possível conectar ao Firebase.")
        print("   Verifique se FIREBASE_SERVICE_ACCOUNT_KEY está configurado no env/.env")
        return False

    # Verificar se já existe
    existing = db.collection('user_Admin').where(filter=FieldFilter('email', '==', email)).limit(1).stream()
    for doc in existing:
        print(f"⚠️  O email '{email}' já é administrador (ID: {doc.id})")
        return True

    # Criar admin
    admin_data = {
        "email": email.strip().lower(),
        "nome": nome.strip(),
        "role": role,
        "addedBy": "system_init",
        "addedAt": datetime.utcnow().isoformat(),
        "active": True
    }

    doc_ref = db.collection('user_Admin').add(admin_data)
    print(f"✅ Admin criado com sucesso!")
    print(f"   Email: {email}")
    print(f"   Nome:  {nome or '(não informado)'}")
    print(f"   Role:  {role}")
    print(f"   ID:    {doc_ref[1].id}")
    print(f"\n   Agora faça login com este email no frontend e acesse ⚙️ Admin no menu.")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inicializar primeiro administrador no Firebase")
    parser.add_argument("--email", required=True, help="Email do administrador")
    parser.add_argument("--nome", default="", help="Nome do administrador")
    parser.add_argument("--role", default="super_admin", choices=["admin", "super_admin"], help="Nível de permissão")
    
    args = parser.parse_args()
    init_admin(args.email, args.nome, args.role)
