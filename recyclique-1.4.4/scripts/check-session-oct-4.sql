-- Vérifier la session du 4 octobre 2025
SELECT 
    id, 
    opened_at, 
    closed_at,
    status, 
    register_id,
    operator_id,
    initial_amount,
    current_amount,
    total_sales, 
    total_items,
    variance,
    variance_comment,
    (SELECT COUNT(*) FROM sales WHERE cash_session_id = cash_sessions.id) as sales_count,
    (SELECT COUNT(*) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.cash_session_id = cash_sessions.id) as items_count
FROM cash_sessions 
WHERE opened_at >= '2025-10-04 00:00:00'::timestamp
  AND opened_at < '2025-10-05 00:00:00'::timestamp
ORDER BY opened_at DESC;
