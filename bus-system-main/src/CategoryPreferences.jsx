import React, { useState, useEffect } from "react";

export default function CategoryPreferences() {
  const [values, setValues] = useState({
    Crime: 25,
    Health: 25,
    Sports: 25,
    Techno: 25,
  });

  const [syncStatus, setSyncStatus] = useState("loading"); // "loading" | "synced" | "offline" | "error"
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 1. Listen for connection status changes and fetch on mount
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load from localStorage first (offline support)
    const localData = localStorage.getItem("category_preferences");
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (validateSum(parsed)) {
          setValues(parsed);
        }
      } catch (e) {
        console.error("Failed to parse localStorage data:", e);
      }
    }

    if (navigator.onLine) {
      loadFromCloud();
    } else {
      setSyncStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus === "offline") {
      syncToCloud(values);
    } else if (!isOnline) {
      setSyncStatus("offline");
    }
  }, [isOnline]);

  const validateSum = (data) => {
    if (!data) return false;
    const sum =
      (Number(data.Crime) || 0) +
      (Number(data.Health) || 0) +
      (Number(data.Sports) || 0) +
      (Number(data.Techno) || 0);
    return Math.abs(sum - 100) < 1;
  };

  // Fetch initial preferences from local API route (proxied to Apps Script)
  const loadFromCloud = async () => {
    setSyncStatus("loading");
    try {
      const response = await fetch("/api/category-prefs");
      if (response.ok) {
        const data = await response.json();
        
        const newVals = {
          Crime: Number(data.Crime) || 0,
          Health: Number(data.Health) || 0,
          Sports: Number(data.Sports) || 0,
          Techno: Number(data.Techno) || 0,
        };

        const totalSum = newVals.Crime + newVals.Health + newVals.Sports + newVals.Techno;
        
        if (totalSum > 0) {
          const adjusted = force100Percent(newVals);
          setValues(adjusted);
          localStorage.setItem("category_preferences", JSON.stringify(adjusted));
        }
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch (err) {
      console.error("Fetch from cloud failed:", err);
      setSyncStatus("error");
    }
  };

  // Force categories to sum up to exactly 100%
  const force100Percent = (data) => {
    const keys = ["Crime", "Health", "Sports", "Techno"];
    const currentSum = keys.reduce((s, k) => s + data[k], 0);
    if (currentSum === 100) return data;

    let res = { ...data };
    if (currentSum === 0) {
      return { Crime: 25, Health: 25, Sports: 25, Techno: 25 };
    }

    keys.forEach((k) => {
      res[k] = Math.round((data[k] / currentSum) * 100);
    });

    const roundedSum = keys.reduce((s, k) => s + res[k], 0);
    const diff = 100 - roundedSum;
    if (diff !== 0) {
      res[keys[0]] = Math.max(0, Math.min(100, res[keys[0]] + diff));
    }
    return res;
  };

  // POST changes to local API route (proxied to Apps Script)
  const syncToCloud = async (currentValues) => {
    try {
      const res = await fetch("/api/category-prefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentValues),
      });

      if (res.ok) {
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch (err) {
      console.error("Sync to cloud failed:", err);
      setSyncStatus("error");
    }
  };

  // Update value and distribute remaining balance proportionally to other categories
  const updateValue = (category, newVal) => {
    const keys = ["Crime", "Health", "Sports", "Techno"];
    const otherKeys = keys.filter((k) => k !== category);

    const clampedVal = Math.min(100, Math.max(0, Math.round(newVal)));
    const remaining = 100 - clampedVal;

    const otherSum = otherKeys.reduce((sum, k) => sum + values[k], 0);

    let updated = { ...values };
    updated[category] = clampedVal;

    if (otherSum > 0) {
      otherKeys.forEach((k) => {
        const ratio = values[k] / otherSum;
        updated[k] = Math.round(ratio * remaining);
      });
    } else {
      otherKeys.forEach((k) => {
        updated[k] = Math.round(remaining / otherKeys.length);
      });
    }

    const currentSum = keys.reduce((sum, k) => sum + updated[k], 0);
    const diff = 100 - currentSum;
    if (diff !== 0) {
      const adjustmentTarget =
        otherKeys.find((k) => {
          const v = updated[k] + diff;
          return v >= 0 && v <= 100;
        }) || otherKeys[0];
      updated[adjustmentTarget] = Math.max(
        0,
        Math.min(100, updated[adjustmentTarget] + diff)
      );
    }

    setValues(updated);
    localStorage.setItem("category_preferences", JSON.stringify(updated));

    if (isOnline) {
      syncToCloud(updated);
    } else {
      setSyncStatus("offline");
    }
  };

  const renderStatus = () => {
    switch (syncStatus) {
      case "loading":
        return <span style={{ color: "#3182ce" }}>⏳ Fetching preferences...</span>;
      case "synced":
        return <span style={{ color: "#38a169" }}>🟢 Synced to cloud</span>;
      case "offline":
        return <span style={{ color: "#dd6b20" }}>🟡 Saved locally (Offline)</span>;
      case "error":
        return <span style={{ color: "#e53e3e" }}>🔴 Sync failed (Server down)</span>;
      default:
        return null;
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Category Allocation Settings</h2>
        <div style={styles.status}>{renderStatus()}</div>
      </div>

      <p style={styles.description}>
        Adjust your interest in each news category. The total distribution must
        always equal 100%.
      </p>

      <div style={styles.slidersContainer}>
        {Object.entries(values).map(([category, value]) => (
          <div key={category} style={styles.row}>
            <div style={styles.labelContainer}>
              <span style={styles.categoryName}>{category}</span>
              <div style={styles.numberInputContainer}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) =>
                    updateValue(category, parseInt(e.target.value) || 0)
                  }
                  style={styles.numberInput}
                />
                <span style={styles.percentSymbol}>%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) =>
                updateValue(category, parseInt(e.target.value) || 0)
              }
              style={styles.slider}
            />
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <div style={styles.totalBarContainer}>
          <div style={styles.totalLabel}>
            <span>Total Allocation:</span>
            <span style={styles.totalVal}>
              {Object.values(values).reduce((a, b) => a + b, 0)}%
            </span>
          </div>
          <div style={styles.progressBar}>
            {Object.entries(values).map(([category, value], idx) => {
              const colors = ["#4299e1", "#48bb78", "#ecc94b", "#f56565"];
              return (
                <div
                  key={category}
                  style={{
                    width: `${value}%`,
                    height: "100%",
                    backgroundColor: colors[idx % colors.length],
                    transition: "width 0.2s ease",
                  }}
                  title={`${category}: ${value}%`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: "500px",
    margin: "20px auto",
    padding: "24px",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
    border: "1px solid #edf2f7",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    flexWrap: "wrap",
    gap: "8px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#2d3748",
    margin: 0,
  },
  status: {
    fontSize: "13px",
    fontWeight: "500",
  },
  description: {
    fontSize: "14px",
    color: "#718096",
    marginTop: 0,
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  slidersContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  labelContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#4a5568",
  },
  numberInputContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "2px 8px",
  },
  numberInput: {
    width: "45px",
    border: "none",
    background: "transparent",
    outline: "none",
    textAlign: "right",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2d3748",
    MozAppearance: "textfield",
  },
  percentSymbol: {
    fontSize: "14px",
    color: "#718096",
    marginLeft: "2px",
  },
  slider: {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    backgroundColor: "#e2e8f0",
    outline: "none",
    margin: "10px 0 0 0",
    cursor: "pointer",
  },
  footer: {
    marginTop: "28px",
    paddingTop: "20px",
    borderTop: "1px solid #edf2f7",
  },
  totalBarContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  totalLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
  },
  totalVal: {
    color: "#2b6cb0",
    fontWeight: "700",
  },
  progressBar: {
    display: "flex",
    width: "100%",
    height: "10px",
    borderRadius: "5px",
    overflow: "hidden",
    backgroundColor: "#edf2f7",
  },
};
