# Story 17.7 — envoi email de test non-stub.

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from api.services import admin_settings


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
        return {"message": "Configuration email incomplete", "configured": False}
    smtp_port = email_config.get("smtp_port") or 587
    smtp_user = email_config.get("smtp_user") or ""
    smtp_password = email_config.get("smtp_password") or ""
    from_email = (email_config.get("from_email") or smtp_user or "noreply@recyclique.local").strip()

    try:
        with smtplib.SMTP(smtp_host, int(smtp_port), timeout=10) as server:
            if smtp_user and smtp_password:
                server.starttls()
                server.login(smtp_user, smtp_password)
            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = from_email
            msg["Subject"] = "[RecyClique] Test notifications"
            msg.attach(MIMEText("Email de test depuis RecyClique (supervision admin).", "plain"))
            server.send_message(msg)
        return {"message": "Email de test envoye", "configured": True}
    except smtplib.SMTPAuthenticationError as e:
        return {
            "message": f"Erreur authentification SMTP: {type(e).__name__}",
            "configured": True,
        }
    except smtplib.SMTPException as e:
        return {
            "message": f"Erreur SMTP: {type(e).__name__}",
            "configured": True,
        }
    except (ConnectionError, OSError, ValueError) as e:
        return {
            "message": f"Erreur connexion: {type(e).__name__}",
            "configured": True,
        }
