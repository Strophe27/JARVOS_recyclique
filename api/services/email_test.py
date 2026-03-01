# Story 17.7, 17.8 — envoi email de test non-stub et persistance logs.

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from api.models import EmailLog
from api.services import admin_settings


def log_email(
    db: Session,
    recipient: str,
    subject: str,
    status: str,
    event_type: str | None = None,
    error_message: str | None = None,
) -> None:
    """Persiste un log d'envoi email (Story 17.8)."""
    entry = EmailLog(
        recipient=recipient,
        subject=subject,
        status=status,
        event_type=event_type,
        error_message=error_message,
    )
    db.add(entry)
    db.commit()


def send_test_email(db: Session) -> dict:
    """
    Envoi un email de test selon la config admin (email).
    Retourne {"message": "...", "configured": bool}.
    Valide smtp_host non vide.
    """
    settings = admin_settings.get_settings(db)
    email_config = settings.get("email") or {}
    smtp_host = (email_config.get("smtp_host") or "").strip()
    if not smtp_host:
        return {"message": "Configuration email incomplète", "configured": False}
    smtp_port = email_config.get("smtp_port") or 587
    smtp_user = email_config.get("smtp_user") or ""
    smtp_password = email_config.get("smtp_password") or ""
    from_email = (email_config.get("from_email") or smtp_user or "noreply@recyclique.local").strip()
    subject = "[RecyClique] Test notifications"

    try:
        with smtplib.SMTP(smtp_host, int(smtp_port), timeout=10) as server:
            if smtp_user and smtp_password:
                server.starttls()
                server.login(smtp_user, smtp_password)
            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = from_email
            msg["Subject"] = subject
            msg.attach(MIMEText("Email de test depuis RecyClique (supervision admin).", "plain"))
            server.send_message(msg)
        log_email(db, from_email, subject, "sent", event_type="test", error_message=None)
        return {"message": "Email de test envoyé", "configured": True}
    except smtplib.SMTPAuthenticationError as e:
        err_msg = type(e).__name__
        log_email(db, from_email, subject, "failed", event_type="test", error_message=err_msg)
        return {
            "message": f"Erreur authentification SMTP: {err_msg}",
            "configured": True,
        }
    except smtplib.SMTPException as e:
        err_msg = type(e).__name__
        log_email(db, from_email, subject, "failed", event_type="test", error_message=err_msg)
        return {
            "message": f"Erreur SMTP: {err_msg}",
            "configured": True,
        }
    except (ConnectionError, OSError, ValueError) as e:
        err_msg = type(e).__name__
        log_email(db, from_email, subject, "failed", event_type="test", error_message=err_msg)
        return {
            "message": f"Erreur connexion: {err_msg}",
            "configured": True,
        }
