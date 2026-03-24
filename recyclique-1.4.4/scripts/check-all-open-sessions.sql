-- Vérifier toutes les sessions ouvertes (normales et différées)
SELECT 
    id, 
    opened_at, 
    status, 
    register_id,
    CASE 
        WHEN opened_at < NOW() THEN 'DIFFÉRÉE'
        ELSE 'NORMALE'
    END as type_session,
    total_sales, 
    total_items
FROM cash_sessions 
WHERE status = 'OPEN'
ORDER BY opened_at DESC;
