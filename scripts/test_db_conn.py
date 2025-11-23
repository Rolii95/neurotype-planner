#!/usr/bin/env python3
import psycopg2
import sys

host = "db.kjzpbpufphrirsjlzxua.supabase.co"
port = 5432
user = "postgres"
password = "pwd:xE3rK)g.q7@2Edr"
dbname = "postgres"

try:
    conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname, connect_timeout=5)
    print("CONNECTED", conn.server_version)
    conn.close()
    sys.exit(0)
except Exception as e:
    print("ERROR", e)
    sys.exit(2)
