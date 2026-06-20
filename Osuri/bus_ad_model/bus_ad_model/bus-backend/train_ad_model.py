import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

print("🚀 Generating training data for BOTH directions (Forward + Reverse)...")

# Cities list
cities = ['Colombo', 'Kurunegala', 'Dambulla', 'Kekirawa', 'Anuradhapura']

# Forward: Colombo → Anuradhapura
forward_start = [75, 165, 195, 255]
forward_end   = [90, 180, 210, 270]

# Reverse: Anuradhapura → Colombo
reverse_start = [75, 105, 135, 195]
reverse_end   = [90, 120, 150, 210]

time_of_day_names = {0: 'morning', 1: 'midday', 2: 'evening', 3: 'night'}

np.random.seed(42)
n_samples = 15000

journey_minutes = np.random.randint(0, 301, n_samples)
time_of_day = np.random.randint(0, 4, n_samples)
direction = np.random.choice([0, 1], n_samples)

def get_target_city(minutes, dir_flag):
    if dir_flag == 0:  # Forward
        starts = forward_start
        ends = forward_end
        city_list = ['Kurunegala', 'Dambulla', 'Kekirawa', 'Anuradhapura']
    else:  # Reverse
        starts = reverse_start
        ends = reverse_end
        city_list = ['Kekirawa', 'Dambulla', 'Kurunegala', 'Colombo']
    
    for i in range(len(starts)):
        if starts[i] <= minutes < ends[i]:
            return i, city_list[i]
    return -1, None

targets = []
city_names_list = []

for m, d in zip(journey_minutes, direction):
    idx, name = get_target_city(m, d)
    targets.append(idx)
    city_names_list.append(name)

df = pd.DataFrame({
    'journey_minutes': journey_minutes,
    'time_of_day': time_of_day,
    'direction': direction,
    'target_city': targets,
    'target_city_name': city_names_list
})

df = df[df['target_city'] != -1].reset_index(drop=True)

print(f"Total training rows after cleaning: {len(df)}")

# === SAVE THE DATASET SO YOU CAN SHOW YOUR SUPERVISOR ===
df.to_csv('training_dataset.csv', index=False)
print("✅ Dataset saved as 'training_dataset.csv' (You can show this file to supervisor)")

# Features and target
X = df[['journey_minutes', 'time_of_day', 'direction']]
y = df['target_city']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)

print("Training the model...")
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Training Completed!")
print(f"Model Accuracy: {accuracy * 100:.2f}%")

print("\nDetailed Report:")
print(classification_report(y_test, y_pred, target_names=cities, labels=range(len(cities))))

joblib.dump(model, 'bus_ad_city_model.pkl')
joblib.dump(cities, 'city_mapping.pkl')

print("\nModel saved as: bus_ad_city_model.pkl")
print("City mapping saved as: city_mapping.pkl")
print("✅ Model now supports BOTH directions!")

# Test Predictions
print("\n=== Test Predictions ===")
test_data = pd.DataFrame({
    'journey_minutes': [80, 100, 170, 190, 200, 260, 50, 275],
    'time_of_day': [0, 1, 2, 0, 3, 1, 0, 2],
    'direction': [0, 0, 1, 1, 0, 1, 0, 1]
})

predictions = model.predict(test_data)

for i, row in test_data.iterrows():
    city_name = cities[predictions[i]]
    dir_name = "Forward" if row['direction'] == 0 else "Reverse"
    tod = time_of_day_names[row['time_of_day']]
    print(f"journey={row['journey_minutes']:3d} | direction={dir_name:8} | time={tod:8} → {city_name}")