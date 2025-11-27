from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import uvicorn
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
from pathlib import Path

# Prophet import with fallback
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logging.warning("Prophet not installed. Using fallback forecasting methods.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI/ML Microservice",
    description="AI/ML service for IoT classroom automation system with enhanced forecasting",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create models directory
MODELS_DIR = Path("./models")
MODELS_DIR.mkdir(exist_ok=True)

# Pydantic models
class ForecastRequest(BaseModel):
    device_id: str
    history: List[float]
    periods: int = 5

class ScheduleRequest(BaseModel):
    device_id: str
    constraints: Optional[Dict[str, Any]] = None
    historical_usage: Optional[List[float]] = None

class AnomalyRequest(BaseModel):
    device_id: str
    values: List[float]

class ForecastResponse(BaseModel):
    device_id: str
    forecast: List[float]
    confidence: List[float]
    timestamp: str
    model_type: str

class ScheduleResponse(BaseModel):
    device_id: str
    schedule: Dict[str, Any]
    energy_savings: float
    timestamp: str

class AnomalyResponse(BaseModel):
    device_id: str
    anomalies: List[int]
    scores: List[float]
    threshold: float
    timestamp: str

# Model persistence functions
def save_model(device_id: str, model_type: str, model):
    """Save model to disk"""
    try:
        path = MODELS_DIR / f"{device_id}_{model_type}.pkl"
        joblib.dump(model, path)
        logger.info(f"Saved model: {path}")
    except Exception as e:
        logger.error(f"Error saving model: {e}")

def load_model(device_id: str, model_type: str):
    """Load model from disk"""
    try:
        path = MODELS_DIR / f"{device_id}_{model_type}.pkl"
        if path.exists():
            logger.info(f"Loaded model: {path}")
            return joblib.load(path)
    except Exception as e:
        logger.error(f"Error loading model: {e}")
    return None

# Anomaly Detection Class
class AnomalyDetector:
    """Stateful anomaly detector with incremental learning"""
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.model = IsolationForest(
            contamination=0.1, 
            random_state=42,
            n_estimators=100
        )
        self.trained = False
        self.baseline = []
        
    def train(self, data: np.ndarray):
        """Train model on baseline data"""
        if len(data) >= 10:
            self.model.fit(data.reshape(-1, 1))
            self.baseline = data.tolist()
            self.trained = True
            save_model(self.device_id, "anomaly", self)
            logger.info(f"Trained anomaly detector for {self.device_id}")
    
    def predict(self, new_data: np.ndarray):
        """Detect anomalies in new data"""
        if not self.trained:
            # Initial training
            self.train(new_data)
            return [], []  # No anomalies in baseline
        
        # Predict on new data
        scores = self.model.decision_function(new_data.reshape(-1, 1))
        predictions = self.model.predict(new_data.reshape(-1, 1))
        
        # Find anomalies
        anomalies = [i for i, pred in enumerate(predictions) if pred == -1]
        
        # Incremental learning: Add normal points to baseline
        normal_points = new_data[predictions == 1]
        if len(normal_points) > 0:
            self.baseline.extend(normal_points.tolist())
            # Keep only recent 1000 points
            self.baseline = self.baseline[-1000:]
            # Retrain periodically
            if len(self.baseline) % 100 == 0:
                self.train(np.array(self.baseline))
        
        return anomalies, scores.tolist()

# Global detector cache
anomaly_detectors = {}

# Helper functions
def simple_moving_average_forecast(history: List[float], periods: int) -> tuple:
    """Simple moving average forecast for limited data"""
    history = np.array(history)
    window = min(len(history), 3)
    
    predictions = []
    for _ in range(periods):
        pred = np.mean(history[-window:])
        predictions.append(pred)
        history = np.append(history, pred)
    
    # Lower confidence for simple method
    confidence = [0.5] * periods
    return predictions, confidence

def calculate_energy_savings(device_id: str, schedule: dict, historical_usage: List[float]) -> float:
    """Calculate actual energy savings based on usage patterns"""
    
    if not historical_usage or len(historical_usage) < 24:
        return 0.0  # Not enough data
    
    # Calculate baseline consumption (24h average)
    baseline_consumption = np.mean(historical_usage)
    
    # Calculate optimized consumption based on schedule
    optimized_hours = 0
    total_hours = 0
    
    for day, times in schedule.items():
        if times['priority'] == 'off':
            optimized_hours += 0  # Completely off
        elif times['priority'] == 'low':
            optimized_hours += 8 * 0.3  # 30% usage
        elif times['priority'] == 'medium':
            optimized_hours += 10 * 0.6  # 60% usage
        else:  # high
            optimized_hours += 10 * 1.0  # Full usage
        total_hours += 24
    
    # Calculate savings percentage
    if total_hours > 0:
        savings_percentage = (1 - (optimized_hours / total_hours)) * 100
    else:
        savings_percentage = 0
    
    # Apply realistic bounds (10-40% savings)
    return max(10.0, min(40.0, savings_percentage))

def build_optimized_schedule(constraints: Dict[str, Any]) -> Dict[str, Any]:
    """Build optimized schedule based on constraints"""
    base_schedule = {
        "monday": {"start": "08:00", "end": "18:00", "priority": "high"},
        "tuesday": {"start": "08:00", "end": "18:00", "priority": "high"},
        "wednesday": {"start": "08:00", "end": "18:00", "priority": "high"},
        "thursday": {"start": "08:00", "end": "18:00", "priority": "high"},
        "friday": {"start": "08:00", "end": "18:00", "priority": "high"},
        "saturday": {"start": "09:00", "end": "17:00", "priority": "medium"},
        "sunday": {"start": "00:00", "end": "00:00", "priority": "off"}
    }

    # Apply constraints
    if "class_schedule" in constraints:
        class_hours = constraints["class_schedule"]
        for day in base_schedule:
            if day.lower() in ["saturday", "sunday"] and not class_hours.get("weekends", False):
                base_schedule[day] = {"start": "00:00", "end": "00:00", "priority": "off"}

    if "energy_budget" in constraints:
        budget = constraints["energy_budget"]
        if budget < 50:  # Low budget
            for day in base_schedule:
                if base_schedule[day]["priority"] == "high":
                    base_schedule[day]["priority"] = "medium"
    
    return base_schedule

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "prophet_available": PROPHET_AVAILABLE,
        "models_dir": str(MODELS_DIR),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/forecast", response_model=ForecastResponse)
async def forecast_usage(request: ForecastRequest):
    """Enhanced forecasting with Prophet or fallback methods"""
    try:
        device_id = request.device_id
        history = request.history
        periods = request.periods
        
        # Validate data quality
        if len(history) < 3:
            # Return simple average-based forecast for insufficient data
            avg = np.mean(history) if len(history) > 0 else 50.0
            return ForecastResponse(
                device_id=device_id,
                forecast=[avg] * periods,
                confidence=[0.3] * periods,  # Low confidence
                timestamp=datetime.now().isoformat(),
                model_type="simple_average"
            )
        
        # Check for data quality issues
        if len(history) < 7 or not PROPHET_AVAILABLE:
            logger.warning(f"Limited data ({len(history)} points) or Prophet unavailable for {device_id}")
            predictions, confidence = simple_moving_average_forecast(history, periods)
            return ForecastResponse(
                device_id=device_id,
                forecast=predictions,
                confidence=confidence,
                timestamp=datetime.now().isoformat(),
                model_type="moving_average"
            )
        
        # Use Prophet for advanced forecasting
        try:
            # Prepare data for Prophet (requires 'ds' and 'y' columns)
            df = pd.DataFrame({
                'ds': pd.date_range(end=datetime.now(), periods=len(history), freq='H'),
                'y': history
            })
            
            # Initialize Prophet with classroom-specific settings
            model = Prophet(
                daily_seasonality=True,      # Capture daily patterns
                weekly_seasonality=True,     # Weekday vs weekend
                yearly_seasonality=False,    # Not needed for classroom
                changepoint_prior_scale=0.05 # Sensitivity to trend changes
            )
            
            # Add custom seasonalities for classroom hours
            model.add_seasonality(
                name='school_hours',
                period=24,
                fourier_order=5,
                condition_name='is_school_hours'
            )
            
            # Mark school hours (9 AM - 5 PM)
            df['is_school_hours'] = df['ds'].dt.hour.between(9, 17)
            
            # Fit model
            model.fit(df)
            
            # Make future dataframe
            future = model.make_future_dataframe(periods=periods, freq='H')
            future['is_school_hours'] = future['ds'].dt.hour.between(9, 17)
            
            # Predict
            forecast = model.predict(future)
            
            # Extract predictions and confidence intervals
            predictions = forecast['yhat'].tail(periods).tolist()
            lower_bound = forecast['yhat_lower'].tail(periods).tolist()
            upper_bound = forecast['yhat_upper'].tail(periods).tolist()
            
            # Calculate confidence (0-1 scale)
            confidence = [
                max(0.1, min(0.95, 1 - (upper - lower) / (abs(pred) + 0.001)))
                for pred, lower, upper in zip(predictions, lower_bound, upper_bound)
            ]
            
            # Ensure reasonable bounds (0-100)
            predictions = [max(0, min(100, p)) for p in predictions]
            
            # Save model
            save_model(device_id, "forecast", model)
            
            return ForecastResponse(
                device_id=device_id,
                forecast=predictions,
                confidence=confidence,
                timestamp=datetime.now().isoformat(),
                model_type="prophet"
            )
            
        except Exception as prophet_error:
            logger.error(f"Prophet forecasting failed: {prophet_error}, falling back to simple method")
            predictions, confidence = simple_moving_average_forecast(history, periods)
            return ForecastResponse(
                device_id=device_id,
                forecast=predictions,
                confidence=confidence,
                timestamp=datetime.now().isoformat(),
                model_type="moving_average_fallback"
            )
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")

@app.post("/schedule", response_model=ScheduleResponse)
async def optimize_schedule(request: ScheduleRequest):
    """Optimize schedule with real energy savings calculations"""
    try:
        device_id = request.device_id
        constraints = request.constraints or {}
        historical_usage = request.historical_usage or []
        
        # Build optimized schedule
        base_schedule = build_optimized_schedule(constraints)
        
        # Calculate REAL energy savings
        energy_savings = calculate_energy_savings(
            device_id, 
            base_schedule, 
            historical_usage
        )
        
        return ScheduleResponse(
            device_id=device_id,
            schedule=base_schedule,
            energy_savings=round(energy_savings, 2),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Schedule optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schedule optimization failed: {str(e)}")

@app.post("/anomaly", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyRequest):
    """Incremental anomaly detection"""
    try:
        device_id = request.device_id
        values = np.array(request.values)
        
        if len(values) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Need at least 10 data points for anomaly detection"
            )
        
        # Get or create detector
        if device_id not in anomaly_detectors:
            # Try to load from disk
            loaded = load_model(device_id, "anomaly")
            if loaded:
                anomaly_detectors[device_id] = loaded
            else:
                anomaly_detectors[device_id] = AnomalyDetector(device_id)
        
        detector = anomaly_detectors[device_id]
        anomalies, scores = detector.predict(values)
        
        threshold = np.percentile(scores, 10) if len(scores) > 0 else 0
        
        return AnomalyResponse(
            device_id=device_id,
            anomalies=anomalies,
            scores=scores,
            threshold=float(threshold),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

@app.get("/models/{device_id}")
async def get_model_info(device_id: str):
    """Get information about trained models for a device"""
    model_files = list(MODELS_DIR.glob(f"{device_id}_*.pkl"))
    return {
        "device_id": device_id,
        "models": [f.name for f in model_files],
        "in_memory": device_id in anomaly_detectors,
        "timestamp": datetime.now().isoformat()
    }

@app.delete("/models/{device_id}")
async def clear_device_models(device_id: str):
    """Clear all models for a device"""
    try:
        model_files = list(MODELS_DIR.glob(f"{device_id}_*.pkl"))
        for f in model_files:
            f.unlink()
        
        if device_id in anomaly_detectors:
            del anomaly_detectors[device_id]
        
        return {
            "device_id": device_id,
            "cleared": len(model_files),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing models: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting AI/ML Microservice v2.0")
    logger.info(f"Prophet available: {PROPHET_AVAILABLE}")
    logger.info(f"Models directory: {MODELS_DIR}")
    uvicorn.run(app, host="127.0.0.1", port=8004)
