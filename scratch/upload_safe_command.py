import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

sftp = client.open_sftp()
local_path = r"e:\Codes\Virtual Master League\backend\teams\management\commands\sync_pes_transfer_status.py"
remote_path = "/opt/vml/backend/teams/management/commands/sync_pes_transfer_status.py"
sftp.put(local_path, remote_path)
print(f"Uploaded {local_path} to {remote_path}")
sftp.close()

# Restart/check container
cmd = "cd /opt/vml && docker compose restart backend"
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
