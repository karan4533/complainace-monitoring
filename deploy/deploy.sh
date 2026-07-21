#!/bin/bash
##############################################################################
# deploy.sh — Build and deploy Compliance Monitoring frontend to the VM
#
# Usage (run from project root on your dev machine):
#   chmod +x deploy/deploy.sh
#   VM_HOST=<your-vm-ip>  ./deploy/deploy.sh
#
# Prerequisites on VM:
#   - Nginx installed
#   - /var/www/compliance/dist created (sudo mkdir -p /var/www/compliance/dist)
#   - sudo chown -R $USER /var/www/compliance
##############################################################################

set -e

VM_HOST="${VM_HOST:?Set VM_HOST=<ip> before running this script}"
VM_USER="${VM_USER:-ubuntu}"
DEPLOY_DIR="/var/www/compliance/dist"

echo "▶ Building frontend..."
npm run build

echo "▶ Uploading dist/ to $VM_USER@$VM_HOST:$DEPLOY_DIR ..."
rsync -avz --delete dist/ "$VM_USER@$VM_HOST:$DEPLOY_DIR"

echo "▶ Reloading Nginx..."
ssh "$VM_USER@$VM_HOST" "sudo nginx -t && sudo systemctl reload nginx"

echo "✓ Deployment complete → http://$VM_HOST"
