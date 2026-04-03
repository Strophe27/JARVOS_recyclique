"""
Session metrics collection system for monitoring and observability.
Tracks refresh token operations, session logouts, and session activity.
"""
import time
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from threading import Lock
import logging

logger = logging.getLogger(__name__)


@dataclass
class SessionMetric:
    """Represents a single session operation metric."""
    timestamp: float
    user_id: Optional[str]
    operation: str  # 'refresh_success', 'refresh_failure', 'logout_forced', 'logout_manual'
    elapsed_ms: float
    client_ip: str = "unknown"
    error_type: Optional[str] = None
    site_id: Optional[str] = None


class SessionMetricsCollector:
    """Collects and manages session metrics."""

    def __init__(self, max_history: int = 10000):
        """
        Initialize the metrics collector.

        Args:
            max_history: Maximum number of metrics to keep in memory
        """
        self.max_history = max_history
        self._metrics_history: deque = deque(maxlen=max_history)
        self._counters = defaultdict(int)
        self._lock = Lock()

    def record_refresh(
        self,
        user_id: Optional[str],
        success: bool,
        elapsed_ms: float,
        client_ip: str = "unknown",
        error_type: Optional[str] = None,
        site_id: Optional[str] = None
    ) -> None:
        """
        Record a refresh token operation.

        Args:
            user_id: User ID
            success: Whether the refresh was successful
            elapsed_ms: Time taken to process the refresh
            client_ip: Client IP address
            error_type: Type of error (if failed)
            site_id: Site ID (if available)
        """
        operation = "refresh_success" if success else "refresh_failure"
        metric = SessionMetric(
            timestamp=time.time(),
            user_id=user_id,
            operation=operation,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type=error_type,
            site_id=site_id
        )

        with self._lock:
            self._metrics_history.append(metric)

            # Update counters
            if success:
                self._counters["session_refresh_success"] += 1
            else:
                self._counters["session_refresh_failure"] += 1
                if error_type:
                    self._counters[f"session_refresh_failure_{error_type}"] += 1

    def record_logout(
        self,
        user_id: Optional[str],
        forced: bool = False,
        client_ip: str = "unknown",
        site_id: Optional[str] = None
    ) -> None:
        """
        Record a logout operation.

        Args:
            user_id: User ID
            forced: Whether the logout was forced (e.g., due to inactivity)
            client_ip: Client IP address
            site_id: Site ID (if available)
        """
        operation = "logout_forced" if forced else "logout_manual"
        metric = SessionMetric(
            timestamp=time.time(),
            user_id=user_id,
            operation=operation,
            elapsed_ms=0.0,
            client_ip=client_ip,
            site_id=site_id
        )

        with self._lock:
            self._metrics_history.append(metric)
            self._counters["session_logout_forced" if forced else "session_logout_manual"] += 1

    def get_metrics_summary(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get a summary of session metrics for the specified time period.

        Args:
            hours: Number of hours to include in the summary

        Returns:
            Dictionary containing metrics summary
        """
        cutoff_time = time.time() - (hours * 3600)

        with self._lock:
            recent_metrics = [
                m for m in self._metrics_history
                if m.timestamp >= cutoff_time
            ]

        if not recent_metrics:
            return {
                "total_operations": 0,
                "refresh_success_count": 0,
                "refresh_failure_count": 0,
                "refresh_success_rate_percent": 0,
                "logout_forced_count": 0,
                "logout_manual_count": 0,
                "active_sessions_estimate": 0,
                "latency_metrics": {},
                "error_breakdown": {},
                "ip_breakdown": {},
                "site_breakdown": {},
                "time_period_hours": hours,
                "timestamp": time.time()
            }

        # Calculate basic stats
        refresh_metrics = [m for m in recent_metrics if m.operation.startswith("refresh")]
        refresh_success_count = sum(1 for m in refresh_metrics if m.operation == "refresh_success")
        refresh_failure_count = sum(1 for m in refresh_metrics if m.operation == "refresh_failure")
        total_refreshes = refresh_success_count + refresh_failure_count
        refresh_success_rate = (refresh_success_count / total_refreshes * 100) if total_refreshes > 0 else 0

        logout_forced_count = sum(1 for m in recent_metrics if m.operation == "logout_forced")
        logout_manual_count = sum(1 for m in recent_metrics if m.operation == "logout_manual")

        # Estimate active sessions (unique user_ids with successful refresh in last hour)
        recent_hour_cutoff = time.time() - 3600
        recent_successful_refreshes = [
            m for m in recent_metrics
            if m.operation == "refresh_success" and m.timestamp >= recent_hour_cutoff
        ]
        active_sessions_estimate = len(set(m.user_id for m in recent_successful_refreshes if m.user_id))

        # Calculate latency statistics for refreshes
        refresh_latencies = [m.elapsed_ms for m in refresh_metrics if m.elapsed_ms > 0]
        latency_metrics = {
            "min_ms": min(refresh_latencies) if refresh_latencies else 0,
            "max_ms": max(refresh_latencies) if refresh_latencies else 0,
            "avg_ms": sum(refresh_latencies) / len(refresh_latencies) if refresh_latencies else 0
        }

        # Error breakdown
        error_breakdown = defaultdict(int)
        for metric in recent_metrics:
            if metric.operation == "refresh_failure" and metric.error_type:
                error_breakdown[metric.error_type] += 1

        # IP breakdown (for failures)
        ip_breakdown = defaultdict(int)
        for metric in recent_metrics:
            if metric.operation == "refresh_failure":
                ip_breakdown[metric.client_ip] += 1

        # Site breakdown
        site_breakdown = defaultdict(lambda: {"success": 0, "failure": 0})
        for metric in refresh_metrics:
            site_key = metric.site_id or "unknown"
            if metric.operation == "refresh_success":
                site_breakdown[site_key]["success"] += 1
            else:
                site_breakdown[site_key]["failure"] += 1

        return {
            "total_operations": len(recent_metrics),
            "refresh_success_count": refresh_success_count,
            "refresh_failure_count": refresh_failure_count,
            "refresh_success_rate_percent": round(refresh_success_rate, 2),
            "logout_forced_count": logout_forced_count,
            "logout_manual_count": logout_manual_count,
            "active_sessions_estimate": active_sessions_estimate,
            "latency_metrics": latency_metrics,
            "error_breakdown": dict(error_breakdown),
            "ip_breakdown": dict(ip_breakdown),
            "site_breakdown": {k: dict(v) for k, v in site_breakdown.items()},
            "time_period_hours": hours,
            "timestamp": time.time()
        }

    def get_prometheus_metrics(self) -> List[str]:
        """
        Get metrics in Prometheus format.

        Returns:
            List of metric strings in Prometheus format
        """
        metrics = []

        with self._lock:
            # Add counter metrics
            for counter_name, value in self._counters.items():
                metrics.append(f"# TYPE {counter_name} counter")
                metrics.append(f"{counter_name} {value}")

        # Add current summary metrics
        summary = self.get_metrics_summary(hours=1)  # Last hour

        metrics.extend([
            "# TYPE session_refresh_latency_ms histogram",
            f"session_refresh_latency_ms_sum {summary['latency_metrics'].get('avg_ms', 0) * (summary['refresh_success_count'] + summary['refresh_failure_count'])}",
            f"session_refresh_latency_ms_count {summary['refresh_success_count'] + summary['refresh_failure_count']}",

            "# TYPE session_refresh_success_rate gauge",
            f"session_refresh_success_rate {summary['refresh_success_rate_percent'] / 100}",

            "# TYPE active_sessions_estimate gauge",
            f"active_sessions_estimate {summary['active_sessions_estimate']}",
        ])

        return metrics

    def reset_metrics(self) -> None:
        """Reset all metrics (useful for testing)."""
        with self._lock:
            self._metrics_history.clear()
            self._counters.clear()


# Global metrics collector instance
session_metrics = SessionMetricsCollector()
















