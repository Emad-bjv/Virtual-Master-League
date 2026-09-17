import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=30)

cmd = "cd /opt/vml && docker compose exec -T backend python manage.py dumpdata teams transfers --natural-foreign --natural-primary --indent 2 > /tmp/vml_data.json && ls -lh /tmp/vml_data.json"
stdin, stdout, stderr = client.exec_command(cmd)
print("OUT:", stdout.read().decode('utf-8', errors='replace'))
print("ERR:", stderr.read().decode('utf-8', errors='replace'))

# Download the file via SFTP
sftp = client.open_sftp()
sftp.get('/tmp/vml_data.json', 'scratch/prod_teams_transfers.json')
sftp.close()
client.close()
print("Downloaded to scratch/prod_teams_transfers.json successfully!")
