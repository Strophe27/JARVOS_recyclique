"""
Tests for session metrics system (B42-P4).

Tests the SessionMetricsCollector and the /v1/admin/sessions/metrics endpoint.
"""
import pytest
import time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from recyclic_api.utils.session_metrics import SessionMetricsCollector, SessionMetric


@pytest.mark.no_db
class TestSessionMetricsCollector:
    """Test cases for SessionMetricsCollector class."""

    def setup_method(self):
        """Set up a fresh metrics collector for each test."""
        self.collector = SessionMetricsCollector(max_history=100)

    def test_record_successful_refresh(self):
        """Test recording a successful refresh token operation."""
        self.collector.record_refresh(
            user_id="user-123",
            success=True,
            elapsed_ms=45.5,
            client_ip="192.168.1.1",
            site_id="site-1"
        )

        # Check that the metric was recorded
        assert len(self.collector._metrics_history) == 1
        metric = self.collector._metrics_history[0]
        assert metric.user_id == "user-123"
        assert metric.operation == "refresh_success"
        assert metric.elapsed_ms == 45.5
        assert metric.client_ip == "192.168.1.1"
        assert metric.site_id == "site-1"

        # Check counters
        assert self.collector._counters["session_refresh_success"] == 1

    def test_record_failed_refresh(self):
        """Test recording a failed refresh token operation."""
        self.collector.record_refresh(
            user_id="user-123",
            success=False,
            elapsed_ms=20.0,
            client_ip="192.168.1.1",
            error_type="invalid_token"
        )

        # Check that the metric was recorded
        assert len(self.collector._metrics_history) == 1
        metric = self.collector._metrics_history[0]
        assert metric.operation == "refresh_failure"
        assert metric.error_type == "invalid_token"

        # Check counters
        assert self.collector._counters["session_refresh_failure"] == 1
        assert self.collector._counters["session_refresh_failure_invalid_token"] == 1

    def test_record_logout_forced(self):
        """Test recording a forced logout."""
        self.collector.record_logout(
            user_id="user-123",
            forced=True,
            client_ip="192.168.1.1"
        )

        # Check that the metric was recorded
        assert len(self.collector._metrics_history) == 1
        metric = self.collector._metrics_history[0]
        assert metric.operation == "logout_forced"
        assert metric.user_id == "user-123"

        # Check counters
        assert self.collector._counters["session_logout_forced"] == 1

    def test_record_logout_manual(self):
        """Test recording a manual logout."""
        self.collector.record_logout(
            user_id="user-123",
            forced=False,
            client_ip="192.168.1.1"
        )

        # Check that the metric was recorded
        assert len(self.collector._metrics_history) == 1
        metric = self.collector._metrics_history[0]
        assert metric.operation == "logout_manual"

        # Check counters
        assert self.collector._counters["session_logout_manual"] == 1

    def test_get_metrics_summary(self):
        """Test getting metrics summary."""
        # Use a fresh collector to avoid interference from other tests
        collector = SessionMetricsCollector(max_history=100)
        
        # Record some metrics
        for i in range(10):
            collector.record_refresh(
                user_id=f"user-{i}",
                success=True,
                elapsed_ms=50.0 + i,
                client_ip="192.168.1.1"
            )

        for i in range(2):
            collector.record_refresh(
                user_id=f"user-{i}",
                success=False,
                elapsed_ms=20.0,
                client_ip="192.168.1.2",
                error_type="invalid_token"
            )

        collector.record_logout(user_id="user-1", forced=True)
        collector.record_logout(user_id="user-2", forced=False)

        # Get summary
        summary = collector.get_metrics_summary(hours=24)

        # Verify summary
        # Note: total_operations includes all operations (refresh + logout)
        # 10 refresh success + 2 refresh failure + 1 logout forced + 1 logout manual = 14
        assert summary["total_operations"] == 14
        assert summary["refresh_success_count"] == 10
        assert summary["refresh_failure_count"] == 2
        assert summary["refresh_success_rate_percent"] == pytest.approx(83.33, abs=0.01)
        assert summary["logout_forced_count"] == 1
        assert summary["logout_manual_count"] == 1
        assert summary["active_sessions_estimate"] > 0
        assert "latency_metrics" in summary
        assert "error_breakdown" in summary
        assert "ip_breakdown" in summary

    def test_get_prometheus_metrics(self):
        """Test getting Prometheus-formatted metrics."""
        # Record some metrics
        self.collector.record_refresh(user_id="user-1", success=True, elapsed_ms=50.0)
        self.collector.record_refresh(user_id="user-2", success=False, elapsed_ms=20.0, error_type="invalid_token")

        # Get Prometheus metrics
        prometheus_metrics = self.collector.get_prometheus_metrics()

        # Verify format
        assert isinstance(prometheus_metrics, list)
        assert len(prometheus_metrics) > 0

        # Check for counter metrics
        metrics_str = "\n".join(prometheus_metrics)
        assert "session_refresh_success" in metrics_str
        assert "session_refresh_failure" in metrics_str
        assert "# TYPE" in metrics_str

    def test_reset_metrics(self):
        """Test resetting all metrics."""
        # Record some metrics
        self.collector.record_refresh(user_id="user-1", success=True, elapsed_ms=50.0)
        assert len(self.collector._metrics_history) == 1

        # Reset
        self.collector.reset_metrics()

        # Verify reset
        assert len(self.collector._metrics_history) == 0
        assert len(self.collector._counters) == 0


class TestSessionMetricsEndpoint:
    """Test cases for the /v1/admin/sessions/metrics endpoint."""
    # These tests need DB for admin_client fixture

    def test_get_session_metrics_endpoint(self, admin_client: TestClient):
        """Test getting session metrics via API endpoint."""
        # First, record some metrics by triggering refresh operations
        # (In a real scenario, these would be recorded during actual refresh operations)
        from recyclic_api.utils.session_metrics import session_metrics
        
        session_metrics.record_refresh(user_id="user-1", success=True, elapsed_ms=50.0)
        session_metrics.record_refresh(user_id="user-2", success=False, elapsed_ms=20.0, error_type="invalid_token")

        # Call the endpoint
        response = admin_client.get("/v1/admin/sessions/metrics?hours=24")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "metrics" in data
        
        metrics = data["metrics"]
        assert "refresh_success_count" in metrics
        assert "refresh_failure_count" in metrics
        assert "refresh_success_rate_percent" in metrics
        assert "active_sessions_estimate" in metrics
        assert "latency_metrics" in metrics
        assert "error_breakdown" in metrics
        assert "ip_breakdown" in metrics

    def test_get_session_metrics_with_hours_param(self, admin_client: TestClient):
        """Test getting session metrics with custom hours parameter."""
        from recyclic_api.utils.session_metrics import session_metrics
        
        session_metrics.record_refresh(user_id="user-1", success=True, elapsed_ms=50.0)

        # Call with custom hours
        response = admin_client.get("/v1/admin/sessions/metrics?hours=1")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["metrics"]["time_period_hours"] == 1

    def test_get_session_metrics_requires_admin(self, client: TestClient):
        """Test that session metrics endpoint requires admin role."""
        response = client.get("/v1/admin/sessions/metrics")

        # Should return 401 (not authenticated) or 403 (not admin)
        assert response.status_code in [401, 403]

    def test_get_prometheus_metrics_endpoint(self, admin_client: TestClient):
        """Test getting Prometheus-formatted metrics."""
        from recyclic_api.utils.session_metrics import session_metrics
        
        session_metrics.record_refresh(user_id="user-1", success=True, elapsed_ms=50.0)

        # Call the Prometheus endpoint
        response = admin_client.get("/v1/monitoring/sessions/metrics/prometheus")

        # Debug: print response if error
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            print(f"Response headers: {response.headers}")

        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "text/plain" in response.headers.get("content-type", "")
        
        content = response.text
        assert "session_refresh_success" in content
        assert "# TYPE" in content


@pytest.mark.no_db
class TestSessionMetricsAlerting:
    """Test cases for alerting on high failure rates (B42-P4 AC4)."""

    def test_failure_rate_threshold_detection(self):
        """Test detecting failure rate above threshold (5% over 15 min)."""
        collector = SessionMetricsCollector(max_history=1000)
        
        # Simulate 100 refresh attempts with 6 failures (6% failure rate)
        for i in range(94):
            collector.record_refresh(
                user_id=f"user-{i}",
                success=True,
                elapsed_ms=50.0
            )
        
        for i in range(6):
            collector.record_refresh(
                user_id=f"user-fail-{i}",
                success=False,
                elapsed_ms=20.0,
                error_type="invalid_token"
            )

        # Get summary for last hour (simulating 15 min window)
        summary = collector.get_metrics_summary(hours=1)
        
        failure_rate = summary["refresh_failure_count"] / (
            summary["refresh_success_count"] + summary["refresh_failure_count"]
        ) * 100

        # Verify failure rate is above 5% threshold
        assert failure_rate > 5.0
        assert summary["refresh_failure_count"] == 6
        assert summary["refresh_success_count"] == 94

    def test_prometheus_metrics_for_alerting(self):
        """Test that Prometheus metrics can be used for alerting."""
        collector = SessionMetricsCollector(max_history=100)
        
        # Record metrics
        for i in range(10):
            collector.record_refresh(user_id=f"user-{i}", success=True, elapsed_ms=50.0)
        for i in range(1):
            collector.record_refresh(user_id="user-fail", success=False, elapsed_ms=20.0, error_type="invalid_token")

        # Get Prometheus metrics
        prometheus_metrics = collector.get_prometheus_metrics()
        metrics_str = "\n".join(prometheus_metrics)

        # Verify metrics that can be used for alerting
        assert "session_refresh_success_rate" in metrics_str
        assert "session_refresh_failure" in metrics_str
        
        # In a real Grafana alert, you would query:
        # rate(session_refresh_failure[15m]) / rate(session_refresh_success[15m] + session_refresh_failure[15m]) > 0.05

