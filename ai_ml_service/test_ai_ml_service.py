import os
import asyncio
import numpy as np
import pytest
from datetime import datetime

from main import (
    health_check,
    simple_moving_average_forecast,
    ForecastRequest,
    forecast_usage,
    ScheduleRequest,
    optimize_schedule,
    build_optimized_schedule,
    calculate_energy_savings,
    AnomalyDetector,
    detect_anomalies,
    AnomalyRequest,
    save_model,
    load_model,
    MODELS_DIR,
)


@pytest.mark.asyncio
async def test_health_check_keys_present():
    res = await health_check()
    assert isinstance(res, dict)
    # Key booleans / strings that must exist
    assert 'status' in res
    assert 'timestamp' in res
    assert 'models_dir' in res


def test_simple_moving_average_forecast_basic():
    history = [10.0, 20.0, 30.0]
    preds, conf = simple_moving_average_forecast(history, periods=2)
    assert isinstance(preds, list) and len(preds) == 2
    assert isinstance(conf, list) and len(conf) == 2
    # Predictions should be numbers
    assert all(isinstance(p, (int, float)) for p in preds)


@pytest.mark.asyncio
async def test_forecast_requires_min_points():
    req = ForecastRequest(device_id='dev1', history=[1.0, 2.0], periods=3)
    with pytest.raises(Exception):
        # Should raise HTTPException with 400
        await forecast_usage(req)


@pytest.mark.asyncio
async def test_forecast_moving_average_selected():
    # Use limited data (<7) so moving average path is taken
    req = ForecastRequest(device_id='dev2', history=[1,2,3,4,5], periods=2)
    res = await forecast_usage(req)
    assert res.model_type in ('moving_average', 'moving_average_fallback')
    assert res.device_id == 'dev2'


@pytest.mark.asyncio
async def test_optimize_schedule_insufficient_history():
    req = ScheduleRequest(device_id='sched1', constraints={}, historical_usage=[1]*10)
    res = await optimize_schedule(req)
    # Not enough historical usage -> energy_savings should be 0.0
    assert res.energy_savings == 0.0


def test_build_optimized_schedule_weekends_off():
    constraints = {"class_schedule": {"weekends": False}}
    sched = build_optimized_schedule(constraints)
    assert sched['saturday']['priority'] == 'off'
    assert sched['sunday']['priority'] == 'off'


def test_calculate_energy_savings_bounds():
    # Create 24+ hourly historical usage values
    hist = list(np.random.uniform(10, 50, size=48))
    # Create a schedule that lowers priority to simulate savings
    schedule = {
        'monday': {'priority': 'medium'},
        'tuesday': {'priority': 'medium'},
        'wednesday': {'priority': 'medium'},
        'thursday': {'priority': 'medium'},
        'friday': {'priority': 'medium'},
        'saturday': {'priority': 'off'},
        'sunday': {'priority': 'off'},
    }
    savings = calculate_energy_savings('dev3', schedule, hist)
    assert isinstance(savings, float)
    # Function enforces bounds 10.0 - 40.0
    assert 10.0 <= savings <= 40.0


def test_anomaly_detector_initial_training_and_predict():
    data = np.array([1.0] * 10)
    det = AnomalyDetector('adev1')
    anomalies, scores = det.predict(data)
    # On first call, detector trains and returns empty anomalies and scores list
    assert anomalies == []
    assert isinstance(scores, list) and len(scores) == len(data)


@pytest.mark.asyncio
async def test_detect_anomalies_endpoint_raises_for_small():
    req = AnomalyRequest(device_id='adev2', values=[1,2,3,4,5])
    with pytest.raises(Exception):
        await detect_anomalies(req)


def test_save_and_load_model_roundtrip(tmp_path):
    # Ensure models directory exists and is isolated for test
    device_id = 'roundtrip1'
    det = AnomalyDetector(device_id)
    save_model(device_id, 'anomaly', det)
    loaded = load_model(device_id, 'anomaly')
    assert loaded is not None
    # cleanup
    path = MODELS_DIR / f"{device_id}_anomaly.pkl"
    if path.exists():
        path.unlink()
