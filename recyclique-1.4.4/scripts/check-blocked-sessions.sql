-- Vérifier les sessions différées bloquées
SELECT 
    id, 
    opened_at, 
    status, 
    register_id, 
    total_sales, 
    total_items,
    (SELECT COUNT(*) FROM sales WHERE cash_session_id = cash_sessions.id) as sales_count,
    (SELECT COUNT(*) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.cash_session_id = cash_sessions.id) as items_count
FROM cash_sessions 
WHERE status = 'OPEN' 
  AND opened_at < NOW()
ORDER BY opened_at;
