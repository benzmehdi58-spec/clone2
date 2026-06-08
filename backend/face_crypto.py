import os
import struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 32-byte hex key for AES-256 (in production, use environment variable)
DEFAULT_KEY = "1" * 64

def _get_key() -> bytes:
    key_hex = os.environ.get("FACE_ENCRYPTION_KEY", DEFAULT_KEY)
    key_bytes = bytes.fromhex(key_hex)
    if len(key_bytes) != 32:
        raise ValueError("FACE_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)")
    return key_bytes

def encrypt_embedding(embedding: list[float]) -> tuple[bytes, bytes, bytes]:
    if len(embedding) != 128:
        raise ValueError(f"Expected 128-dim embedding, got {len(embedding)}")

    plaintext = struct.pack(f"{len(embedding)}f", *embedding)
    key = _get_key()
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    
    ct_with_tag = aesgcm.encrypt(iv, plaintext, None)
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    
    return ciphertext, iv, tag

def decrypt_embedding(ciphertext: bytes, iv: bytes, tag: bytes) -> list[float]:
    key = _get_key()
    aesgcm = AESGCM(key)
    ct_with_tag = ciphertext + tag
    plaintext = aesgcm.decrypt(iv, ct_with_tag, None)
    
    num_floats = len(plaintext) // 4
    embedding = list(struct.unpack(f"{num_floats}f", plaintext))
    return embedding
