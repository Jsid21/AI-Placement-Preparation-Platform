from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

MODEL_NAME = "Minej/bert-base-personality"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

PERSONALITY_TRAITS = [
    "Extroversion",
    "Neuroticism",
    "Agreeableness",
    "Conscientiousness",
    "Openness"
]

def personality_detection(text: str):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        scores = torch.sigmoid(outputs.logits).squeeze().tolist()
    return {trait: float(f"{score:.3f}") for trait, score in zip(PERSONALITY_TRAITS, scores)}