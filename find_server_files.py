import subprocess

cmd = [
    "ssh", "ubuntu@37.32.36.252",
    "find /opt/vml -name '*.csv' -o -name '*.md' -o -name '*.sqlite3'"
]
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
print(res.stderr)
