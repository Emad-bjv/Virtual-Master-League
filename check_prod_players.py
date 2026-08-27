import subprocess

cmd = [
    "ssh", "ubuntu@37.32.36.252",
    "cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"from teams.models import Player; print('Prod Players:', Player.objects.count())\""
]
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
print(res.stderr)
