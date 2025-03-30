import gradio as gr
import speech_recognition as sr
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Initialize the model and tokenizer
model_name = "j-hartmann/emotion-english-distilroberta-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def personality_detection(text):
    try:
        # Tokenize the text
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get the emotion labels
        labels = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'love']
        
        # Format results
        formatted_results = "Emotional Analysis Results:\n\n"
        for i, (label, score) in enumerate(zip(labels, predictions[0])):
            formatted_results += f"{label.capitalize()}: {score.item():.2f}\n"
        
        return formatted_results
    except Exception as e:
        return f"Error in analysis: {str(e)}"

def speech_to_text(audio):
    recognizer = sr.Recognizer()
    with sr.AudioFile(audio) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
            return text
        except sr.UnknownValueError:
            return "Could not understand audio"
        except sr.RequestError:
            return "Could not request results"

def process_audio(audio):
    # First convert speech to text
    text = speech_to_text(audio)
    
    # Then perform personality detection
    if text and text not in ["Could not understand audio", "Could not request results"]:
        return personality_detection(text)
    else:
        return f"Error: {text}"

# Create the Gradio interface
iface = gr.Interface(
    fn=process_audio,
    inputs=gr.Audio(source="microphone", type="filepath"),
    outputs=gr.Textbox(label="Emotional Analysis Results"),
    title="Emotional Analysis from Speech",
    description="Speak into your microphone to analyze your emotional state.",
    theme="huggingface"
)

if __name__ == "__main__":
    iface.launch()
