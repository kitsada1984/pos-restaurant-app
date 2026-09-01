SELECT 'User' as table_name, count(*) as count FROM "User"
UNION ALL SELECT 'Store', count(*) FROM "Store"
UNION ALL SELECT 'Table', count(*) FROM "Table"
UNION ALL SELECT 'MenuItem', count(*) FROM "MenuItem"
UNION ALL SELECT 'Plan', count(*) FROM "Plan";
