-- Vérifier le statut des caisses et leurs sessions
SELECT 
    cr.id as register_id,
    cr.name as register_name,
    cs.id as session_id,
    cs.status as session_status,
    cs.opened_at,
    NOW() as current_time,
    CASE 
        WHEN cs.opened_at >= NOW() THEN 'NORMAL'
        WHEN cs.opened_at < NOW() THEN 'DIFFEREE'
        ELSE 'NO_SESSION'
    END as session_type
FROM cash_registers cr
LEFT JOIN cash_sessions cs ON cs.register_id = cr.id AND cs.status = 'OPEN'
WHERE cr.is_active = true
ORDER BY cr.name, cs.opened_at DESC;
