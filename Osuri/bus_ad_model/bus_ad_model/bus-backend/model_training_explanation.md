# Bus Backend Model Training and Testing

## Overview
The backend model in `bus-backend/train_ad_model.py` is designed to predict the target city for a bus journey based on journey duration, time of day, and direction (forward or reverse). It uses a supervised machine learning approach with a Random Forest Classifier.

## Data Generation
- **Cities:** Colombo, Kurunegala, Dambulla, Kekirawa, Anuradhapura
- **Features:**
  - `journey_minutes`: Randomly generated journey duration (0–300 minutes)
  - `time_of_day`: Encoded as 0 (morning), 1 (midday), 2 (evening), 3 (night)
  - `direction`: 0 (forward: Colombo → Anuradhapura), 1 (reverse: Anuradhapura → Colombo)
  - `bus_speed`: Average speed between cities (recommended to collect from real-world data)
- **Target:** The city index (and name) where the bus is expected to be, based on journey time and direction.
- The script generates 15,000 samples, assigns target cities using time intervals, and removes invalid samples.
- The cleaned dataset is saved as `training_dataset.csv` for reference.

## Model Training
- **Algorithm:** RandomForestClassifier (from scikit-learn)
- **Parameters:**
  - `n_estimators=200` (number of trees)
  - `random_state=42` (reproducibility)
  - `n_jobs=-1` (use all CPU cores)
- **Process:**
  1. Features and target are split into training and test sets (80/20 split, stratified by target).
  2. The model is trained on the training set.
  3. Model accuracy and a detailed classification report are printed for the test set.
  4. The trained model is saved as `bus_ad_city_model.pkl` and the city mapping as `city_mapping.pkl`.

## Model Testing
- The script includes a test prediction section with sample journeys.
- For each test case, it prints the predicted city, direction, and time of day.

## Example Output
```
✅ Training Completed!
Model Accuracy: 99.XX%

Detailed Report:
              precision    recall  f1-score   support
   Colombo       ...
Kurunegala       ...
 Dambulla       ...
 Kekirawa       ...
Anuradhapura    ...

=== Test Predictions ===
journey= 80 | direction=Forward  | time=morning  → Kurunegala
journey=100 | direction=Forward  | time=midday   → Dambulla
...etc.
```

## Notes
- The model supports both journey directions.
- The dataset and model files are saved for reproducibility and supervisor review.

## Updating the Dataset with Real-World Data

To improve the model's accuracy and realism, you should update `training_dataset.csv` with real-world journey data collected from bus conductors. Consider the following when updating the dataset:

- **Add Rows:**
  - Add new rows for each real observation, including actual journey times, time of day, direction, and the city reached.
  - This helps the model learn from real-world variability and not just synthetic data.

- **Update Rows:**
  - If you find synthetic rows that do not match real-world patterns, update them with accurate values from your observations.
  - Prioritize updating rows where the model often mispredicts or where time slots have changed in practice.

- **Remove Rows:**
  - Remove rows with impossible or unrealistic combinations (e.g., journey times that do not occur, or cities that cannot be reached at certain times).
  - Clean out duplicate or inconsistent entries to maintain data quality.

By continuously refining the dataset with real observations—including bus speed or data to calculate it—the model will become more robust and better reflect actual bus operations and time-of-day effects.

## Do You Need to Change the Whole Backend?

In most cases, you do **not** need to change your entire bus-backend code. If you want to improve the model with real-world data:

- Simply update `training_dataset.csv` with new or corrected data.
- Retrain the model using `train_ad_model.py`.
- The backend code will use the updated model file for predictions.

**Only update the backend code if:**
- You want to add new features (columns) to the model.
- You want to change the prediction logic or how data is processed.

For most improvements, updating the CSV and retraining is enough.
