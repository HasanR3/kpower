import sqlite3

con = sqlite3.connect(r"C:\Users\Hasan\AppData\Local\KPower\data\kpower.db")
row = con.execute("SELECT count(*), max(dateTime), max(duration), max(count) FROM log_self_test").fetchone()
print(row)
con.close()
