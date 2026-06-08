import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import tensorflow as tf
from tf_keras.models import load_model
from tf_keras.preprocessing.sequence import pad_sequences
from tf_keras.losses import Loss
import joblib
import numpy as np

class _FocalLoss(Loss):
    def __init__(self, gamma=2.0, alpha=0.25, **kwargs):
        super().__init__(**kwargs)
        self.gamma = gamma
        self.alpha = alpha
    def call(self, y_true, y_pred):
        return tf.reduce_mean(y_pred) # dummy

SSH_MODEL_PATH = "models/ssh_model.keras"
model = load_model(SSH_MODEL_PATH, custom_objects={"FocalLoss": _FocalLoss})
padded = pad_sequences([[1, 2, 3]], maxlen=50, padding="post", truncating="post")
probs = model.predict(padded, verbose=0)
print(probs)
