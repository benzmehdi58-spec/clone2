import math
from face_crypto import encrypt_embedding, decrypt_embedding
import database
import json

def validate_descriptor(descriptor: list[float]) -> tuple[bool, str]:
    if len(descriptor) != 128:
        return False, f"Expected 128-dim descriptor, got {len(descriptor)}"

    if not all(math.isfinite(v) for v in descriptor):
        return False, "Descriptor contains NaN or Inf values"

    if any(abs(v) > 1.5 for v in descriptor):
        return False, "Descriptor values out of expected range [-1.5, 1.5]"

    norm = math.sqrt(sum(v * v for v in descriptor))
    if norm < 0.5 or norm > 1.5:
        return False, f"L2 norm {norm:.4f} outside valid range [0.5, 1.5]"

    mean_val = sum(descriptor) / 128
    variance = sum((v - mean_val) ** 2 for v in descriptor) / 128
    if variance < 0.001:
        return False, f"Descriptor variance {variance:.6f} too low"

    return True, ""

def euclidean_distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def enroll_face(username: str, descriptor: list[float]) -> bool:
    valid, err = validate_descriptor(descriptor)
    if not valid:
        raise ValueError(f"Invalid descriptor: {err}")
        
    user = database.get_user_by_username(username)
    if not user:
        raise ValueError(f"User {username} not found")
        
    ciphertext, iv, tag = encrypt_embedding(descriptor)
    database.upsert_face_embedding(user["id"], ciphertext, iv, tag)
    
    return True

def verify_face(username: str, descriptor: list[float]) -> bool:
    valid, err = validate_descriptor(descriptor)
    if not valid:
        print(f"[FaceAuth] Invalid descriptor: {err}")
        return False
        
    user = database.get_user_by_username(username)
    if not user or not user["face_enrolled"]:
        print(f"[FaceAuth] User {username} not enrolled or not found")
        return False
        
    stored = database.get_face_embedding(user["id"])
    if not stored:
        return False
        
    stored_descriptor = decrypt_embedding(
        stored["encrypted_embedding"], 
        stored["encryption_iv"], 
        stored["encryption_tag"]
    )
    
    distance = euclidean_distance(stored_descriptor, descriptor)
    threshold = 0.5  # face-api.js recommended default threshold
    
    match = distance <= threshold
    print(f"[FaceAuth] Verification for {username}: Distance={distance:.4f}, Match={match}")
    
    if match:
        database.update_last_verified(user["id"])
        
    return match
