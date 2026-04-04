# Oracle Cloud VM creation script with retry
# Keeps trying until capacity is available for VM.Standard.A1.Flex
#
# Usage: powershell -ExecutionPolicy Bypass -File infra\create-vm.ps1

$COMPARTMENT_ID = "ocid1.tenancy.oc1..aaaaaaaacwmlwzujenddnez6bgcgfonw4nqy27s2vrpvxda3frxaxejqbc4q"
$SUBNET_ID      = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaalmpnogpaqnptlgrb675g4uf5646phbawn5xaldiarhohzk4gkjfa"
$DISPLAY_NAME   = "n8n-server"
$SHAPE          = "VM.Standard.A1.Flex"
$OCPUS          = 4
$MEMORY_GB      = 24
$RETRY_INTERVAL = 300  # seconds (5 minutes)
$SSH_PUBLIC_KEY  = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDFJBFQaKJdsyRIC459de28WBDk5uue342QKw9RHyZIQWhuJd8rmapgnoa0kgttDwq+tFqIkHPlxzZ5aAxfL1cZ8buLvbcEpmuCE+lc+vhH23fRITo8+bxqCaW2E33wo8C9uSSEESAfmIRvy35P4eVt+RRTQh0CpXcUXnfoyvCxvVzoCD7CSg1dCHyyjMg6Sjt5RWXxsmWdcE8a1h0jmMr3soCwfBZGon37zcUnmrJNFOF2VVnWoeuwPNwNqR3w0eqjzlx3HUebd2E5zaOJ+Y7IhHBy0hEA53d7PDvnKwqcEY1ujTgXXwVgaE5+CHNsjyREWI3gx3zCkZlef3VSleJD"

# Temp file for SSH key
$SSH_KEY_FILE = "$env:TEMP\oci_ssh_key.pub"
$SSH_PUBLIC_KEY | Out-File -FilePath $SSH_KEY_FILE -Encoding ascii -NoNewline

Write-Host "==> Fetching latest Ubuntu 22.04 ARM image..."
$IMAGE_ID = oci compute image list `
    --compartment-id $COMPARTMENT_ID `
    --operating-system "Canonical Ubuntu" `
    --operating-system-version "22.04" `
    --shape $SHAPE `
    --sort-by TIMECREATED `
    --sort-order DESC `
    --query 'data[0].id' `
    --raw-output

Write-Host "==> Fetching availability domain..."
$AD = oci iam availability-domain list `
    --compartment-id $COMPARTMENT_ID `
    --query 'data[0].name' `
    --raw-output

Write-Host "    Image:  $IMAGE_ID"
Write-Host "    AD:     $AD"
Write-Host ""
Write-Host "==> Starting VM creation attempts (retrying every $($RETRY_INTERVAL/60) minutes)..."
Write-Host "    Press Ctrl+C to stop."
Write-Host ""

# Write shape config to temp file to avoid JSON quoting issues
$SHAPE_CONFIG_FILE = "$env:TEMP\oci_shape_config.json"
"{`"ocpus`": $OCPUS, `"memoryInGBs`": $MEMORY_GB}" | Out-File -FilePath $SHAPE_CONFIG_FILE -Encoding ascii -NoNewline
$ATTEMPT = 1

while ($true) {
    $TIME = Get-Date -Format "HH:mm:ss"
    Write-Host "[$TIME] Attempt #$ATTEMPT..."

    $OUTPUT = oci compute instance launch `
        --compartment-id $COMPARTMENT_ID `
        --availability-domain $AD `
        --shape $SHAPE `
        --shape-config "file://$SHAPE_CONFIG_FILE" `
        --subnet-id $SUBNET_ID `
        --image-id $IMAGE_ID `
        --display-name $DISPLAY_NAME `
        --ssh-authorized-keys-file $SSH_KEY_FILE `
        --assign-public-ip true 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "VM criada com sucesso!"
        $DATA = $OUTPUT | ConvertFrom-Json
        $INSTANCE_ID = $DATA.data.id
        Write-Host "    Instance ID: $INSTANCE_ID"
        Write-Host ""
        Write-Host "==> Aguardando IP publico..."
        Start-Sleep -Seconds 30
        $INSTANCE = oci compute instance get --instance-id $INSTANCE_ID | ConvertFrom-Json
        $VNIC = oci compute instance list-vnics --instance-id $INSTANCE_ID | ConvertFrom-Json
        $PUBLIC_IP = $VNIC.data[0].'public-ip'
        Write-Host ""
        Write-Host "=========================================="
        Write-Host "  IP Publico: $PUBLIC_IP"
        Write-Host "  Conectar:   ssh -i C:\ssh-key-2026-04-03.key ubuntu@$PUBLIC_IP"
        Write-Host "=========================================="
        break
    } elseif ($OUTPUT -match "Out of capacity" -or $OUTPUT -match "Out of host capacity") {
        Write-Host "    Sem capacidade. Aguardando $($RETRY_INTERVAL/60) minutos..."
        Start-Sleep -Seconds $RETRY_INTERVAL
    } else {
        Write-Host "    Erro inesperado:"
        Write-Host $OUTPUT
        break
    }

    $ATTEMPT++
}

Remove-Item $SSH_KEY_FILE -ErrorAction SilentlyContinue
Remove-Item $SHAPE_CONFIG_FILE -ErrorAction SilentlyContinue
