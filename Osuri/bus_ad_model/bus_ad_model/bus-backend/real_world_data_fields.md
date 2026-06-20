# Real-World Data Collection for Bus Model

To improve the accuracy of the bus journey prediction model, collect the following input data from bus conductors for each journey:

## Required Data Fields


1. **Journey Start Time**
   - The exact time the bus departs from the origin city (e.g., Colombo or Anuradhapura).

2. **City Name**
   - The city where the bus is at a specific time slot (e.g., Kurunegala, Dambulla, Kekirawa, etc.).

3. **Arrival Time at City**
   - The actual time the bus reaches each city.

4. **Direction**
   - 0 = Forward (Colombo → Anuradhapura)
   - 1 = Reverse (Anuradhapura → Colombo)

5. **Time of Day**
   - 0 = Morning
   - 1 = Midday
   - 2 = Evening
   - 3 = Night
   - (Can be derived from arrival time if not directly recorded)

6. **Bus Speed**
   - Record the average speed between cities if possible, or collect enough data (distance and time) to calculate it later.


## Example Data Entry
| journey_start_time | city_name   | arrival_time | direction | time_of_day | bus_speed |
|-------------------|------------|--------------|-----------|-------------|-----------|
| 06:00             | Kurunegala | 07:20        | 0         | 0           | 45 km/h   |
| 06:00             | Dambulla   | 08:45        | 0         | 1           | 50 km/h   |
| 15:00             | Kekirawa   | 17:10        | 1         | 2           | 38 km/h   |


## Notes
- Record each city stop for every journey.
- Ensure times are as accurate as possible.
- Collect data for both directions and all time slots.
- More data points will improve model reliability.
