from textblob import TextBlob

def analyze_sentiment(text: str):
    blob = TextBlob(text)
    sentiment = blob.sentiment
    return {
        "polarity": sentiment.polarity,         # -1 (negative) to 1 (positive)
        "subjectivity": sentiment.subjectivity  # 0 (objective) to 1 (subjective)
    }
