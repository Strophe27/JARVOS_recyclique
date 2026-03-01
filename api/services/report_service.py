# Service generation rapports caisse — Story 17.9.
# CSV by-session avec sections SESSION, ITEMS, PAYMENTS.

import csv
import io
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from api.models import CashSession, Sale, SaleItem, PaymentTransaction


def _fmt_dt(dt: datetime | None) -> str:
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def _fmt_num(v: int | None) -> str:
    if v is None:
        return ""
    return str(v)


def _fmt_float(v: float | None) -> str:
    if v is None:
        return ""
    return str(v)


def _escape_csv(val: str | None) -> str:
    if val is None or val == "":
        return ""
    s = str(val)
    if "," in s or '"' in s or "\n" in s:
        return '"' + s.replace('"', '""') + '"'
    return s


def generate_session_report_csv(db: Session, session_id: UUID) -> str | None:
    """
    Genere le CSV d'un rapport by-session.
    Retourne None si session non trouvee ou non fermee.
    """
    stmt = (
        select(CashSession)
        .options(
            joinedload(CashSession.site),
            joinedload(CashSession.register),
            joinedload(CashSession.operator),
            selectinload(CashSession.sales).selectinload(Sale.items).joinedload(SaleItem.category),
            selectinload(CashSession.sales).selectinload(Sale.payment_transactions),
        )
        .where(CashSession.id == session_id)
    )
    session = db.execute(stmt).scalars().unique().one_or_none()
    if session is None or session.status != "closed":
        return None

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=",", lineterminator="\n")

    site_name = session.site.name if session.site else ""
    register_name = session.register.name if session.register else ""
    operator_name = session.operator.username if session.operator else ""

    # Section SESSION
    w.writerow([
        "session_id", "opened_at", "closed_at", "site_name", "register_name", "operator_name",
        "initial_amount", "closing_amount", "actual_amount", "variance", "total_sales", "total_items",
    ])
    w.writerow([
        str(session.id),
        _fmt_dt(session.opened_at),
        _fmt_dt(session.closed_at),
        _escape_csv(site_name),
        _escape_csv(register_name),
        _escape_csv(operator_name),
        _fmt_num(session.initial_amount),
        _fmt_num(session.closing_amount),
        _fmt_num(session.actual_amount),
        _fmt_num(session.variance),
        _fmt_num(session.total_sales),
        _fmt_num(session.total_items),
    ])
    w.writerow([])

    # Section ITEMS
    w.writerow(["sale_id", "sale_date", "category_name", "quantity", "unit_price", "total_price", "weight"])
    for sale in session.sales:
        sale_date = _fmt_dt(sale.sale_date or sale.created_at)
        for item in sale.items:
            cat_name = item.category.name if item.category else ""
            w.writerow([
                str(sale.id),
                sale_date,
                _escape_csv(cat_name),
                _fmt_num(item.quantity),
                _fmt_num(item.unit_price),
                _fmt_num(item.total_price),
                _fmt_float(item.weight),
            ])
    w.writerow([])

    # Section PAYMENTS
    w.writerow(["sale_id", "payment_method", "amount"])
    for sale in session.sales:
        for pt in sale.payment_transactions:
            w.writerow([
                str(sale.id),
                _escape_csv(pt.payment_method),
                _fmt_num(pt.amount),
            ])

    return buf.getvalue()
