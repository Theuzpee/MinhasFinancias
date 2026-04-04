#!/usr/bin/env bash
# Oracle Cloud VM creation script with retry
# Keeps trying until capacity is available for VM.Standard.A1.Flex
#
# Requirements: OCI CLI installed and configured (oci setup config)
# Usage: bash infra/create-vm.sh

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaacwmlwzujenddnez6bgcgfonw4nqy27s2vrpvxda3frxaxejqbc4q"
SUBNET_ID="ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaalmpnogpaqnptlgrb675g4uf5646phbawn5xaldiarhohzk4gkjfa"
REGION="sa-saopaulo-1"
AVAILABILITY_DOMAIN="$(oci iam availability-domain list --compartment-id "$COMPARTMENT_ID" --query 'data[0].name' --raw-output)"
SHAPE="VM.Standard.A1.Flex"
OCPUS=4
MEMORY_GB=24
DISPLAY_NAME="n8n-server"
SSH_PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDFJBFQaKJdsyRIC459de28WBDk5uue342QKw9RHyZIQWhuJd8rmapgnoa0kgttDwq+tFqIkHPlxzZ5aAxfL1cZ8buLvbcEpmuCE+lc+vhH23fRITo8+bxqCaW2E33wo8C9uSSEESAfmIRvy35P4eVt+RRTQh0CpXcUXnfoyvCxvVzoCD7CSg1dCHyyjMg6Sjt5RWXxsmWdcE8a1h0jmMr3soCwfBZGon37zcUnmrJNFOF2VVnWoeuwPNwNqR3w0eqjzlx3HUebd2E5zaOJ+Y7IhHBy0hEA53d7PDvnKwqcEY1ujTgXXwVgaE5+CHNsjyREWI3gx3zCkZlef3VSleJD"

# Ubuntu 22.04 ARM image for sa-saopaulo-1
IMAGE_ID="ocid1.image.oc1.sa-saopaulo-1.aaaaaaaav7nrqfzqxbhxnxhqnxhqnxhqnxhqnxhqnxhqnxhqnxhqnxhqnxa"

RETRY_INTERVAL=300  # 5 minutes
# ──────────────────────────────────────────────────────────────────────────────

echo "==> Fetching latest Ubuntu 22.04 ARM image for $REGION..."
IMAGE_ID="$(oci compute image list \
  --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "$SHAPE" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query 'data[0].id' \
  --raw-output)"

echo "    Image ID: $IMAGE_ID"
echo "    Availability Domain: $AVAILABILITY_DOMAIN"
echo ""
echo "==> Starting VM creation attempts (retrying every $((RETRY_INTERVAL/60)) minutes)..."
echo "    Press Ctrl+C to stop."
echo ""

ATTEMPT=1
while true; do
  echo "[$(date '+%H:%M:%S')] Attempt #$ATTEMPT..."

  RESULT="$(oci compute instance launch \
    --compartment-id "$COMPARTMENT_ID" \
    --availability-domain "$AVAILABILITY_DOMAIN" \
    --shape "$SHAPE" \
    --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_GB}" \
    --subnet-id "$SUBNET_ID" \
    --image-id "$IMAGE_ID" \
    --display-name "$DISPLAY_NAME" \
    --ssh-authorized-keys-file <(echo "$SSH_PUBLIC_KEY") \
    --assign-public-ip true \
    --wait-for-state RUNNING \
    2>&1)" && SUCCESS=true || SUCCESS=false

  if $SUCCESS; then
    echo ""
    echo "✅ VM created successfully!"
    PUBLIC_IP="$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['public-ip'] if 'public-ip' in d['data'] else 'check console')" 2>/dev/null || echo "check OCI console")"
    echo "   Public IP: $PUBLIC_IP"
    echo "   Connect:   ssh -i C:\\ssh-key-2026-04-03.key ubuntu@$PUBLIC_IP"
    break
  else
    if echo "$RESULT" | grep -q "Out of capacity"; then
      echo "    Out of capacity. Waiting $((RETRY_INTERVAL/60)) minutes..."
      sleep $RETRY_INTERVAL
    else
      echo "    Unexpected error:"
      echo "$RESULT"
      exit 1
    fi
  fi

  ATTEMPT=$((ATTEMPT + 1))
done
