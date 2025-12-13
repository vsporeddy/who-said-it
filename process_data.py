import json
import datetime
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# --- CONFIGURATION ---
INPUT_FILE = 'game_data.json'
OUTPUT_FILE = 'final_game_data.json'
CHANNEL_DIFFICULTY = {
    454492770682404877: 1, # general: Hard
    538641451211292673: 1, # cowboy-thoughts: Hard
    1077821285566001252: 1, # stream-archive: Hard
    1318834323163447337: -1, # antisocial-book-club: Easy
    1063742740766134322: 0, # jelley-events: Medium
    902348468302020628: -1, # 🚜-tractor-hands: Easy
    924833852030062694: -1, # tft-containment: Easy
    827391154655461376: -1, # valorant: Easy
    933087762557579365: -1, # arom-stats: Easy
    1114109093171437648: -1, # mlee-pocket-ride: Easy
    1311195432545812491: -1, # phrecia-enjoyers: Easy
    1345227643406123101: -1, # ptcgp: Easy
    648376150447357962: 0, # howdy-chat: Medium
    822283830396059650: 0, # sussy-hours: Medium
    827401801383936041: -1, # frick-rankings: Easy
    922674739892338728: -1, # weeb-zone: Easy
    833083167081758801: 0, # game-recs: Medium
    1151786645536903309: -1, # defendant-donald: Easy
    1299504661585203292: -1, # t: Easy
    941068107009650738: -1  # lost-ark: Easy
}
def get_timestamp_from_snowflake(snowflake_id):
    snowflake = int(snowflake_id)
    timestamp_ms = (snowflake >> 22) + 1420070400000
    return datetime.datetime.fromtimestamp(timestamp_ms / 1000.0, tz=datetime.timezone.utc)

def main():
    print(f"Loading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    raw_msg_count = len(data["messages"])
    print(f"Loaded {raw_msg_count} raw messages.")

    # ---------------------------------------------------------
    # STEP 1: BASIC SCORING
    # ---------------------------------------------------------
    print("Calculating Basic Difficulty Scores...")

    clean_messages = []
    training_texts = []
    training_authors = []
    today = datetime.datetime.now(datetime.timezone.utc)

    for msg in data["messages"]:
        training_texts.append(msg['content'])
        training_authors.append(msg['author_id'])

        # 1. Age-based Difficulty
        msg_dt = get_timestamp_from_snowflake(msg['msg_id'])
        days_old = (today - msg_dt).days
        age_score = 0
        if days_old < 365: age_score = -1   # Recent (within the last year)
        elif days_old > 365*3: age_score = 1  # Old  (over 3 years ago)

        # 2. Channel-based Difficulty
        chan_score = 0
        if 'channel_id' in msg:
            chan_score = CHANNEL_DIFFICULTY.get(msg['channel_id'], 0)

        # 3. Length-based Difficulty
        len_score = 0
        w_len = len(msg['content'].split())
        if w_len <= 12: len_score = 1  # Short (<12 words)
        elif w_len > 30: len_score = -1 # Long (>30 words)

        msg['calc_age_score'] = age_score
        msg['calc_chan_score'] = chan_score
        msg['calc_len_score'] = len_score

        clean_messages.append(msg)

    print(f"Calculated basic scores for {len(clean_messages)} messages.")

    # ---------------------------------------------------------
    # STEP 2: AI STYLOMETRY ANALYSIS
    # ---------------------------------------------------------
    if len(training_texts) > 50:
        print("Training AI Stylistic Analyzer (Case & Punctuation Sensitive)...")

        # N-Grams (3-5 chars) capture punctuation, capitalization, and emoji usage
        vectorizer = CountVectorizer(
            analyzer='char_wb', 
            ngram_range=(3, 5), 
            lowercase=False,
            min_df=2 
        )

        model = make_pipeline(vectorizer, MultinomialNB())
        model.fit(training_texts, training_authors)

        print("Calculating AI Difficulty for each message...")

        for msg in clean_messages:
            # Predict probability
            probs = model.predict_proba([msg['content']])[0]
            
            # Find the probability assigned to the ACTUAL author
            # (If the AI is 99% sure it's you, it's an EASY message)
            try:
                author_idx = np.where(model.classes_ == msg['author_id'])[0][0]
                confidence = probs[author_idx]
            except IndexError:
                # Should not happen unless author was filtered out of training data somehow
                confidence = 0.1

            # Invert Confidence to get Difficulty
            # 1.0 Conf -> 0 Diff
            # 0.0 Conf -> 10 Diff
            ai_score = 10 - (confidence * 9)
            
            # ---------------------------------------------------------
            # STEP 3: FINAL SCORE AGGREGATION
            # ---------------------------------------------------------
            # Base = 5 (Medium)
            # + Age (-1 to +1)
            # + Channel (-1 to +1)
            # + Length (-1 to +1)
            # + AI Offset (Mapped from 1-10 scale to approx -3 to +3)
            
            ai_offset = (ai_score - 5) * 0.7 
            
            final_raw = 5 + msg['calc_age_score'] + msg['calc_chan_score'] + msg['calc_len_score'] + ai_offset
            
            # Clamp 1-10
            final_score = max(1, min(10, int(round(final_raw))))
            
            # Label
            label = "Medium"
            if final_score <= 3: label = "Easy"
            elif final_score >= 8: label = "Hard" # 8-10 is Hard
            
            # Clean up temporary fields so JSON isn't huge
            del msg['calc_age_score']
            del msg['calc_chan_score']
            del msg['calc_len_score']
            
            msg['difficulty'] = {
                'score': final_score,
                'label': label
            }
            
            # Optional: Add "Imposter" data
            # If the AI was WRONG (Top guess was someone else), store that
            top_guess_idx = np.argmax(probs)
            if top_guess_idx != author_idx:
                imposter_id = model.classes_[top_guess_idx]
                imposter_conf = probs[top_guess_idx]
                # Only add imposter hint if AI was somewhat confident (>40%)
                if imposter_conf > 0.4:
                    msg['imposter_id'] = str(imposter_id)

    # ---------------------------------------------------------
    # STEP 4: CLEANUP USERS
    # ---------------------------------------------------------
    print("Cleaning up user list...")
    
    # Identify all authors who exist in the cleaned message list
    active_authors = set(m['author_id'] for m in clean_messages)

    final_users = {}
    for uid, user in data["users"].items():
        if uid in active_authors:
            final_users[uid] = user
            
    print(f"Users reduced from {len(data['users'])} to {len(final_users)}.")

    # ---------------------------------------------------------
    # STEP 5: SAVE
    # ---------------------------------------------------------
    final_data = {
        "meta": data["meta"],
        "users": final_users,
        "messages": clean_messages
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_data, f)
        
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()